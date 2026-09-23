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
    if (req.method === "POST" && url.pathname === "/business/metrics") {
      if (!authorized(req)) return json(res, 401, { error: CONTROL_TOKEN ? "UNAUTHORIZED" : "CONTROL_TOKEN_NOT_CONFIGURED" });
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = body ? JSON.parse(body) : {};
      const allowed = ["traffic","payments","customers","offers"];
      const updated = await updateState(s => {
        s.business ??= {};
        for (const key of allowed) if (input[key] && typeof input[key] === "object") s.business[key] = { ...(s.business[key] || {}), ...input[key] };
        s.business.updatedAt = new Date().toISOString();
        return s;
      });
      return json(res, 202, { ok:true, updatedAt:updated.business.updatedAt });
    }
    if (req.method === "GET" && url.pathname === "/analytics") {
      return json(res, 200, {
        ok: true,
        generatedAt: new Date().toISOString(),
        traffic: state.business?.traffic || {},
        source: "OwnerCloud persistent state"
      });
    }
    if (req.method === "GET" && url.pathname === "/business") {
      const completedRuns = state.runs.filter(r => r.status === "COMPLETE").length;
      const failedRuns = state.runs.filter(r => r.status === "FAILED").length;
      const totalRuns = completedRuns + failedRuns;
      const successRate = totalRuns ? Number(((completedRuns / totalRuns) * 100).toFixed(1)) : 0;
      return json(res, 200, {
        generatedAt: new Date().toISOString(),
        targets: {
          friday: { targetUsd: Number(process.env.FRIDAY_TARGET_USD || 1000), deadline: process.env.FRIDAY_DEADLINE || "2026-09-25" },
          fourMonth: { targetUsd: Number(process.env.FOUR_MONTH_TARGET_USD || 4000000), deadline: process.env.FOUR_MONTH_DEADLINE || "2027-01-25" }
        },
        production: {
          totalRuns,
          completedRuns,
          failedRuns,
          successRate,
          ai2: state.workers.ai2,
          ai3: state.workers.ai3
        },
        traffic: {
          liveVisitors: 0,
          impressions: 0,
          pageViews: 0,
          source: "awaiting_analytics_ingest"
        },
        payments: {
          grossRevenueUsd: 0,
          successfulPayments: 0,
          refundsUsd: 0,
          feesUsd: 0,
          netRevenueUsd: 0,
          source: "awaiting_payment_ingest"
        },
        forecasts: {
          revenueForecastUsd: null,
          profitForecastUsd: null,
          basis: "insufficient_verified_business_data"
        }
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
