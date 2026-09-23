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

const state = await readState();
const run = state.runs.find(x => x.runId === runId);
if (!run) throw new Error("RUN_NOT_FOUND:" + runId);

const topic = run.topic || process.env.AUTOPILOT_TOPIC || "AI workflow automation for local service businesses";
const result = await runAgentCycle({
  topic,
  cycle: Number(run.attempts || 1),
  goals: policy,
  directCommand: run.directCommand || null,
  verifiedRevenue: state.business?.payments?.grossRevenueUsd || 0
});

await updateState(current => {
  const target = current.runs.find(x => x.runId === runId);
  if (target) {
    target.workerResult = result;
    target.completedWorkers = ["AI2", "AI3"];
  }
  current.workers.ai2.lastEvidence = result.ai2 || null;
  current.workers.ai3.lastEvidence = result.ai3 || null;
  return current;
});

if (result.ai2?.status !== "AI_COMPLETE" || result.ai3?.status !== "AI_COMPLETE") {
  throw new Error("REQUIRED_AI_WORKER_FAILED:" + JSON.stringify({
    ai2: result.ai2?.status,
    ai3: result.ai3?.status
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
