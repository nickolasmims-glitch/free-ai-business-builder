import { pipeline } from "@huggingface/transformers";
import { boxedPrompt } from "../../platform/ai-box-guard.mjs";

const cleanText = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();

async function webResearch(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), { headers: { "User-Agent": "Mozilla/5.0 AI-Business-Builder-Agents" }, signal: controller.signal });
    if (!r.ok) throw new Error("Research provider returned " + r.status);
    const html = await r.text();
    const out = [];
    const re = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && out.length < 8) out.push({ title: cleanText(m[1]), snippet: cleanText(m[2]) });
    return out;
  } finally { clearTimeout(timeout); }
}

function classifyUpstream(status, message) {
  const m = String(message || "").toLowerCase();
  if (status === 401 || status === 403 || status === 400 || m.includes("invalid api key") || m.includes("unauthorized")) return "FATAL_AUTH_OR_REQUEST";
  if (status === 408 || status === 409 || status === 429 || status >= 500 || m.includes("timeout") || m.includes("temporar") || m.includes("credits")) return "RETRYABLE_UPSTREAM";
  return "UPSTREAM_ERROR";
}

async function askDirectOpenAI(agent, prompt, key, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning: { effort: agent.startsWith("AI 2") ? "high" : "medium" },
        input: [
          { type: "message", role: "system", content: "You are " + agent + " for AI Business Builder. Never invent customers, revenue, credentials, or outcomes. Separate facts, assumptions, tests, and verified results. Never spend money or take financial actions without owner approval." },
          { type: "message", role: "user", content: prompt }
        ]
      }),
      signal: controller.signal
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = data?.error?.message || data?.message || "OpenAI request failed";
      return { status: "AI_ERROR", errorClass: classifyUpstream(r.status, message), httpStatus: r.status, provider: "openai", model, message: message.slice(0, 1000) };
    }
    const text = String(data.output_text || (Array.isArray(data.output) ? data.output.flatMap(x => Array.isArray(x.content) ? x.content : []).map(x => x.text || "").join("\n") : "")).trim();
    if (!text) return { status: "AI_ERROR", errorClass: "EMPTY_MODEL_OUTPUT", provider: "openai", model, message: "OpenAI returned no text." };
    return { status: "AI_COMPLETE", provider: "openai", model, text: text.slice(0, 16000) };
  } catch (e) {
    return { status: "AI_ERROR", errorClass: e?.name === "AbortError" ? "RETRYABLE_TIMEOUT" : "NETWORK_ERROR", provider: "openai", model, message: String(e?.message || e).slice(0, 1000) };
  } finally { clearTimeout(timeout); }
}

let localGeneratorPromise;
async function getLocalGenerator() {
  if (!localGeneratorPromise) localGeneratorPromise = pipeline("text-generation", "onnx-community/Qwen2.5-0.5B-Instruct", { dtype: "q4" });
  return localGeneratorPromise;
}

async function askLocalModel(agent, prompt) {
  const model = "onnx-community/Qwen2.5-0.5B-Instruct";
  try {
    const generator = await getLocalGenerator();
    const output = await generator([
      { role: "system", content: "You are " + agent + " for AI Business Builder. Produce practical evidence-aware business analysis. Never invent customers, revenue, credentials, or outcomes. Separate facts, assumptions, tests, and verified results. Never spend money or take financial actions without owner approval." },
      { role: "user", content: prompt }
    ], { max_new_tokens: 384, do_sample: false });
    const generated = output?.[0]?.generated_text;
    const text = Array.isArray(generated) ? String(generated.at(-1)?.content || "") : String(generated || "");
    if (!text.trim()) return { status: "AI_ERROR", errorClass: "EMPTY_LOCAL_OUTPUT", provider: "local-transformers", model, message: "Local model returned no text." };
    return { status: "AI_COMPLETE", provider: "local-transformers", model, text: text.slice(-16000) };
  } catch (e) {
    return { status: "AI_ERROR", errorClass: "LOCAL_MODEL_ERROR", provider: "local-transformers", model, message: String(e?.message || e).slice(0, 1000) };
  }
}

