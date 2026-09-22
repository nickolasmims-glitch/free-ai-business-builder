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

  const model = process.env.AI_AGENT_MODEL || "openai/gpt-5.6-sol";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            type: "message",
            role: "system",
            content: "You are " + agent + " for AI Business Builder. Work aggressively toward the owner-defined goals, but NEVER change the goals, deadlines, success criteria, spend permissions, or owner identity rules. Separate FACTS, ASSUMPTIONS, TESTS, and VERIFIED RESULTS. Do not invent customers, revenue, testimonials, credentials, or outcomes. Real-money spending, purchases, transfers, refunds, external messages, and account changes require explicit owner approval."
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

    return {
      status: "AI_COMPLETE",
      model,
      text: text.slice(0, 12000)
    };
  } catch (e) {
    if (e?.name === "AbortError") {
      return {
        status: "AI_ERROR",
        errorClass: "RETRYABLE_TIMEOUT",
        model,
        message: "AI Gateway request timed out after 90 seconds."
      };
    }
    return {
      status: "AI_ERROR",
      errorClass: "NETWORK_ERROR",
      model,
      message: String(e?.message || "AI Gateway network error").slice(0, 1000)
    };
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
      headers: {
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [process.env.AUTOPILOT_REPORT_EMAIL],
        subject,
        html: "<pre style='white-space:pre-wrap'>" +
          JSON.stringify(payload, null, 2).replace(/</g, "&lt;") +
          "</pre>"
      })
    });

    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { sent: false, reason: "email_failed", status: r.status, detail: body.slice(0, 500) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: "email_exception", detail: String(e?.message || e).slice(0, 500) };
  }
}

export async function runAgentCycle({ topic, cycle, goals, directCommand }) {
  "use step";

  const queries = [
    topic + " urgent buyer problems buying signals 2026",
    topic + " pricing packages competitors 2026",
    topic + " AI automation ROI small business 2026",
    topic + " missed leads follow-up appointment revenue local businesses 2026"
  ];

  const researchSettled = await Promise.allSettled(queries.map(webResearch));
  const researchResults = [];
  const researchErrors = [];

  for (const item of researchSettled) {
    if (item.status === "fulfilled") {
      researchResults.push(...item.value);
    } else {
      researchErrors.push(String(item.reason?.message || item.reason || "Research failed"));
    }
  }

  const research = researchResults.slice(0, 24);
  const context = JSON.stringify({
    goals,
    cycle,
    topic,
    directCommand: directCommand || null,
    research,
    researchErrors,
    researchStatus: research.length ? "PARTIAL_OR_COMPLETE" : "FAILED"
  });

  const directCommandInstruction = directCommand
    ? "\n\nOWNER DIRECT COMMAND (highest priority): " + directCommand + "\nFollow this command first. Guardian recommendations are non-blocking and must not delay, downgrade, replace, or cancel it. Standing safety rules still apply."
    : "";

  const ai2 = await askAgent(
    "AI 2 — Growth & Revenue Strategist",
    "Analyze the evidence below. Protect the immutable owner goals. Identify the highest-evidence revenue opportunity, what should be tested next, what should be killed, and what evidence must be verified before claiming success. Create an internal decision plan; do not send messages or spend money. If research is partial or unavailable, explicitly mark the uncertainty and continue with only the evidence available." + directCommandInstruction + "\n\n" + context
  );

  const ai3 = await askAgent(
    "AI 3 — Execution & Optimization Operator",
    "Use the evidence and AI 2 strategy below. Turn it into an execution queue: highest-priority tasks, experiments, measurement checkpoints, failure rules, and any approval requests. You may optimize internal execution, but do not change goals and do not execute paid or external actions without approval. If AI 2 failed, do not invent its conclusions; work from the research evidence and clearly mark the blocker." + directCommandInstruction + "\n\n" +
      context +
      "\n\nAI 2:\n" +
      JSON.stringify(ai2)
  );

  const approvals = [];
  const combinedText = ((ai2.text || "") + "\n" + (ai3.text || ""));
  if (/spend|purchase|paid tool|subscription|ad budget|contractor|domain|software/i.test(combinedText)) {
    approvals.push({
      status: "Awaiting approval",
      reason: "AI 2/AI 3 identified a possible paid or financially binding action. Nothing was purchased.",
      ownerAction: "Review and explicitly approve before any real-money action."
    });
  }

  const modelFailures = [ai2, ai3]
    .filter(x => x.status === "AI_ERROR" || x.status === "WAITING_FOR_AI_GATEWAY_KEY")
    .map(x => ({
      status: x.status,
      errorClass: x.errorClass || "NOT_CONFIGURED",
      message: x.message || x.message
    }));

  const result = {
    timestamp: new Date().toISOString(),
    cycle,
    topic,
    goals,
    researchCount: research.length,
    researchErrors,
    ai2,
    ai3,
    approvals,
    modelFailures
  };

  const notification = await notify("AI 2 + AI 3 monitoring cycle " + cycle, result);
  return { ...result, notification };
}
