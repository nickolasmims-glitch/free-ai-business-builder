import http from "node:http";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "./store.mjs";

const PORT = Number(process.env.OWNER_CLOUD_PORT || 8787);
const CONTROL_TOKEN = process.env.OWNER_CLOUD_CONTROL_TOKEN;

function json(res, status, body) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(body));
}
function authorized(req) {
  return Boolean(CONTROL_TOKEN) && req.headers.authorization === `Bearer ${CONTROL_TOKEN}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://ownercloud.local");
    const state = await readState();

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: state.workers.ai2.status === "AI_COMPLETE" && state.workers.ai3.status === "AI_COMPLETE",
        service: "OwnerCloud",
        ownerAuthority: "OWNER",
        browserRequiredForWorkers: false,
        policies: { autonomousSpending:false, financialActionsRequireOwnerApproval:true, fabricatedResultsForbidden:true },
        workers: state.workers,
        activeRuns: state.runs.filter(r => r.status === "RUNNING").length,
        queuedRuns: state.runs.filter(r => r.status === "QUEUED").length,
        lastRun: state.runs.at(-1) || null
      });
    }
    if (req.method === "GET" && url.pathname === "/control") {
      return json(res, 200, {
        ownerAuthority:"OWNER", hostingAuthority:"OWNER", businessDecisionAuthority:"OWNER",
        workers:state.workers,
        policies:{autonomousSpending:false,financialActionsRequireOwnerApproval:true,fabricatedResultsForbidden:true}
      });
    }
    if (req.method === "GET" && url.pathname === "/runs") return json(res, 200, { runs:state.runs });
    if (req.method === "GET" && url.pathname.startsWith("/runs/")) {
      const run = state.runs.find(x => x.runId === url.pathname.split("/")[2]);
      return run ? json(res,200,run) : json(res,404,{error:"RUN_NOT_FOUND"});
    }
    if (req.method === "POST" && url.pathname === "/runs") {
      if (!authorized(req)) return json(res, 401, { error: CONTROL_TOKEN ? "UNAUTHORIZED" : "CONTROL_TOKEN_NOT_CONFIGURED" });
      const runId = randomUUID();
      await updateState(s => {
        if (s.runs.some(x => x.status === "QUEUED" || x.status === "RUNNING")) return s;
        s.runs.push({runId,createdAt:new Date().toISOString(),status:"QUEUED",requestedBy:"OWNER",source:"OwnerCloud:manual",topic:process.env.AUTOPILOT_TOPIC||""});
        s.runs=s.runs.slice(-100);
        return s;
      });
      return json(res,202,{runId,status:"QUEUED"});
    }
    return json(res,404,{error:"NOT_FOUND"});
  } catch (error) {
    return json(res,500,{error:String(error)});
  }
});
server.listen(PORT,()=>console.log(JSON.stringify({service:"OwnerCloudControl",port:PORT,status:"LISTENING",mutationAuth:Boolean(CONTROL_TOKEN)})));
