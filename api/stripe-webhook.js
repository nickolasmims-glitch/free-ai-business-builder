import crypto from "node:crypto";
function verify(raw,signature,secret){const parts=Object.fromEntries(signature.split(",").map(x=>x.split("=")));if(!parts.t||!parts.v1)throw new Error("Invalid Stripe signature");const age=Math.abs(Date.now()/1000-Number(parts.t));if(age>300)throw new Error("Expired Stripe signature");const expected=crypto.createHmac("sha256",secret).update(parts.t+"."+raw).digest("hex");if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts.v1)))throw new Error("Invalid Stripe signature");}
export const config={api:{bodyParser:false}};
async function readBody(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks);}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).end();
 if(!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:"Stripe webhook secret is not configured"});
 try{
  const raw=(await readBody(req));verify(raw,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);const event=JSON.parse(raw.toString("utf8"));
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const s=event.data.object;const amount=(Number(s.amount_total)||0)/100;const customer=s.customer_details?.email||s.customer_email||"";const offer=s.metadata?.offer||"AI Business Builder offer";
   if(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL&&customer){await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.FROM_EMAIL,to:[customer],subject:"Payment received — next steps",html:`<p>Payment received for <strong>${offer}</strong>.</p><p>Amount: $${amount.toFixed(2)}</p><p>Your order is recorded. Fulfillment workflow can now begin.</p>`})});}
   console.log(JSON.stringify({event:"verified_payment",sessionId:s.id,amount,customer,offer,at:new Date().toISOString()}));
  }
  return res.status(200).json({received:true});
 }catch(e){console.error("stripe_webhook_error",e);return res.status(400).json({error:e.message||"Webhook verification failed"});}
}
