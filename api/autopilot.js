import { start } from "workflow/api";
import { guardianRevenueScoutMonitor } from "../workflows/guardian.js";

function json(res,status,payload){res.status(status).json(payload)}
function authorized(req){const secret=process.env.CRON_SECRET;return Boolean(secret&&req.headers.authorization==="Bearer "+secret)}

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  const configured={
    cronSecret:Boolean(process.env.CRON_SECRET),
    aiGateway:Boolean(process.env.AI_GATEWAY_API_KEY),
    email:Boolean(process.env.RESEND_API_KEY&&process.env.FROM_EMAIL&&process.env.AUTOPILOT_REPORT_EMAIL)
  };

  if(!authorized(req)) return json(res,401,{error:"Unauthorized cron request",configured});

  const topic=String(req.query?.topic||process.env.AUTOPILOT_TOPIC||"AI workflow automation for local service businesses").slice(0,180);
  try{
    const run=await start(guardianRevenueScoutMonitor,[{topic}]);
    console.log(JSON.stringify({
      event:"guardian_revenue_scout_started",
      runId:run.runId,
      topic,
      goals:{fridayTarget:1000,fridayDeadline:"2026-09-25",fourMonthTarget:4000000,fourMonthDeadline:"2027-01-25"},
      configured
    }));
    return json(res,200,{
      ok:true,
      status:"GUARDIAN_REVENUE_SCOUT_STARTED",
      runId:run.runId,
      topic,
      configured,
      monitor:"Guardian-supervised 4 durable cycles, approximately every 6 hours; browser can be closed.",
      safeguards:["Guardian supervisor","owner-locked goals","no autonomous spending","no fabricated results","external actions approval-gated"]
    });
  }catch(e){
    console.error("ai2_ai3_monitor_start_error",e);
    return json(res,500,{ok:false,status:"MONITOR_START_FAILED",error:e.message||"Failed to start monitor",configured});
  }
}
