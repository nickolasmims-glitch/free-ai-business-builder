import { assertBoxedEnvironment } from "../platform/ai-box-guard.mjs";
assertBoxedEnvironment(process.env);
import { runAgentCycle } from "../workflows/steps/ai-agents.js";
import { guardianAuditCycle, guardianHeartbeat, guardianGate, getVerifiedStripeRevenue } from "../workflows/steps/guardian.js";

const GOALS = {
  fridayTarget: Number(process.env.FRIDAY_TARGET_USD || 1000),
  fridayDeadline: process.env.FRIDAY_DEADLINE || "2026-09-25",
  fourMonthTarget: Number(process.env.FOUR_MONTH_TARGET_USD || 4000000),
  fourMonthDeadline: process.env.FOUR_MONTH_DEADLINE || "2027-01-25"
};

const topic = String(process.env.AUTOPILOT_TOPIC || "AI workflow automation for local service businesses").slice(0, 180);
const directCommand = String(process.env.GUARDIAN_COMMAND || "Continue the revenue mission. Research, evaluate, and execute every legitimate zero-cost internal step available. Do not spend, transfer, withdraw, invest, purchase, refund, or make financial commitments.").slice(0, 2000);

const verifiedRevenue = await getVerifiedStripeRevenue();
const heartbeat = await guardianHeartbeat({ cycle: 1, goals: GOALS, directCommand, verifiedRevenue });
const gate = await guardianGate({ cycle: 1, goals: GOALS, directCommand });

if (!gate.allowed) {
  console.log(JSON.stringify({ status: "GUARDIAN_BLOCKED", heartbeat, gate }, null, 2));
  process.exit(0);
}

const result = await runAgentCycle({
  topic,
  cycle: 1,
  goals: GOALS,
  directCommand,
  verifiedRevenue
});

const ai2Ok = result?.ai2?.status === "AI_COMPLETE";
const ai3Ok = result?.ai3?.status === "AI_COMPLETE";
const audit = await guardianAuditCycle({
  cycle: 1,
  topic,
  goals: GOALS,
  result,
  directCommand,
  verifiedRevenue
});

const report = {
  status: ai2Ok && ai3Ok ? "GUARDIAN_CYCLE_COMPLETE" : "GUARDIAN_AI_EXECUTION_FAILED",
  timestamp: new Date().toISOString(),
  heartbeat,
  gate,
  ai2: result?.ai2?.status || "MISSING",
  ai3: result?.ai3?.status || "MISSING",
  audit,
  verifiedRevenue,
  notification: result?.notification || null
};

console.log(JSON.stringify(report, null, 2));
if (!ai2Ok || !ai3Ok) process.exit(1);
