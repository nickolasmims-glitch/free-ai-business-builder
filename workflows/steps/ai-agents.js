const cleanText = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

async function webResearch(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 AI-Business-Builder-Agents" },
      signal: controller.signal
    });
    if (!r.ok) throw new Error("Research provider returned " + r.status);
    const html = await r.text();
    const out = [];
    const re = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && out.length < 8) {
      out.push({ title: cleanText(m[1]), snippet: cleanText(m[2]) });
    }
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

function classifyGatewayError(status, message) {
  const m = String(message || "").toLowerCase();
  if (status === 401 || status === 403 || status === 400 || m.includes("invalid api key") || m.includes("unauthorized")) {
    return "FATAL_AUTH_OR_REQUEST";
  }
  if (status === 408 || status === 409 || status === 429 || status >= 500 || m.includes("timeout") || m.includes("temporar")) {
    return "RETRYABLE_UPSTREAM";
  }
  return "UPSTREAM_ERROR";
}

async function askAgent(agent, prompt) {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) {
    return {
      status: "WAITING_FOR_AI_GATEWAY_KEY",
      message: "AI_GATEWAY_API_KEY is not configured; evidence capture can continue, but model decisions are paused."
    };
  }

  const model = process.env.AI_AGENT_MODEL || (agent.startsWith("AI 2") ? "openai/gpt-5.6-sol" : "openai/gpt-5.6-terra");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: agent.startsWith("AI 2") ? "high" : "medium" },
        input: [
          {
            type: "message",
            role: "system",
            content: "You are " + agent + " for AI Business Builder. Work aggressively toward the owner-defined goals, but NEVER change the goals, deadlines, success criteria, spend permissions, or owner identity rules. Your job is broader than marketing: continuously look for legitimate ways to create revenue, reduce avoidable cost, improve margins, create products/services, build recurring revenue, form partnerships, license assets, generate qualified leads, improve retention, and discover new business models. Separate FACTS, ASSUMPTIONS, TESTS, and VERIFIED RESULTS. Do not invent customers, revenue, testimonials, credentials, or outcomes. Real-money spending, purchases, transfers, refunds, and account changes require explicit owner approval. The owner has granted standing authorization for legitimate, targeted, zero-cost business-development outreach and follow-up; do not wait for another approval for that class of action. Execute only through configured, lawful, compliant delivery channels; do not spam, deceive, scrape private data, or contact people without a legitimate business basis. Never use deceptive, illegal, abusive, spammy, unauthorized, privacy-invasive, or platform-rule-evasion tactics."
          },
          {
            type: "message",
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = data?.error?.message || data?.message || "AI Gateway request failed";
      return {
        status: "AI_ERROR",
        errorClass: classifyGatewayError(r.status, message),
        httpStatus: r.status,
        model,
        message: message.slice(0, 1000)
      };
    }

    const text = String(
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output
            .flatMap(x => Array.isArray(x.content) ? x.content : [])
            .map(x => x.text || "")
            .join("\n")
        : "")
    ).trim();

    if (!text) {
      return {
        status: "AI_ERROR",
        errorClass: "EMPTY_MODEL_OUTPUT",
        model,
        message: "AI Gateway returned a successful response without text output."
      };
    }

    return { status: "AI_COMPLETE", model, text: text.slice(0, 16000) };
  } catch (e) {
    if (e?.name === "AbortError") {
      return { status: "AI_ERROR", errorClass: "RETRYABLE_TIMEOUT", model, message: "AI Gateway request timed out after 60 seconds." };
    }
    return { status: "AI_ERROR", errorClass: "NETWORK_ERROR", model, message: String(e?.message || "AI Gateway network error").slice(0, 1000) };
  } finally {
    clearTimeout(timeout);
  }
}

async function notify(subject, payload) {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL || !process.env.AUTOPILOT_REPORT_EMAIL) {
    return { sent: false, reason: "email_not_configured" };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [process.env.AUTOPILOT_REPORT_EMAIL],
        subject,
        html: "<pre style='white-space:pre-wrap'>" + JSON.stringify(payload, null, 2).replace(/</g, "&lt;") + "</pre>"
      })
    });
    if (!r.ok) return { sent: false, reason: "email_failed", status: r.status };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: "email_exception", detail: String(e?.message || e).slice(0, 500) };
  }
}

