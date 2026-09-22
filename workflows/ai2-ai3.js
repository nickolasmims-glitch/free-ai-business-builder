import { sleep } from "workflow";
import { runAgentCycle } from "./steps/ai-agents.js";

const GOALS = {
  fridayTarget: 1000,
  fridayDeadline: "2026-09-25",
  fourMonthTarget: 4000000,
  fourMonthDeadline: "2027-01-25"
};

export async function ai2Ai3ContinuousMonitor(input = {}) {
  "use workflow";

  const topic = String(input.topic || "AI workflow automation for local service businesses").slice(0,180);
  const results = [];

  for (let cycle = 1; cycle <= 4; cycle++) {
    const result = await runAgentCycle({ topic, cycle, goals: GOALS });
    results.push(result);
    console.log("[AI2+AI3 MONITOR]", JSON.stringify({
      cycle,
      ai2: result.ai2?.status,
      ai3: result.ai3?.status,
      approvals: result.approvals?.length || 0,
      timestamp: result.timestamp
    }));

    if (cycle < 4) await sleep("6 hours");
  }

  return {
    status: "24H_MONITOR_COMPLETE",
    goals: GOALS,
    cycles: results.length,
    results
  };
}
