import crypto from "node:crypto";

function verify(raw,signature,secret){
  const parts=Object.fromEntries(String(signature||"").split(",").map(x=>x.split("=")));
  if(!parts.t||!parts.v1)throw new Error("Invalid Stripe signature");
  const age=Math.abs(Date.now()/1000-Number(parts.t));
  if(age>300)throw new Error("Expired Stripe signature");
  const expected=crypto.createHmac("sha256",secret).update(parts.t+"."+raw).digest("hex");
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts.v1)))throw new Error("Invalid Stripe signature");
}

export const config={api:{bodyParser:false}};

async function readBody(req){
  const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks);
}

async function notify(to,subject,html){
  if(!process.env.RESEND_API_KEY||!process.env.FROM_EMAIL||!to)return;
  await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({from:process.env.FROM_EMAIL,to:[to],subject,html})
  });
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  if(!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:"Stripe webhook secret is not configured"});
  try{
    const raw=(await readBody(req)).toString("utf8");
    verify(raw,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);
    const event=JSON.parse(raw);

    if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
      const s=event.data.object;
      const amount=(Number(s.amount_total)||0)/100;
      const customer=s.customer_details?.email||s.customer_email||"";
      const offer=s.metadata?.offer||"AI Business Builder offer";
      const paymentStatus=s.payment_status||"paid";

      // Only a Stripe-confirmed paid session is treated as revenue.
      if(paymentStatus==="paid"){
        const orderId=s.metadata?.order_id||"";
        const updateParams=new URLSearchParams();
        updateParams.set("metadata[fulfillment_status]","paid_pending_fulfillment");
        updateParams.set("metadata[verified_at]",new Date().toISOString());
        if(orderId) updateParams.set("metadata[order_id]",orderId);
        await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(s.id),{
          method:"POST",
          headers:{"Authorization":"Bearer "+process.env.STRIPE_SECRET_KEY,"Content-Type":"application/x-www-form-urlencoded"},
          body:updateParams
        });
        await notify(customer,"Payment received — next steps",
          `<p>Payment received for <strong>${offer}</strong>.</p><p>Amount: ${amount.toFixed(2)}</p><p>Your order is recorded and the fulfillment workflow can begin.</p>`);
      }

      console.log(JSON.stringify({
        event:"verified_payment",
        sessionId:s.id,
        paymentStatus,
        amount,
        customer,
        offer,
        at:new Date().toISOString()
      }));
    }

    if(event.type==="charge.dispute.created"||event.type==="charge.dispute.updated"||event.type==="charge.dispute.closed"){
      const d=event.data.object;
      const dispute={
        event:event.type,
        disputeId:d.id,
        chargeId:d.charge,
        amount:(Number(d.amount)||0)/100,
        currency:d.currency,
        status:d.status,
        reason:d.reason,
        at:new Date().toISOString()
      };
      console.warn(JSON.stringify({event:"payment_dispute",...dispute}));
      if(process.env.DISPUTE_ALERT_EMAIL){
        await notify(process.env.DISPUTE_ALERT_EMAIL,"Stripe dispute alert",
          `<p>Stripe dispute event: <strong>${event.type}</strong></p><p>Dispute: ${d.id}</p><p>Amount: $${(Number(d.amount)||0)/100}</p><p>Reason: ${d.reason||"unknown"}</p><p>Status: ${d.status||"unknown"}</p>`);
      }
    }

    return res.status(200).json({received:true});
  }catch(e){
    console.error("stripe_webhook_error",e);
    return res.status(400).json({error:e.message||"Webhook verification failed"});
  }
}
