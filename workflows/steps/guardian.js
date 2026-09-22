const EXPECTED_GOALS = {
  fridayTarget: 1000,
  fridayDeadline: "2026-09-25",
  fourMonthTarget: 4000000,
  fourMonthDeadline: "2027-01-25"
};

function goalsLocked(goals) { return JSON.stringify(goals) === JSON.stringify(EXPECTED_GOALS); }
function containsForbiddenClaim(text) { return /guaranteed revenue|guaranteed income|we made \$|customer paid|customer purchased|sales closed|revenue generated/i.test(String(text || "")); }
function daysUntil(dateString) {
  const end = new Date(dateString + "T23:59:59Z").getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}
function pacing(verifiedRevenue, goals) {
  const revenue = Number(verifiedRevenue?.verifiedRevenueUsd || 0);
  return [
    { key: "friday", target: Number(goals.fridayTarget), deadline: goals.fridayDeadline },
    { key: "fourMonth", target: Number(goals.fourMonthTarget), deadline: goals.fourMonthDeadline }
  ].map(x => {
    const remaining = Math.max(0, x.target - revenue);
    const days = daysUntil(x.deadline);
    const deadlinePassed = Date.now() > new Date(x.deadline + "T23:59:59Z").getTime();
    return {
      checkpoint: x.key, targetUsd: x.target, verifiedRevenueUsd: revenue, gapUsd: remaining,
      daysRemaining: days, requiredDailyRevenueUsd: days > 0 ? Math.ceil(remaining / days) : remaining,
      deadlinePassed,
      status: deadlinePassed ? (remaining > 0 ? "MISSED" : "HIT") : (remaining > 0 ? "IN_PROGRESS" : "HIT")
    };
  });
}
function severityFor(result, revenuePacing) {
  if (!result) return "CRITICAL";
  if (result.ai2?.status === "AI_ERROR" || result.ai3?.status === "AI_ERROR") return "HIGH";
  if (result.ai2?.status === "WAITING_FOR_AI_GATEWAY_KEY" || result.ai3?.status === "WAITING_FOR_AI_GATEWAY_KEY") return "HIGH";
  if (revenuePacing.some(x => x.status === "MISSED")) return "CRITICAL";
  if (revenuePacing.some(x => x.status === "IN_PROGRESS" && x.gapUsd > 0)) return "HIGH";
  if ((result.researchErrors || []).length > 0) return "MEDIUM";
  if ((result.approvals || []).length > 0) return "REVIEW";
  return "HEALTHY";
}

export async function guardianGate({ cycle, goals, directCommand }) {
  "use step";
  if (!goalsLocked(goals)) return { allowed: false, guardian: "ONLINE", enforcement: "POLICY_GATED", cycle, reason: "OWNER_GOAL_DRIFT", action: "BLOCKED" };
  const command = String(directCommand || "");
  if (/transfer|withdraw|invest|send money|buy|purchase|spend|refund|delete production|change owner|change payout|change bank/i.test(command)) {
    return { allowed: false, guardian: "ONLINE", enforcement: "POLICY_GATED", cycle, reason: "FINANCIAL_OR_IRREVERSIBLE_COMMAND_REQUIRES_OWNER_APPROVAL", action: "BLOCKED" };
  }
  return { allowed: true, guardian: "ONLINE", enforcement: "POLICY_GATED", cycle, reason: "POLICY_CHECK_PASSED", action: "ALLOW_RESEARCH_AND_INTERNAL_EXECUTION" };
}