export async function runAgentCycle({ topic, cycle, goals, directCommand, verifiedRevenue }) {
  "use step";

  const researchAngles = [
    topic + " customer demand buying intent 2026",
    topic + " competitor pricing packages recurring revenue 2026",
    topic + " B2B service opportunities automation 2026",
    topic + " SaaS subscription opportunities small business 2026",
    topic + " digital products templates reports data products demand 2026",
    topic + " licensing white label reseller partnership opportunities 2026",
    topic + " affiliate partner programs software services 2026",
    topic + " lead generation referral fee business models 2026",
    topic + " local business operational pain points willing to pay 2026",
    topic + " retention churn upsell cross sell opportunities 2026",
    topic + " marketplaces directories RFP procurement opportunities 2026",
    topic + " cost reduction margin improvement automation opportunities 2026",
    topic + " underserved niche problems customers pay to solve 2026",
    topic + " emerging business models monetization opportunities 2026"
  ];

  const researchSettled = await Promise.allSettled(researchAngles.map(webResearch));
  const researchResults = [];
  const researchErrors = [];
  for (const item of researchSettled) {
    if (item.status === "fulfilled") researchResults.push(...item.value);
    else researchErrors.push(String(item.reason?.message || item.reason || "Research failed"));
  }

  const research = researchResults.slice(0, 60);
  const context = JSON.stringify({
    goals,
    cycle,
    topic,
    directCommand: directCommand || null,
    verifiedRevenue: verifiedRevenue || null,
    research,
    researchErrors,
    researchStatus: research.length ? "PARTIAL_OR_COMPLETE" : "FAILED"
  });

  const directCommandInstruction = directCommand
    ? "\n\nOWNER DIRECT COMMAND (highest priority): " + directCommand + "\nFollow this command first. Standing safety and spending restrictions still apply."
    : "";

  const ai2 = await askAgent(
    "AI 2 — Opportunity Hunter & Business Development Engine",
    "Go beyond marketing. Map the full revenue surface area. Research and identify legitimate opportunities across: direct sales, recurring subscriptions, premium tiers, productized services, B2B contracts, white-label/licensing, partnerships/referrals, affiliate revenue, lead generation, digital products, templates/data/reports, integrations, marketplace/procurement opportunities, retention/reactivation, upsells/cross-sells, and cost/margin improvements. Rank opportunities by evidence, time-to-test, expected economics, dependencies, and risk WITHOUT giving an overall political-style or subjective winner. Produce a concrete opportunity backlog with tests and measurable success criteria. Do not spend money or contact anyone.",
    directCommandInstruction + "\n\nEVIDENCE:\n" + context
  );

  const ai3 = await askAgent(
    "AI 3 — Revenue Operations & Monetization Engine",
    "Turn the evidence and AI 2 findings into an execution queue that goes beyond marketing. For each opportunity, define the smallest legitimate test, required asset, metric, stop/continue rule, expected revenue path, margin implications, and owner approval requirement. Look specifically for non-marketing revenue: product/service creation, recurring billing, licensing, partnerships, referral economics, B2B packages, marketplace/procurement routes, customer retention, expansion revenue, and cost reductions. Do not purchase anything, move money, send external messages, or claim a result until it is verified. If evidence is weak, mark it as a hypothesis and research it further.",
    directCommandInstruction + "\n\nEVIDENCE:\n" + context + "\n\nAI 2 FINDINGS:\n" + JSON.stringify(ai2)
  );

  const approvals = [];
  const combinedText = (ai2.text || "") + "\n" + (ai3.text || "");
  if (/spend|purchase|paid tool|subscription|ad budget|contractor|domain|software|inventory|lead list|contract/i.test(combinedText)) {
    approvals.push({
      status: "Awaiting approval",
      reason: "AI 2/AI 3 identified a possible paid or financially binding action. Nothing was purchased.",
      ownerAction: "Review and explicitly approve before any real-money action."
    });
  }

  const modelFailures = [ai2, ai3]
    .filter(x => x.status === "AI_ERROR" || x.status === "WAITING_FOR_AI_GATEWAY_KEY")
    .map(x => ({ status: x.status, errorClass: x.errorClass || "NOT_CONFIGURED", message: x.message || "" }));

  const revenuePipeline = {
    status: "READY_FOR_CUSTOMER_VALIDATION",
    paymentPath: "customer -> hosted Stripe checkout -> Stripe balance -> owner bank payout",
    moneyAuthority: "AI2_AI3_NONE",
    checkout: "HOSTED_STRIPE_CHECKOUT",
    offers: [
      { name: "AI Lead Follow-Up Audit", priceUsd: 500, fulfillment: "audit + prioritized 30-day follow-up roadmap" },
      { name: "30-Day Content Repurpose Pack", priceUsd: 300, fulfillment: "one source asset -> platform-ready derivatives" },
      { name: "AI Workflow Quick-Win Sprint", priceUsd: 750, fulfillment: "one workflow mapped, improved and documented" }
    ],
    executionQueue: [
      "research qualified buyer problems",
      "create offer-specific fulfillment asset",
      "prepare personalized outreach draft",
      "external outreach is standing owner-preapproved for legitimate targeted zero-cost outreach; execute it when the system has a compliant delivery mechanism and verified business basis",
      "send customer to hosted checkout",
      "verify paid Stripe session",
      "fulfill the purchased offer",
      "measure margin and repeatability"
    ],
    standingPreapprovedActions: [
      "legitimate targeted zero-cost business-development outreach through a configured compliant channel with a verified business basis"
    ],
    approvalGates: ["paid tools", "ads", "contracts", "financial actions"],
    verificationGates: ["paid Stripe session", "refund status", "fulfilled deliverable", "verified revenue"]
  };

  const result = {
    timestamp: new Date().toISOString(),
    cycle,
    topic,
    goals,
    verifiedRevenue: verifiedRevenue || null,
    researchCount: research.length,
    researchAngles: researchAngles.length,
    researchErrors,
    coverage: [
      "sales",
      "subscriptions",
      "productized services",
      "B2B",
      "licensing",
      "white-label",
      "partnerships",
      "referrals",
      "affiliate revenue",
      "lead generation",
      "digital products",
      "data/reports",
      "integrations",
      "marketplaces/procurement",
      "retention",
      "upsell/cross-sell",
      "cost and margin improvement"
    ],
    ai2,
    ai3,
    approvals,
    modelFailures,
    revenuePipeline
  };

  const notification = await notify("AI 2 + AI 3 multi-revenue research cycle " + cycle, result);
  return { ...result, notification };
}
