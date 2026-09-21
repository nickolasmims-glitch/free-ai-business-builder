function json(res,status,payload){res.status(status).json(payload)}
function authorized(req){const secret=process.env.CRON_SECRET;return Boolean(secret&&req.headers.authorization==="Bearer "+secret)}
async function searchWeb(query){
  const r=await fetch("https://html.duckduckgo.com/html/?q="+encodeURIComponent(query),{headers:{"User-Agent":"Mozilla/5.0 AI-Business-Builder-Research"}});
  if(!r.ok)throw new Error("Research provider returned "+r.status);
  const html=await r.text(),results=[];
  const re=/<a[^>]+class="result__a"[^>]*>([\\s\\S]*?)<\\/a>[\\s\\S]*?<a[^>]+class="result__snippet"[^>]*>([\\s\\S]*?)<\\/a>/gi;
  const clean=s=>s.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\\s+/g," ").trim();
  let m;while((m=re.exec(html))&&results.length<5)results.push({title:clean(m[1]),snippet:clean(m[2])});
  return results;
}
async function notify(subject,html){
  if(!process.env.RESEND_API_KEY||!process.env.FROM_EMAIL||!process.env.AUTOPILOT_REPORT_EMAIL)return false;
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.FROM_EMAIL,to:[process.env.AUTOPILOT_REPORT_EMAIL],subject,html})});
  return r.ok;
}
export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const configured={stripe:Boolean(process.env.STRIPE_SECRET_KEY),stripeWebhook:Boolean(process.env.STRIPE_WEBHOOK_SECRET),email:Boolean(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL),reportEmail:Boolean(process.env.AUTOPILOT_REPORT_EMAIL),cronSecret:Boolean(process.env.CRON_SECRET)};
  const status={ok:true,mode:"autopilot",timestamp:new Date().toISOString(),configured,safeguards:["Stripe Radar","3DS requested for card checkout","verified-paid-only revenue","signed webhook verification","cron authorization","research evidence capture","dispute alerts"]};
  if(req.method==="GET"&&!authorized(req))return json(res,200,{...status,status:"ready",next:"Scheduled research runs only when Vercel Cron presents CRON_SECRET."});
  if(!authorized(req))return json(res,401,{error:"Unauthorized cron request"});
  const topic=String(req.query?.topic||process.env.AUTOPILOT_TOPIC||"AI workflow automation for local service businesses").slice(0,180);
  const queries=[topic+" customer problems 2026",topic+" pricing offers 2026",topic+" competitors trends 2026"];
  try{
    const packs=await Promise.all(queries.map(searchWeb)),evidence=packs.flat().slice(0,12);
    const report={topic,generatedAt:new Date().toISOString(),queries,evidence,verifiedClaims:evidence.length,warning:"Search results are research leads, not proof of demand, sales, revenue, or customer intent."};
    const sent=await notify("AI 3 daily opportunity research","<h2>AI 3 Research Scout</h2><p><strong>Topic:</strong> "+topic+"</p><p>Captured "+evidence.length+" research leads.</p><ul>"+evidence.slice(0,8).map(x=>"<li><strong>"+x.title+"</strong><br>"+x.snippet+"</li>").join("")+"</ul><p>These are leads for validation, not verified revenue or demand.</p>");
    console.log(JSON.stringify({event:"autopilot_research",...report,emailSent:sent}));
    return json(res,200,{...status,status:"research_complete",report,emailSent:sent,next:"Validate evidence, formulate an offer, qualify prospects, and require approval before external outreach."});
  }catch(e){console.error("autopilot_research_error",e);return json(res,502,{...status,status:"research_failed",error:e.message||"Research failed"});}
}