export async function getVerifiedStripeRevenue() {
  "use step";
  if (!process.env.STRIPE_SECRET_KEY) return { status: "UNAVAILABLE", reason: "STRIPE_SECRET_KEY_NOT_CONFIGURED", verifiedRevenueUsd: 0 };
  let startingAfter = null, verifiedRevenueUsd = 0, chargeCount = 0, scannedPages = 0;
  const excludedCurrencies = new Set();
  try {
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ limit: "100" });
      if (startingAfter) params.set("starting_after", startingAfter);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let data;
      try {
        const r = await fetch("https://api.stripe.com/v1/charges?" + params.toString(), { headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY }, signal: controller.signal });
        data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error?.message || "Stripe charges request failed");
      } finally { clearTimeout(timeout); }
      scannedPages++;
      for (const charge of data.data || []) {
        if (charge.paid === true && charge.currency === "usd") {
          verifiedRevenueUsd += Math.max(0, Number(charge.amount || 0) - Number(charge.amount_refunded || 0)) / 100;
          chargeCount++;
        } else if (charge.paid === true && charge.currency) excludedCurrencies.add(String(charge.currency).toUpperCase());
      }
      if (!data.has_more || !data.data?.length) break;
      startingAfter = data.data[data.data.length - 1].id;
    }
    return { status: "VERIFIED", verifiedRevenueUsd: Math.round(verifiedRevenueUsd * 100) / 100, chargeCount, scannedPages, excludedCurrencies: Array.from(excludedCurrencies) };
  } catch (e) {
    return { status: "ERROR", reason: String(e?.message || e).slice(0, 500), verifiedRevenueUsd: Math.round(verifiedRevenueUsd * 100) / 100, chargeCount, scannedPages, excludedCurrencies: Array.from(excludedCurrencies) };
  }
}

export async function guardianAuditCycle({ cycle, topic, goals, result, directCommand, verifiedRevenue }) {
  "use step";
  const ai2Text = result?.ai2?.text || "", ai3Text = result?.ai3?.text || "";
  const violations = [], revenuePacing = pacing(verifiedRevenue, goals);
  if (!goalsLocked(goals)) violations.push("OWNER_GOAL_DRIFT");
  if (containsForbiddenClaim(ai2Text) || containsForbiddenClaim(ai3Text)) violations.push("UNVERIFIED_REVENUE_OR_SALES_CLAIM");
  if ((result?.approvals || []).some(x => x.status !== "Awaiting approval")) violations.push("APPROVAL_STATE_INVALID");
  const severity = violations.length ? "CRITICAL" : severityFor(result, revenuePacing);
  return {
    guardian: "ONLINE", role: "Supervisor / reliability / policy guard", enforcement: "POLICY_GATED",
    commandPriority: "OWNER_DIRECT_COMMANDS_FIRST", directCommand: directCommand || null, cycle, topic, severity, violations,
    goalsLocked: goalsLocked(goals), verifiedRevenue, revenuePacing,
    externalActions: "BLOCKED_WITHOUT_OWNER_APPROVAL", spending: "BLOCKED_WITHOUT_OWNER_APPROVAL", moneyMovement: "BLOCKED",
    fabricatedResults: "BLOCKED",
    revenueScout: {
      status: result?.researchCount ? "EVIDENCE_CAPTURED" : "NO_RESEARCH_EVIDENCE",
      opportunities: Math.min(Number(result?.researchCount || 0), 24),
      next: severity === "HEALTHY" ? "Continue evidence-led opportunity discovery, testing and conversion optimization." : "Prioritize the largest verified revenue gap and fastest evidence-backed test; do not claim success before verification."
    },
    ai2: { status: result?.ai2?.status || "MISSING", errorClass: result?.ai2?.errorClass || null },
    ai3: { status: result?.ai3?.status || "MISSING", errorClass: result?.ai3?.errorClass || null },
    researchErrors: result?.researchErrors || [], approvals: result?.approvals || [], timestamp: new Date().toISOString()
  };
}

export async function guardianHeartbeat({ cycle, goals, directCommand, verifiedRevenue }) {
  "use step";
  return {
    guardian: "ONLINE", cycle, enforcement: "POLICY_GATED", commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
    directCommand: directCommand || null, goalsLocked: goalsLocked(goals), verifiedRevenue, revenuePacing: pacing(verifiedRevenue, goals),
    safeguards: [
      "owner-locked goals", "Guardian blocks goal/policy drift before AI2/AI3 execution",
      "verified Stripe revenue used for pacing only", "AI2/AI3 have no money-movement authority",
      "no autonomous spending", "no fabricated revenue or customer claims", "external actions require approval", "AI2/AI3 failures are surfaced"
    ],
    heartbeat: new Date().toISOString()
  };
}
