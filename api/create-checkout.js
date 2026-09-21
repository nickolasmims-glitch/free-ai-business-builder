export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.STRIPE_SECRET_KEY) return res.status(503).json({error:"Stripe is not connected. Add STRIPE_SECRET_KEY in Vercel environment variables."});
  try{
    const {name,email,offer,price,successUrl,cancelUrl}=req.body||{};
    const amount=Math.round(Number(price)*100);
    if(!name||!email||!offer||!Number.isFinite(amount)||amount<100) return res.status(400).json({error:"name, email, offer and a valid price of at least $1 are required"});
    const params=new URLSearchParams();
    params.set("mode","payment");
    params.set("success_url",successUrl||"https://free-ai-business-builder.vercel.app/?payment=success&session_id={CHECKOUT_SESSION_ID}");
    params.set("cancel_url",cancelUrl||"https://free-ai-business-builder.vercel.app/?payment=cancelled");
    params.set("customer_email",email);
    params.set("line_items[0][quantity]","1");
    params.set("line_items[0][price_data][currency]","usd");
    params.set("line_items[0][price_data][unit_amount]",String(amount));
    params.set("line_items[0][price_data][product_data][name]",offer);
    params.set("metadata[customer_name]",name);
    params.set("metadata[offer]",offer);
    const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"Authorization":`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:data.error?.message||"Stripe checkout creation failed"});
    return res.status(200).json({ok:true,sessionId:data.id,url:data.url});
  }catch(e){return res.status(500).json({error:e.message||"Checkout error"});}
}
