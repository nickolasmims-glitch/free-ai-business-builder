function json(res,status,payload){res.status(status).json(payload)}
function cronAuthorized(req){
 const secret=process.env.CRON_SECRET;
 if(!secret)return false;
 const header=req.headers.authorization||"";
 return header==="Bearer "+secret;
}
export default async function handler(req,res){
 if(req.method!=="POST"&&req.method!=="GET")return json(res,405,{error:"Method not allowed"});
 const now=new Date().toISOString();
 const configured={stripe:Boolean(process.env.STRIPE_SECRET_KEY),stripeWebhook:Boolean(process.env.STRIPE_WEBHOOK_SECRET),email:Boolean(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL),cronSecret:Boolean(process.env.CRON_SECRET)};
 const result={ok:true,mode:"autopilot",timestamp:now,steps:["research","qualify","offer","checkout","payment-webhook","fulfillment","dispute-monitoring"],status:"ready",configured,safeguards:["Stripe Radar","3DS requested for card checkout","verified-paid-only revenue","signed webhook verification","cron authorization","dispute alerts"]};
 if(req.method==="GET")return json(res,200,result);
 if(!cronAuthorized(req))return json(res,401,{error:"Unauthorized cron request"});
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return json(res,503,{error:"Autopilot payment layer is not fully configured.",required:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","CRON_SECRET"]});
 return json(res,200,{...result,next:"Run scheduled research and fulfillment checks after approved integrations are connected."});
}
