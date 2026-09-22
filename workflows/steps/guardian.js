import { sleep } from "workflow";

const EXPECTED_GOALS = {
  fridayTarget: 1000,
  fridayDeadline: "2026-09-25",
  fourMonthTarget: 4000000,
  fourMonthDeadline: "2027-01-25"
};

function severityFor(result) {
  if (!result) return "CRITICAL";
  if (result.ai2?.status === "AI_ERROR" || result.ai3?.status === "AI_ERROR") return "HIGH";
  if (result.ai2?.status === "WAITING_FOR_AI_GATEWAY_KEY" || result.ai3?.status === "WAITING_FOR_AI_GATEWAY_KEY") return "HIGH";
  if ((result.researchErrors || []).length > 0) return "MEDIUM";
  if ((result.approvals || []).length > 0) return "REVIEW";
  return "HEALTHY";
}

function goalsLocked(goals) {
  return JSON.stringify(goals) === JSON.stringify(EXPECTED_GOALS);
}

function containsForbiddenClaim(text) {
  return /guaranteed revenue|guaranteed income|we made \$|customer paid|customer purchased|sales closed|revenue generated/i.test(String(text || ""));
}

export async function guardianAuditCycle({ cycle, topic, goals, result, directCommand }) {
  "use step";

  const ai2Text = result?.ai2?.text || "";
  const ai3Text = result?.ai3?.text || "";
  const violations = [];

  if (!goalsLocked(goals)) violations.push("OWNER_GOAL_DRIFT");
  if (containsForbiddenClaim(ai2Text) || containsForbiddenClaim(ai3Text)) violations.push("UNVERIFIED_REVENUE_OR_SALES_CLAIM");
  if ((result?.approvals || []).some(x => x.status !== "Awaiting approval")) violations.push("APPROVAL_STATE_INVALID");

  const severity = violations.length ? "CRITICAL" : severityFor(result);
  const revenueScout = {
    status: result?.researchCount ? "EVIDENCE_CAPTURED" : "NO_RESEARCH_EVIDENCE",
    opportunities: Math.min(Number(result?.researchCount || 0), 24),
    next: severity === "HEALTHY"
      ? "Continue evidence-led prospect, offer and conversion research."
      : "Do not claim revenue success; isolate the blocker and preserve the owner-defined goals."
  };

  return {
    guardian: "ONLINE",
    role: "Supervisor / reliability / policy guard",
    enforcement: "NON_BLOCKING",
    commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
    directCommand: directCommand || null,
    cycle,
    topic,
    severity,
    violations,
    goalsLocked: goalsLocked(goals),
    externalActions: "BLOCKED_WITHOUT_OWNER_APPROVAL",
    spending: "BLOCKED_WITHOUT_OWNER_APPROVAL",
    fabricatedResults: "BLOCKED",
    revenueScout,
    ai2: {
      status: result?.ai2?.status || "MISSING",
      errorClass: result?.ai2?.errorClass || null
    },
    ai3: {
      status: result?.ai3?.status || "MISSING",
      errorClass: result?.ai3?.errorClass || null
    },
    researchErrors: result?.researchErrors || [],
    approvals: result?.approvals || [],
    timestamp: new Date().toISOString()
  };
}

export async function guardianHeartbeat({ cycle, goals, directCommand }) {
  "use step";

  return {
    guardian: "ONLINE",
    cycle,
    enforcement: "NON_BLOCKING",
    commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
    directCommand: directCommand || null,
    goalsLocked: goalsLocked(goals),
    safeguards: [
      "owner-locked goals",
      "owner direct commands take priority over Guardian recommendations",
      "Guardian audits do not block mission execution",
      "no autonomous spending",
      "no fabricated revenue or customer claims",
      "external actions require approval",
      "AI2 and AI3 failures are surfaced"
    ],
    heartbeat: new Date().toISOString()
  };
}
