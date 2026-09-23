import { Pool } from "pg";
import { randomUUID, createHash } from "node:crypto";

const DB_URL = process.env.DATABASE_URL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const INTERVAL_MS = Math.max(1000, Number(process.env.AGENT_INTERVAL_MS || 30000));
const THINK_CYCLES = Math.max(1, Math.min(12, Number(process.env.AGENT_THINK_CYCLES || 4)));
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";

if (!DB_URL) throw new Error("DATABASE_URL is required for autonomous workers");
if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is required for autonomous workers");

const DB_IS_CLOUD_SQL_SOCKET = DB_URL.includes("host=/cloudsql/");
const pool = new Pool({
  connectionString: DB_URL,
  ...(DB_IS_CLOUD_SQL_SOCKET ? {} : { ssl: { rejectUnauthorized: false } }),
  max: 20,
  idleTimeoutMillis: 30000
});

async function state() {
  await pool.query("CREATE TABLE IF NOT EXISTS gateway_state (key TEXT PRIMARY KEY,value JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const r = await pool.query("SELECT value FROM gateway_state WHERE key='state'");
  return r.rows[0]?.value || { projects: [], bots: [], events: [], alerts: [] };
}

async function save(s) {
  await pool.query(
    "INSERT INTO gateway_state(key,value) VALUES('state',$1) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()",
    [JSON.stringify(s)]
  );
}

function addEvent(s, type, actor, detail, data = {}) {
  const prev = s.events?.[0]?.hash || "";
  const base = JSON.stringify({ type, actor, detail, data, prev });
  const hash = createHash("sha256").update(base).digest("hex");
  const event = { id: randomUUID(), at: new Date().toISOString(), type, actor, detail, data, prev, hash };
  s.events = [event, ...(s.events || [])].slice(0, 5000);
  return event;
}

async function gemini(prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }]
      })
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "Gemini worker call failed");
  return d?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

async function notify(detail, data) {
  if (!ALERT_WEBHOOK_URL) return false;
  try {
    const r = await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gateway: "Customer Gateway", alert: { detail, data, at: new Date().toISOString() } })
    });
    return r.ok;
  } catch {
    return false;
  }
}

