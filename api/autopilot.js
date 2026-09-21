function json(res,status,payload){res.status(status).json(payload)}
function authorized(req){const secret=process.env.CRON_SECRET;return Boolean(secret&&req.headers.authorization==="Bearer "+secret)}
async function searchWeb(query){
  const r=await fetch("https://html.duckduckgo.com/html/?q="+encodeURIComponent(query),{headers:{"User-Agent":"Mozilla/5.0 AI-Business-Builder-Research"}});
  if(!r.ok)throw new Error("Research provider returned "+r.status);
  const html=await r.text(),results=[];
  const re=/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const clean=s=>s.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g," ").trim();
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
  const configured={email:Boolean(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL),reportEmail:Boolean(process.env.AUTOPILOT_REPORT_EMAIL),cronSecret:Boolean(process.env.CRON_SECRET)};
  const status={ok:true,mode:"autopilot",timestamp:new Date().toISOString(),configured,safeguards:["verified-paid-only revenue","cron authorization","research evidence capture","approval-gated outreach"]};
  if(req.method==="GET"&&!authorized(req))return json(res,200,{...status,status:"ready",next:"Scheduled research runs only when Vercel Cron presents CRON_SECRET."});
  if(!authorized(req))return json(res,401,{error:"Unauthorized cron request"});
  const topic=String(req.query?.topic||process.env.AUTOPILOT_TOPIC||"AI workflow automation for local service businesses").slice(0,180);
  const queries=[
    topic+" urgent customer problems buying signals 2026",
    topic+" pricing packages competitors 2026",
    topic+" small business AI automation ROI case studies 2026",
    topic+" local service businesses missed leads follow-up appointment revenue 2026",
    topic+" free communities partnerships referral channels buyers 2026",
    topic+" agencies consultants businesses outsourcing AI automation 2026"
  ];
  try{
    const packs=await Promise.all(queries.map(searchWeb)),evidence=packs.flat().slice(0,24);
    const offerMath=[
      {price:500,salesFor1000:2,salesFor4M:8000},
      {price:2000,salesFor1000:1,salesFor4M:2000},
      {price:5000,salesFor1000:1,salesFor4M:800},
      {price:10000,salesFor1000:1,salesFor4M:400},
      {price:25000,salesFor1000:1,salesFor4M:160},
      {price:50000,salesFor1000:1,salesFor4M:80}
    ];
    const report={topic,generatedAt:new Date().toISOString(),queries,evidence,offerMath,executionLanes:[
      "productized AI service with measurable outcome",
      "qualified prospect research + personalized outreach drafts with human approval",
      "repeatable digital workflow/product",
      "partnership/referral channel"
    ],verifiedClaims:0,warning:"Search results are research leads, not proof of demand, sales, revenue, customer intent, or pricing acceptance. Revenue targets are goals, not forecasts."};
    const sent=await notify("AI 3 aggressive revenue scout","<h2>AI 3 Aggressive Revenue Scout</h2><p><strong>Topic:</strong> "+topic+"</p><p>Captured "+evidence.length+" research leads across pain, pricing, buying signals, channels and partnerships.</p><h3>Target math</h3><ul>"+offerMath.map(x=>"<li>$"+x.price.toLocaleString()+": "+x.salesFor1000+" sale(s) for the Friday $1K milestone; "+x.salesFor4M.toLocaleString()+" sales for $4M.</li>").join("")+"</ul><h3>Research</h3><ul>"+evidence.slice(0,12).map(x=>"<li><strong>"+x.title+"</strong><br>"+x.snippet+"</li>").join("")+"</ul><p>No external outreach or spending was performed.</p>");
    console.log(JSON.stringify({event:"autopilot_aggressive_research",...report,emailSent:sent}));
    return json(res,200,{...status,status:"research_complete",report,emailSent:sent,next:"Turn the strongest evidence into an offer test, qualify prospects, draft outreach, obtain approval, and verify conversations/payments."});
  }catch(e){console.error("autopilot_research_error",e);return json(res,502,{...status,status:"research_failed",error:e.message||"Research failed"});}
}