async function askVercelGateway(agent, prompt, key, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, reasoning: { effort: agent.startsWith("AI 2") ? "high" : "medium" }, input: [
        { type: "message", role: "system", content: "You are " + agent + " for AI Business Builder. Never invent customers, revenue, credentials, or results. Do not spend money or take financial actions without owner approval." },
        { type: "message", role: "user", content: prompt }
      ] }),
      signal: controller.signal
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = data?.error?.message || data?.message || "AI Gateway request failed";
      return { status: "AI_ERROR", errorClass: classifyUpstream(r.status, message), httpStatus: r.status, provider: "vercel", model, message: message.slice(0, 1000) };
    }
    const text = String(data.output_text || (Array.isArray(data.output) ? data.output.flatMap(x => Array.isArray(x.content) ? x.content : []).map(x => x.text || "").join("\n") : "")).trim();
    if (!text) return { status: "AI_ERROR", errorClass: "EMPTY_MODEL_OUTPUT", provider: "vercel", model, message: "AI Gateway returned no text." };
    return { status: "AI_COMPLETE", provider: "vercel", model, text: text.slice(0, 16000) };
  } catch (e) {
    return { status: "AI_ERROR", errorClass: e?.name === "AbortError" ? "RETRYABLE_TIMEOUT" : "NETWORK_ERROR", provider: "vercel", model, message: String(e?.message || e).slice(0, 1000) };
  } finally { clearTimeout(timeout); }
}

async function askAgent(agent, prompt) {
  const openAIKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
  const explicitProvider = String(process.env[agent.startsWith("AI 2") ? "AI2_PROVIDER" : "AI3_PROVIDER"] || process.env.AI_PROVIDER || "").toLowerCase();
  const provider = explicitProvider || (openAIKey ? "openai" : "local");

  if (provider === "local" || provider === "transformers") return askLocalModel(agent, prompt);

  if (provider === "openai") {
    if (!openAIKey) return askLocalModel(agent, prompt);
    const model = agent.startsWith("AI 2") ? (process.env.AI2_MODEL || "gpt-5.6-sol") : (process.env.AI3_MODEL || "gpt-5.6-terra");
    const result = await askDirectOpenAI(agent, prompt, openAIKey, model);
    if (result.status === "AI_COMPLETE") return result;
    if (result.status !== "AI_COMPLETE") {
      console.log("[OwnerCloud] OpenAI unavailable (" + (result.httpStatus || result.errorClass || "unknown") + "); falling back to local Transformers runtime.");
      const fallback = await askLocalModel(agent, prompt);
      if (fallback.status === "AI_COMPLETE") return fallback;
      return { ...result, fallback: { provider: fallback.provider, model: fallback.model, status: fallback.status, errorClass: fallback.errorClass, message: fallback.message } };
    }
    return result;
  }

  if (provider === "vercel") {
    if (!gatewayKey) return askLocalModel(agent, prompt);
    const model = agent.startsWith("AI 2") ? (process.env.AI2_MODEL || "openai/gpt-5.6-sol") : (process.env.AI3_MODEL || "openai/gpt-5.6-terra");
    const result = await askVercelGateway(agent, prompt, gatewayKey, model);
    if (result.status === "AI_COMPLETE") return result;
    if (result.status !== "AI_COMPLETE") {
      console.log("[OwnerCloud] Vercel Gateway unavailable (" + (result.httpStatus || result.errorClass || "unknown") + "); falling back to local Transformers runtime.");
      const fallback = await askLocalModel(agent, prompt);
      if (fallback.status === "AI_COMPLETE") return fallback;
      return { ...result, fallback: { provider: fallback.provider, model: fallback.model, status: fallback.status, errorClass: fallback.errorClass, message: fallback.message } };
    }
    return result;
  }

  return askLocalModel(agent, prompt);
}

async function notify(subject, payload) {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL || !process.env.AUTOPILOT_REPORT_EMAIL) return { sent: false, reason: "email_not_configured" };
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [process.env.AUTOPILOT_REPORT_EMAIL], subject, html: "<pre style='white-space:pre-wrap'>" + JSON.stringify(payload, null, 2).replace(/</g, "&lt;") + "</pre>" }) });
    return r.ok ? { sent: true } : { sent: false, reason: "email_failed", status: r.status };
  } catch (e) { return { sent: false, reason: "email_exception", detail: String(e?.message || e).slice(0, 500) }; }
}

