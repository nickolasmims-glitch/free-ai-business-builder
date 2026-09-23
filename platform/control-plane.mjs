import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.OWNER_CLOUD_PORT || 8787);

const state = {
  service: "OwnerCloud",
  version: 1,
  ownerAuthority: "OWNER",
  browserRequiredForWorkers: false,
  autonomousSpending: false,
  financialActionsRequireOwnerApproval: true,
  workers: {
    ai2: { required: true, status: "NOT_STARTED", lastRunId: null },
    ai3: { required: true, status: "NOT_STARTED", lastRunId: null }
  },
  runs: []
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function health() {
  const ai2 = state.workers.ai2.status;
  const ai3 = state.workers.ai3.status;
  const bothComplete = ai2 === "AI_COMPLETE" && ai3 === "AI_COMPLETE";
  return {
    ok: bothComplete,
    service: state.service,
    version: state.version,
    ownerAuthority: state.ownerAuthority,
    browserRequiredForWorkers: state.browserRequiredForWorkers,
    workers: state.workers,
    activeRuns: state.runs.filter(r => r.status === "RUNNING").length,
    lastRun: state.runs.at(-1) || null
  };
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://ownercloud.local");

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, health());
  }

  if (req.method === "GET" && url.pathname === "/control") {
    return json(res, 200, {
      ownerAuthority: state.ownerAuthority,
      policies: {
        browserRequiredForWorkers: state.browserRequiredForWorkers,
        autonomousSpending: state.autonomousSpending,
        financialActionsRequireOwnerApproval: state.financialActionsRequireOwnerApproval
      },
      workers: state.workers
    });
  }

  if (req.method === "POST" && url.pathname === "/runs") {
    const body = await readBody(req);
    const runId = randomUUID();
    const run = {
      runId,
      createdAt: new Date().toISOString(),
      status: "RUNNING",
      requestedBy: "OWNER",
      topic: String(body.topic || process.env.AUTOPILOT_TOPIC || "").slice(0, 180)
    };
    state.runs.push(run);
    state.workers.ai2.status = "RUNNING";
    state.workers.ai3.status = "RUNNING";
    state.workers.ai2.lastRunId = runId;
    state.workers.ai3.lastRunId = runId;
    return json(res, 202, run);
  }

  if (req.method === "GET" && url.pathname.startsWith("/runs/")) {
    const run = state.runs.find(x => x.runId === url.pathname.split("/")[2]);
    return run ? json(res, 200, run) : json(res, 404, { error: "RUN_NOT_FOUND" });
  }

  return json(res, 404, { error: "NOT_FOUND" });
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ service: "OwnerCloud", port: PORT, status: "LISTENING" }));
});
