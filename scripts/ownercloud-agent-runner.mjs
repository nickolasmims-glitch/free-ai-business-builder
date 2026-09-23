import { readState, updateState } from "../platform/store.mjs";
import { runAgentCycle } from "../workflows/steps/ai-agents.js";

const runId = process.env.OWNER_CLOUD_RUN_ID;
if (!runId) throw new Error("OWNER_CLOUD_RUN_ID_REQUIRED");

const policy = {
  fridayTargetUsd: Number(process.env.FRIDAY_TARGET_USD || 1000),
  fridayDeadline: process.env.FRIDAY_DEADLINE || "2026-09-25",
  fourMonthTargetUsd: Number(process.env.FOUR_MONTH_TARGET_USD || 4000000),
  fourMonthDeadline: process.env.FOUR_MONTH_DEADLINE || "2027-01-25"
};

const initialState = await readState();
let run = initialState.runs.find(x => x.runId === runId);

if (!run) {
  const now = new Date().toISOString();
  const topic = process.env.AUTOPILOT_TOPIC || "AI workflow automation for local service businesses";
  await updateState(current => {
    current.runs.push({
      runId,
      topic,
      status: "RUNNING",
      attempts: 1,
      createdAt: now,
      startedAt: now,
      completedAt: null,
      directCommand: null,
      completedWorkers: []
    });
    current.workers.ai2.status = "RUNNING";
    current.workers.ai3.status = "RUNNING";
    current.workers.ai2.lastRunId = runId;
    current.workers.ai3.lastRunId = runId;
    current.workers.ai2.heartbeatAt = now;
    current.workers.ai3.heartbeatAt = now;
    return current;
  });
  run = {
    runId,
    topic,
    status: "RUNNING",
    attempts: 1,
    directCommand: null
  };
}

const topic = run.topic || process.env.AUTOPILOT_TOPIC || "AI workflow automation for local service businesses";
const state = await readState();

try {
  const result = await runAgentCycle({
    topic,
    cycle: Number(run.attempts || 1),
    goals: policy,
    directCommand: run.directCommand || null,
    verifiedRevenue: state.business?.payments?.grossRevenueUsd || 0
  });

  await updateState(current => {
    const target = current.runs.find(x => x.runId === runId);
    const now = new Date().toISOString();
    if (target) {
      target.workerResult = result;
      target.completedWorkers = ["AI2", "AI3"];
      target.status = result.ai2?.status === "AI_COMPLETE" && result.ai3?.status === "AI_COMPLETE" ? "COMPLETE" : "FAILED";
      target.completedAt = now;
    }
    current.workers.ai2.lastEvidence = result.ai2 || null;
    current.workers.ai3.lastEvidence = result.ai3 || null;
    current.workers.ai2.status = result.ai2?.status || "FAILED";
    current.workers.ai3.status = result.ai3?.status || "FAILED";
    current.workers.ai2.heartbeatAt = now;
    current.workers.ai3.heartbeatAt = now;
    return current;
  });

  if (result.ai2?.status !== "AI_COMPLETE" || result.ai3?.status !== "AI_COMPLETE") {
    console.error("[OwnerCloud] AI2/AI3 execution failure details:", JSON.stringify({
      ai2: { status: result.ai2?.status, errorClass: result.ai2?.errorClass, httpStatus: result.ai2?.httpStatus, model: result.ai2?.model, message: result.ai2?.message },
      ai3: { status: result.ai3?.status, errorClass: result.ai3?.errorClass, httpStatus: result.ai3?.httpStatus, model: result.ai3?.model, message: result.ai3?.message }
    }));
    throw new Error("REQUIRED_AI_WORKER_FAILED:" + JSON.stringify({
      ai2: result.ai2?.status,
      ai3: result.ai3?.status,
      ai2ErrorClass: result.ai2?.errorClass,
      ai3ErrorClass: result.ai3?.errorClass
    }));
  }

  console.log(JSON.stringify({
    service: "OwnerCloudAgentRunner",
    runId,
    status: "AI_COMPLETE",
    ai2: result.ai2.model,
    ai3: result.ai3.model,
    researchCount: result.researchCount
  }));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await updateState(current => {
    const target = current.runs.find(x => x.runId === runId);
    const now = new Date().toISOString();
    if (target) {
      target.status = "FAILED";
      target.error = message;
      target.completedAt = now;
    }
    current.workers.ai2.status = "FAILED";
    current.workers.ai3.status = "FAILED";
    current.workers.ai2.lastError = message;
    current.workers.ai3.lastError = message;
    return current;
  });
  throw error;
}