export async function runAgentCycle({ topic, cycle, goals, directCommand, verifiedRevenue }) {
  "use step";
  const researchAngles = [
    topic + " customer demand buying intent 2026", topic + " competitor pricing packages recurring revenue 2026",
    topic + " B2B service opportunities automation 2026", topic + " SaaS subscription opportunities small business 2026",
    topic + " digital products templates reports data products demand 2026", topic + " licensing white label reseller partnership opportunities 2026",
    topic + " affiliate partner programs software services 2026", topic + " lead generation referral fee business models 2026",
    topic + " local business operational pain points willing to pay 2026", topic + " retention churn upsell cross sell opportunities 2026",
    topic + " marketplaces directories RFP procurement opportunities 2026", topic + " cost reduction margin improvement automation opportunities 2026",
    topic + " underserved niche problems customers pay to solve 2026", topic + " emerging business models monetization opportunities 2026"
  ];
  const researchSettled = await Promise.allSettled(researchAngles.map(webResearch));
  const researchResults = [], researchErrors = [];
  for (const item of researchSettled) item.status === "fulfilled" ? researchResults.push(...item.value) : researchErrors.push(String(item.reason?.message || item.reason || "Research failed"));
  const research = researchResults.slice(0, 60);
  const context = JSON.stringify({ goals, cycle, topic, directCommand: directCommand || null, verifiedRevenue: verifiedRevenue || null, research, researchErrors, researchStatus: research.length ? "PARTIAL_OR_COMPLETE" : "FAILED" });
  const directCommandInstruction = directCommand ? "\n\nOWNER DIRECT COMMAND (highest priority): " + directCommand + "\nFollow this command first. Standing safety and spending restrictions still apply." : "";
  const ai2 = await askAgent("AI 2 — Opportunity Hunter & Business Development Engine", "Map the full revenue surface area across direct sales, recurring subscriptions, productized services, B2B contracts, licensing, partnerships/referrals, affiliate revenue, lead generation, digital products, integrations, procurement, retention, expansion revenue, and cost/margin improvements. Produce a concrete opportunity backlog with tests and measurable success criteria. Do not spend money or contact anyone.", boxedPrompt("AI 2", topic) + directCommandInstruction + "\n\nEVIDENCE:\n" + context);
  const ai3 = await askAgent("AI 3 — Revenue Operations & Monetization Engine", "Turn the evidence and AI 2 findings into an execution queue. For each opportunity define the smallest test, required asset, metric, stop/continue rule, expected revenue path, margin implications, and owner approval requirement. Do not purchase anything, move money, send external messages, or claim a result until verified.", boxedPrompt("AI 3", topic) + directCommandInstruction + "\n\nEVIDENCE:\n" + context + "\n\nAI 2 FINDINGS:\n" + JSON.stringify(ai2));
  const approvals = [];
  const combinedText = (ai2.text || "") + "\n" + (ai3.text || "");
  if (/spend|purchase|paid tool|subscription|ad budget|contractor|domain|software|inventory|lead list|contract/i.test(combinedText)) approvals.push({ status: "Awaiting approval", reason: "AI 2/AI 3 identified a possible paid or financially binding action. Nothing was purchased.", ownerAction: "Review and explicitly approve before any real-money action." });
  const modelFailures = [ai2, ai3].filter(x => x.status === "AI_ERROR" || x.status === "WAITING_FOR_AI_GATEWAY_KEY").map(x => ({ status: x.status, errorClass: x.errorClass || "NOT_CONFIGURED", message: x.message || "" }));
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
    executionQueue: ["research qualified buyer problems","create offer-specific fulfillment asset","prepare personalized outreach draft","external outreach is standing owner-preapproved for legitimate targeted zero-cost outreach; execute it when the system has a compliant delivery mechanism and verified business basis","send customer to hosted checkout","verify paid Stripe session","fulfill the purchased offer","measure margin and repeatability"],
    standingPreapprovedActions: ["legitimate targeted zero-cost business-development outreach through a configured compliant channel with a verified business basis"],
    approvalGates: ["paid tools","ads","contracts","financial actions"],
    verificationGates: ["paid Stripe session","refund status","fulfilled deliverable","verified revenue"]
  };
  const result = { timestamp: new Date().toISOString(), cycle, topic, goals, verifiedRevenue: verifiedRevenue || null, researchCount: research.length, researchAngles: researchAngles.length, researchErrors, coverage: ["sales","subscriptions","productized services","B2B","licensing","white-label","partnerships","referrals","affiliate revenue","lead generation","digital products","data/reports","integrations","marketplaces/procurement","retention","upsell/cross-sell","cost and margin improvement"], ai2, ai3, approvals, modelFailures, revenuePipeline };
  return { ...result, notification: await notify("AI 2 + AI 3 multi-revenue research cycle " + cycle, result) };
}