function parseDecision(raw) {
  try {
    const cleaned = raw.replace(/^\`\`\`json|^\`\`\`|\`\`\`$/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      priority: "review",
      shouldAddBot: false,
      reason: "Planner returned non-JSON output",
      raw
    };
  }
}

async function agentDecision(agent, facts, cycle) {
  const role = agent === "AI2" ? "Execution Engineer" : "Research & Growth Engineer";
  const focus = agent === "AI2"
    ? "Find the fastest safe path to turn an approved product idea into a working app, API, deployment task, test, or revenue-ready capability."
    : "Research current demand, competitors, pricing, distribution channels, and customer pain. Use Google Search when useful. Turn findings into concrete app/product opportunities.";
  const prompt = `
You are ${agent}, the ${role}, operating a high-capacity production AI business gateway.
This is thinking/planning work, not a claim of completed execution.
Mission: discover and execute high-value software opportunities, especially AI-powered app building and recurring revenue.

${focus}

Current gateway facts:
- active bots: ${facts.bots}
- projects: ${facts.projects}
- cycle: ${cycle}/${THINK_CYCLES}

Return STRICT JSON with:
{
  "priority": "critical|high|medium|low",
  "shouldAddBot": true|false,
  "botName": "specific specialist name or empty",
  "botRole": "specific production role or empty",
  "reason": "evidence-based reason",
  "upgradeProposal": "specific technical upgrade or empty",
  "productIdea": "specific AI/app product that could be sold",
  "customer": "target customer",
  "monetization": "subscription|usage|transaction|service|other",
  "priceIdea": "concrete test price",
  "buildTask": "one concrete implementation task",
  "distributionTask": "one concrete customer acquisition task",
  "revenueHypothesis": "testable hypothesis, never a guaranteed income claim",
  "searchEvidence": ["short source/finding strings when research was used"]
}

Rules:
- Never claim revenue, customers, deployments, tests, or code changes that did not actually happen.
- Do not spend money, contact customers, publish ads, or make irreversible external changes without an explicit owner-approved mechanism.
- Prefer small, measurable experiments and reusable AI/app components.
- Look for opportunities where the gateway can build a useful application once and sell it repeatedly.
`;
  return parseDecision(await gemini(prompt));
}

function mergeProposal(s, agent, decision, cycle) {
  const proposal = {
    id: randomUUID(),
    at: new Date().toISOString(),
    agent,
    cycle,
    priority: decision.priority || "medium",
    productIdea: decision.productIdea || "",
    customer: decision.customer || "",
    monetization: decision.monetization || "",
    priceIdea: decision.priceIdea || "",
    buildTask: decision.buildTask || "",
    distributionTask: decision.distributionTask || "",
    revenueHypothesis: decision.revenueHypothesis || "",
    searchEvidence: decision.searchEvidence || []
  };
  s.events = s.events || [];
  addEvent(s, "revenue_opportunity", agent, agent + " produced a revenue opportunity", proposal);
  return proposal;
}

async function tick() {
  const lock = await pool.query("SELECT pg_try_advisory_lock(81723651) AS locked");
  if (!lock.rows[0]?.locked) return;

  const s = await state();
  addEvent(s, "worker_heartbeat", "AI2/AI3", "High-capacity AI2 and AI3 worker cycle started", {
    thinkCycles: THINK_CYCLES
  });

  const facts = {
    bots: s.bots.filter(b => b.status === "active").map(b => b.name).join(",") || "none",
    projects: s.projects.map(p => p.name).join(",") || "none"
  };

  try {
    const agents = ["AI2", "AI3"];
    for (let cycle = 1; cycle <= THINK_CYCLES; cycle++) {
      const decisions = await Promise.all(
        agents.map(agent => agentDecision(agent, facts, cycle))
      );

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const d = decisions[i];

        addEvent(s, "ai_cycle", agent, agent + " completed high-capacity thinking cycle", {
          cycle,
          decision: d
        });

        mergeProposal(s, agent, d, cycle);

        if (
          d.shouldAddBot &&
          d.botName &&
          d.botRole &&
          !s.bots.some(
            b => b.status === "active" && b.name.toLowerCase() === String(d.botName).toLowerCase()
          )
        ) {
          const bot = {
            id: randomUUID(),
            key: "auto-" + randomUUID(),
            name: d.botName,
            role: d.botRole,
            reason: d.reason || agent + " decision",
            status: "active",
            createdAt: new Date().toISOString(),
            createdBy: agent
          };
          s.bots.unshift(bot);
          const ev = addEvent(s, "bot_created", agent, agent + " added bot: " + bot.name, { bot });
          const delivered = await notify(agent + " added bot: " + bot.name, { bot, event: ev });
          s.alerts = [
            {
              id: randomUUID(),
              at: new Date().toISOString(),
              detail: agent + " added bot: " + bot.name,
              data: { bot, event: ev },
              delivered
            },
            ...(s.alerts || [])
          ].slice(0, 1000);
        }

        if (d.upgradeProposal) {
          const ev = addEvent(s, "upgrade_proposed", agent, agent + " proposed an upgrade", {
            proposal: d.upgradeProposal,
            cycle
          });
          const delivered = await notify(agent + " proposed an upgrade", {
            proposal: d.upgradeProposal,
            event: ev
          });
          s.alerts = [
            {
              id: randomUUID(),
              at: new Date().toISOString(),
              detail: agent + " proposed an upgrade; owner notification recorded.",
              data: { proposal: d.upgradeProposal, event: ev },
              delivered
            },
            ...(s.alerts || [])
          ].slice(0, 1000);
        }
      }
    }
  } catch (e) {
    addEvent(s, "worker_error", "AI2/AI3", e.message);
    const delivered = await notify("AI2/AI3 worker error", { error: e.message });
    s.alerts = [
      {
        id: randomUUID(),
        at: new Date().toISOString(),
        detail: "AI2/AI3 worker error",
        data: { error: e.message },
        delivered
      },
      ...(s.alerts || [])
    ].slice(0, 1000);
  }

  await save(s);
  await pool.query("SELECT pg_advisory_unlock(81723651)");
}

async function runForever() {
  while (true) {
    const started = Date.now();
    try {
      await tick();
    } catch (e) {
      console.error("AI2/AI3 cycle failure:", e);
    }
    const elapsed = Date.now() - started;
    const waitMs = Math.max(1000, INTERVAL_MS - elapsed);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

await runForever();
