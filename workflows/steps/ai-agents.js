const cleanText = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\\s+/g, " ").trim();

async function research(query) {
  const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
    headers: { "User-Agent": "Mozilla/5.0 AI-Business-Builder-Agents" }
  });
  if (!r.ok) throw new Error("Research provider returned " + r.status);
  const html = await r.text();
  const out = [];
  const re = /<a[^>]+class="result__a"[^>]*>([\\s\\S]*?)<\\/a>[\\s\\S]*?<a[^>]+class="result__snippet"[^>]*>([\\s\\S]*?)<\\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 8) out.push({ title: cleanText(m[1]), snippet: cleanText(m[2]) });
  return out;
}

async function askAgent(agent, prompt) {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return {
    status: "WAITING_FOR_AI_GATEWAY_KEY",
    message: "AI_GATEWAY_API_KEY is not configured; monitoring continues with evidence capture but model decisions are paused."
  };

  const r = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.AI_AGENT_MODEL || "openai/gpt-5.6-sol",
      input: [
        {
          role: "system",
          content: "You are " + agent + " for AI Business Builder. Work aggressively toward the owner-defined goals, but NEVER change the goals, deadlines, success criteria, spend permissions, or owner identity rules. Separate FACTS, ASSUMPTIONS, TESTS, and VERIFIED RESULTS. Do not invent customers, revenue, testimonials, credentials, or outcomes. Real-money spending, purchases, transfers, refunds, external messages, and account changes require explicit owner approval."
        },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "AI Gateway request failed");
  const text = Array.isArray(data.output)
    ? data.output.flatMap(x => Array.isArray(x.content) ? x.content : []).map(x => x.text || "").join("\n")
    : "";
  return { status: "AI_COMPLETE", model: process.env.AI_AGENT_MODEL || "openai/gpt-5.6-sol", text: text.slice(0,12000) };
}

async function notify(subject, payload) {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL || !process.env.AUTOPILOT_REPORT_EMAIL) return false;
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
      html: "<pre style='white-space:pre-wrap'>" + JSON.stringify(payload, null, 2).replace(/</g,"&lt;") + "</pre>"
    })
  });
  return r.ok;
}

export async function runAgentCycle({ topic, cycle, goals }) {
  "use step";

  const queries = [
    topic + " urgent buyer problems buying signals 2026",
    topic + " pricing packages competitors 2026",
    topic + " AI automation ROI small business 2026",
    topic + " missed leads follow-up appointment revenue local businesses 2026"
  ];
  const research = (await Promise.all(queries.map(research))).flat().slice(0,24);
  const context = JSON.stringify({ goals, cycle, topic, research });

  const ai2 = await askAgent("AI 2 — Growth & Revenue Strategist",
    "Analyze the evidence below. Protect the immutable owner goals. Identify the highest-evidence revenue opportunity, what should be tested next, what should be killed, and what evidence must be verified before claiming success. Create an internal decision plan; do not send messages or spend money.\\n\\n" + context);

  const ai3 = await askAgent("AI 3 — Execution & Optimization Operator",
    "Use the evidence and AI 2 strategy below. Turn it into an execution queue: highest-priority tasks, experiments, measurement checkpoints, failure rules, and any approval requests. You may optimize internal execution, but do not change goals and do not execute paid or external actions without approval.\\n\\n" + context + "\\n\\nAI 2:\\n" + JSON.stringify(ai2));

  const approvals = [];
  if ((ai2.text || "").match(/spend|purchase|paid tool|subscription|ad budget/i) || (ai3.text || "").match(/spend|purchase|paid tool|subscription|ad budget/i)) {
    approvals.push({
      status: "Awaiting approval",
      reason: "AI 2/AI 3 identified a possible paid action. Nothing was purchased.",
      ownerAction: "Review and explicitly approve before any real-money action."
    });
  }

  const result = {
    timestamp: new Date().toISOString(),
    cycle,
    topic,
    goals,
    researchCount: research.length,
    ai2,
    ai3,
    approvals
  };

  await notify("AI 2 + AI 3 monitoring cycle " + cycle, result);
  return result;
}
