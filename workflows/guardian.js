import { runAgentCycle } from "./steps/ai-agents.js";
import { guardianAuditCycle, guardianHeartbeat, guardianGate, getVerifiedStripeRevenue } from "./steps/guardian.js";

const GOALS = {
  fridayTarget: 1000,
  fridayDeadline: "2026-09-25",
  fourMonthTarget: 4000000,
  fourMonthDeadline: "2027-01-25"
};

export async function guardianRevenueScoutMonitor(input = {}) {
  "use workflow";
  const topic = String(input.topic || "AI workflow automation for local service businesses").slice(0, 180);
  const directCommand = String(input.directCommand || "").slice(0, 2000);
  const cycles = [];
  const opportunityLedger = [];
  const experimentLedger = [];
  const startedAt = new Date().toISOString();

  // One focused cycle per invocation. The external supervisor triggers this
  // workflow repeatedly, avoiding overlapping 24-hour durable runs while
  // keeping AI2/AI3 continuously active.
  const cycle = Number(input.cycle || 1);
    const verifiedRevenue = await getVerifiedStripeRevenue();
    const heartbeat = await guardianHeartbeat({ cycle, goals: GOALS, directCommand, verifiedRevenue });
    const gate = await guardianGate({ cycle, goals: GOALS, directCommand });

    if (!gate.allowed) {
      cycles.push({ cycle, heartbeat, verifiedRevenue, ai2: "BLOCKED_BY_GUARDIAN", ai3: "BLOCKED_BY_GUARDIAN", guardian: gate, timestamp: new Date().toISOString() });
      console.log("[GUARDIAN]", JSON.stringify({ event: "guardian_gate_blocked", cycle, reason: gate.reason }));
    } else {
      const ai = await runAgentCycle({ topic, cycle, goals: GOALS, directCommand, verifiedRevenue });
      const audit = await guardianAuditCycle({ cycle, topic, goals: GOALS, result: ai, directCommand, verifiedRevenue });
      const snapshot = { cycle, heartbeat, verifiedRevenue, ai2: ai.ai2?.status || "MISSING", ai3: ai.ai3?.status || "MISSING", revenuePipeline: ai.revenuePipeline || null, guardian: audit, timestamp: new Date().toISOString() };
      cycles.push(snapshot);

      console.log("[GUARDIAN]", JSON.stringify({
        event: "guardian_cycle",
        cycle,
        enforcement: "POLICY_GATED",
        commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
        severity: audit.severity,
        goalsLocked: audit.goalsLocked,
        ai2: snapshot.ai2,
        ai3: snapshot.ai3,
        verifiedRevenueUsd: verifiedRevenue.verifiedRevenueUsd,
        revenuePacing: audit.revenuePacing,
        violations: audit.violations,
        approvals: audit.approvals.length
      }));
    }


  const critical = cycles.filter(x => x.guardian.severity === "CRITICAL").length;
  const high = cycles.filter(x => x.guardian.severity === "HIGH").length;
  return {
    status: critical ? "GUARDIAN_CRITICAL_REVIEW_REQUIRED" : high ? "GUARDIAN_HIGH_REVIEW_REQUIRED" : "GUARDIAN_CYCLE_COMPLETE",
    guardian: "ONLINE",
    enforcement: "POLICY_GATED",
    commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
    startedAt,
    completedAt: new Date().toISOString(),
    goals: GOALS,
    goalsLocked: true,
    directCommand: directCommand || null,
    cycles: cycles.length,
    criticalCycles: critical,
    highCycles: high,
    latestVerifiedRevenue: cycles.at(-1)?.verifiedRevenue || null,
    latestRevenuePacing: cycles.at(-1)?.guardian?.revenuePacing || null,
    revenueScout: "ACTIVE",
    safeguards: [
      "owner-locked goals",
      "Guardian blocks execution on goal/policy drift",
      "AI2/AI3 receive no payment or money-movement tools",
      "no autonomous spending",
      "no fabricated results",
      "legitimate zero-cost targeted outreach is standing owner-preapproved; financial and irreversible actions require explicit owner approval",
      "execution proposals are separated from verified results"
    ],
    results: cycles,
    opportunityLedger,
    experimentLedger,
    revenuePipeline: cycles.at(-1)?.revenuePipeline || null
  };
}
