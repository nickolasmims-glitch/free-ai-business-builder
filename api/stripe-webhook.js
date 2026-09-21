import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

async function readRawBody(req){
  if(typeof req.body === "string") return req.body;
  if(Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function verifyStripeSignature(rawBody,signature,secret){
  if(!signature||!secret) return false;
  const parts=signature.split(",");
  const timestampPart=parts.find(x=>x.startsWith("t="));
  const signatures=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
  const timestamp=Number(timestampPart?.slice(2));
  if(!Number.isFinite(timestamp)||Math.abs(Math.floor(Date.now()/1000)-timestamp)>300) return false;
  const signedPayload=timestamp+"."+rawBody;
  const expected=crypto.createHmac("sha256",secret).update(signedPayload).digest("hex");
  return signatures.some(sig=>{
    try{
      const a=Buffer.from(sig,"hex"),b=Buffer.from(expected,"hex");
      return a.length===b.length&&crypto.timingSafeEqual(a,b);
    }catch{return false}
  });
}

async function updateSessionMetadata(sessionId,metadata){
  const body=new URLSearchParams();
  for(const [key,value] of Object.entries(metadata)) body.set("metadata["+key+"]",String(value));
  const r=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sessionId),{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+process.env.STRIPE_SECRET_KEY,
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data.error?.message||"Stripe session update failed");
  return data;
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({error:"Stripe webhook is not configured"});
  try{
    const rawBody=await readRawBody(req);
    const signature=req.headers["stripe-signature"];
    if(!verifyStripeSignature(rawBody,signature,process.env.STRIPE_WEBHOOK_SECRET)) return res.status(400).json({error:"Invalid Stripe signature"});
    const event=JSON.parse(rawBody);
    const session=event.data?.object;
    if(!session?.id) return res.status(200).json({received:true,ignored:true});

    if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
      if(session.payment_status==="paid"){
        await updateSessionMetadata(session.id,{
          fulfillment_status:"paid",
          fulfilled_at:new Date().toISOString(),
          stripe_event_id:event.id
        });
      }
    }else if(event.type==="checkout.session.async_payment_failed"){
      await updateSessionMetadata(session.id,{
        fulfillment_status:"payment_failed",
        failed_at:new Date().toISOString(),
        stripe_event_id:event.id
      });
    }

    return res.status(200).json({received:true,eventId:event.id,type:event.type});
  }catch(e){
    console.error("Stripe webhook error",e);
    return res.status(500).json({error:e.message||"Webhook processing failed"});
  }
}
