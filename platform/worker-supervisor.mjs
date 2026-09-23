import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "./store.mjs";
import { WORKER_STATES } from "./worker-contract.mjs";

const intervalMs = Math.max(60_000, Number(process.env.OWNER_CLOUD_WORKER_INTERVAL_MS || 900_000));
const maxRestarts = Math.max(0, Number(process.env.OWNER_CLOUD_MAX_RESTARTS || 2));
const heartbeatMs = Math.max(10_000, Number(process.env.OWNER_CLOUD_HEARTBEAT_MS || 30_000));

async function setWorkers(status, runId, error = null) {
  await updateState(state => {
    for (const name of ["ai2", "ai3"]) {
      state.workers[name] = {
        ...state.workers[name],
        status,
        lastRunId: runId,
        lastError: error ? String(error).slice(0, 2000) : null,
        heartbeatAt: new Date().toISOString()
      };
    }
    return state;
  });
}

async function heartbeat(runId, status) {
  await updateState(state => {
    const run = state.runs.find(x => x.runId === runId);
    if (run) run.heartbeatAt = new Date().toISOString();
    for (const name of ["ai2", "ai3"]) {
      state.workers[name] = { ...state.workers[name], status, heartbeatAt: new Date().toISOString(), lastRunId: runId };
    }
    return state;
  });
}

function execute(runId) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ["scripts/guardian-runner.mjs"], {
      env: { ...process.env, OWNER_CLOUD_RUN_ID: runId },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setInterval(() => {
      heartbeat(runId, WORKER_STATES.RUNNING).catch(() => {});
    }, heartbeatMs);
    child.stdout.on("data", d => { stdout += d.toString(); });
    child.stderr.on("data", d => { stderr += d.toString(); });
    child.on("close", code => {
      clearInterval(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", err => {
      clearInterval(timer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

async function claimRun() {
  let claimed = null;
  await updateState(state => {
    const queued = state.runs.find(x => x.status === "QUEUED");
    if (!queued) return state;
    queued.status = "RUNNING";
    queued.startedAt = new Date().toISOString();
    queued.attempts = 0;
    queued.source = queued.source || "OwnerCloud";
    claimed = queued.runId;
    return state;
  });
  return claimed;
}

async function createScheduledRun() {
  const runId = randomUUID();
  await updateState(state => {
    state.runs.push({
      runId,
      createdAt: new Date().toISOString(),
      status: "RUNNING",
      requestedBy: "OWNER",
      source: "OwnerCloud:schedule"
    });
    state.runs = state.runs.slice(-100);
    return state;
  });
  return runId;
}

async function runOnce() {
  const queuedRunId = await claimRun();
  const runId = queuedRunId || await createScheduledRun();
  await setWorkers(WORKER_STATES.STARTING, runId);

  let attempt = 0;
  let result;
  while (attempt <= maxRestarts) {
    attempt++;
    await updateState(state => {
      const run = state.runs.find(x => x.runId === runId);
      if (run) run.attempts = attempt;
      return state;
    });
    await setWorkers(attempt === 1 ? WORKER_STATES.RUNNING : WORKER_STATES.RESTARTING, runId);
    result = await execute(runId);
    if (result.code === 0) break;
  }

  const complete = result?.code === 0;
  await updateState(state => {
    const run = state.runs.find(x => x.runId === runId);
    if (run) Object.assign(run, {
      status: complete ? "COMPLETE" : "FAILED",
      finishedAt: new Date().toISOString(),
      attempts: attempt,
      exitCode: result?.code ?? 1,
      stdout: result?.stdout?.slice(-6000) || "",
      stderr: result?.stderr?.slice(-6000) || ""
    });
    for (const name of ["ai2", "ai3"]) {
      state.workers[name] = {
        ...state.workers[name],
        status: complete ? WORKER_STATES.AI_COMPLETE : WORKER_STATES.FAILED,
        heartbeatAt: new Date().toISOString(),
        lastRunId: runId,
        lastError: complete ? null : (result?.stderr || result?.stdout || "Guardian failed").slice(-2000)
      };
    }
    return state;
  });
  return { runId, complete, attempts: attempt, source: queuedRunId ? "queued" : "scheduled" };
}

let stopping = false;
async function loop() {
  while (!stopping) {
    try {
      console.log(JSON.stringify({ service: "OwnerCloudWorker", ...(await runOnce()) }));
    } catch (error) {
      console.error(JSON.stringify({ service: "OwnerCloudWorker", error: String(error) }));
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

console.log(JSON.stringify({ service: "OwnerCloudWorker", status: "STARTING", intervalMs, heartbeatMs }));
await loop();


// Guardian communication channel: every worker failure is persisted and can be surfaced to the OwnerCloud control panel.
