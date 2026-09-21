export default async function handler(req,res){
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 if(!process.env.STRIPE_SECRET_KEY)return res.status(503).json({error:"Stripe is not connected"});
 const id=String(req.query?.session_id||"");
 if(!id||!id.startsWith("cs_"))return res.status(400).json({error:"A valid Checkout Session ID is required"});
 try{
  const r=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+process.env.STRIPE_SECRET_KEY}});
  const s=await r.json();
  if(!r.ok)return res.status(502).json({error:s.error?.message||"Stripe lookup failed"});
  const meta=s.metadata||{};
  return res.status(200).json({ok:true,sessionId:s.id,orderId:meta.order_id||"",status:s.status,paymentStatus:s.payment_status,fulfillmentStatus:meta.fulfillment_status||"awaiting_payment",amountTotal:(Number(s.amount_total)||0)/100,currency:s.currency,customerEmail:s.customer_details?.email||s.customer_email||"",offer:meta.offer||"",paid:s.payment_status==="paid"});
 }catch(e){return res.status(500).json({error:e.message||"Payment lookup error"});}
}
