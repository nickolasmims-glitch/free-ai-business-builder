import { sleep } from "workflow";
import { runAgentCycle } from "./steps/ai-agents.js";
import { guardianAuditCycle, guardianHeartbeat } from "./steps/guardian.js";

const GOALS = {
  fridayTarget: 1000,
  fridayDeadline: "2026-09-25",
  fourMonthTarget: 4000000,
  fourMonthDeadline: "2027-01-25"
};

export async function guardianRevenueScoutMonitor(input = {}) {
  "use workflow";

  const topic = String(
    input.topic || "AI workflow automation for local service businesses"
  ).slice(0, 180);
  const directCommand = String(input.directCommand || "").slice(0, 2000);

  const cycles = [];
  const startedAt = new Date().toISOString();

  for (let cycle = 1; cycle <= 4; cycle++) {
    const heartbeat = await guardianHeartbeat({ cycle, goals: GOALS, directCommand });
    // Guardian is supervisory only. It observes and reports; it never gates the mission.
    const ai = await runAgentCycle({ topic, cycle, goals: GOALS, directCommand });
    const audit = await guardianAuditCycle({
      cycle,
      topic,
      goals: GOALS,
      result: ai,
      directCommand
    });

    const snapshot = {
      cycle,
      heartbeat,
      ai2: ai.ai2?.status || "MISSING",
      ai3: ai.ai3?.status || "MISSING",
      guardian: audit,
      timestamp: new Date().toISOString()
    };

    cycles.push(snapshot);

    console.log("[GUARDIAN]", JSON.stringify({
      event: "guardian_cycle",
      cycle,
      enforcement: "NON_BLOCKING",
      commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
      severity: audit.severity,
      goalsLocked: audit.goalsLocked,
      ai2: snapshot.ai2,
      ai3: snapshot.ai3,
      violations: audit.violations,
      approvals: audit.approvals.length
    }));

    if (cycle < 4) await sleep("6 hours");
  }

  const critical = cycles.filter(x => x.guardian.severity === "CRITICAL").length;
  const high = cycles.filter(x => x.guardian.severity === "HIGH").length;

  return {
    status: critical ? "GUARDIAN_CRITICAL_REVIEW_REQUIRED" : high ? "GUARDIAN_HIGH_REVIEW_REQUIRED" : "GUARDIAN_24H_MONITOR_COMPLETE",
    guardian: "ONLINE",
    enforcement: "NON_BLOCKING",
    commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
    startedAt,
    completedAt: new Date().toISOString(),
    goals: GOALS,
    goalsLocked: true,
    directCommand: directCommand || null,
    cycles: cycles.length,
    criticalCycles: critical,
    highCycles: high,
    revenueScout: "ACTIVE",
    safeguards: [
      "owner-locked goals",
      "owner direct commands take priority over Guardian recommendations",
      "Guardian cannot pause, cancel, downgrade, or replace the active mission",
      "no autonomous spending",
      "no fabricated results",
      "external actions approval-gated"
    ],
    results: cycles
  };
}
