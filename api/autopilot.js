function json(res,status,payload){res.status(status).json(payload)}
export default async function handler(req,res){
 if(req.method!=="POST"&&req.method!=="GET")return json(res,405,{error:"Method not allowed"});
 const now=new Date().toISOString();
 const result={ok:true,mode:"autopilot",timestamp:now,steps:["research","qualify","offer","checkout","payment-webhook","fulfillment"],status:"ready"};
 if(req.method==="GET")return json(res,200,{...result,configured:{stripe:Boolean(process.env.STRIPE_SECRET_KEY),stripeWebhook:Boolean(process.env.STRIPE_WEBHOOK_SECRET),email:Boolean(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL)}});
 const body=req.body||{};if(!body.offer||!body.price)return json(res,400,{error:"offer and price are required"});
 if(!process.env.STRIPE_SECRET_KEY)return json(res,503,{error:"Payment automation is not active until Stripe is connected.",required:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]});
 return json(res,200,{...result,next:"Create checkout session with /api/create-checkout",offer:body.offer,price:body.price});
}
