import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { Pool } from "pg";
import { ensureCoreAgents } from "./agents.mjs";
import { lotterySignal } from "./lottery.mjs";
import { paymentStatus } from "./payments.mjs";
import { createHash } from "node:crypto";

const PORT = Number(process.env.PORT || 8080);
const DB_URL = process.env.DATABASE_URL || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";
const AUTO_BOT_MODE = process.env.AUTO_BOT_MODE !== "false";
const OWNER_ACCESS_TOKEN = process.env.OWNER_ACCESS_TOKEN || "";
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1048576);
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 120);
const rateBuckets = new Map();
const SESSION_COOKIE = "gateway_owner";
const DATA_DIR = new URL("./data/", import.meta.url).pathname;
const DATA_FILE = new URL("./data/state.json", import.meta.url).pathname;

let pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } }) : null;
let state = { projects: [], bots: [], events: [], alerts: [] };

async function loadState() {
  if (pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS gateway_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const r = await pool.query("SELECT value FROM gateway_state WHERE key='state'");
    if (r.rows[0]) state = r.rows[0].value;
    else await saveState();
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) state = JSON.parse(await readFile(DATA_FILE, "utf8"));
}
async function saveState() {
  if (pool) {
    await pool.query(
      "INSERT INTO gateway_state(key,value) VALUES('state',$1) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()",
      [JSON.stringify(state)]
    );
  } else {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(state, null, 2));
  }
}

function audit(type, actor, detail, data = {}) {
  const prev = state.events?.[0]?.hash || "";
  const hash = createHash("sha256").update(JSON.stringify({ type, actor, detail, data, prev })).digest("hex");
  const event = { id: randomUUID(), at: new Date().toISOString(), type, actor, detail, data, prev, hash };
  state.events.unshift(event);
  state.events = state.events.slice(0, 5000);
  return event;
}

async function alert(detail, data = {}) {
  const item = { id: randomUUID(), at: new Date().toISOString(), detail, data, delivered: false };
  state.alerts.unshift(item);
  state.alerts = state.alerts.slice(0, 1000);
  if (ALERT_WEBHOOK_URL) {
    try {
      const r = await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gateway: "Customer Gateway", alert: item })
      });
      item.delivered = r.ok;
    } catch {}
  }
  audit("alert", "gateway", detail, data);
  await saveState();
  return item;
}

function json(res, status, body) {
  const out = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(out);
}
async function body(req) {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("request body too large");
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY_BYTES) throw new Error("request body too large"); chunks.push(chunk); }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map(x => {
    const i = x.indexOf("="); return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1).trim())];
  }));
}
function isAuthorized(req) {
  if (!OWNER_ACCESS_TOKEN) return false;
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cookie = parseCookies(req)[SESSION_COOKIE] || "";
  return bearer === OWNER_ACCESS_TOKEN || cookie === OWNER_ACCESS_TOKEN;
}
function allowRate(req, res) {
  const key = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now(); const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= 60000) { bucket.start = now; bucket.count = 0; }
  bucket.count++; rateBuckets.set(key, bucket);
  if (bucket.count > RATE_LIMIT_PER_MIN) { json(res, 429, { error: "rate limit exceeded" }); return false; }
  if (rateBuckets.size > 10000) rateBuckets.clear();
  return true;
}

function requireOwner(req, res) {
  if (!OWNER_ACCESS_TOKEN) {
    json(res, 503, { error: "Owner authentication is not configured. Set OWNER_ACCESS_TOKEN before exposing the gateway." });
    return false;
  }
  if (!isAuthorized(req)) {
    res.setHeader("www-authenticate", "Bearer");
    json(res, 401, { error: "Owner authentication required" });
    return false;
  }
  return true;
}

function publicState() {
  return {
    projects: state.projects,
    bots: state.bots,
    events: state.events.slice(0, 100),
    alerts: state.alerts.slice(0, 100),
    mode: AUTO_BOT_MODE ? "autonomous-visible" : "manual",
    persistence: pool ? "postgres" : "local-dev-only"
  };
}

async function runGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is not configured");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed");
  return data;
}

async function createBot(name, role, reason, actor = "gateway") {
  const bot = { id: randomUUID(), name, role, reason, status: "active", createdAt: new Date().toISOString(), createdBy: actor };
  state.bots.unshift(bot);
  audit("bot_created", actor, `Bot created: ${name}`, { botId: bot.id, reason });
  await alert(`New bot created: ${name}`, { bot });
  await saveState();
  return bot;
}

async function route(req, res) {
  const requestId = randomUUID();
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  if (!allowRate(req, res)) return;
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && u.pathname === "/api/health") {
    let dbOk = !pool;
    if (pool) { try { await pool.query("SELECT 1"); dbOk = true; } catch { dbOk = false; } }
    const lastHeartbeat = state.events.find(e => e.type === "worker_heartbeat");
    return json(res, dbOk && Boolean(OWNER_ACCESS_TOKEN) ? 200 : 503, { ok: dbOk, service: "customer-gateway", time: new Date().toISOString(), persistence: pool ? "postgres" : "local-dev-only", aiConfigured: Boolean(GEMINI_KEY), ownerAuthConfigured: Boolean(OWNER_ACCESS_TOKEN), workerHeartbeat: lastHeartbeat?.at || null });
  }
  if (req.method === "GET" && u.pathname === "/api/ready") {
    const ready = Boolean(pool && GEMINI_KEY && OWNER_ACCESS_TOKEN);
    return json(res, ready ? 200 : 503, { ready, checks: { postgres: Boolean(pool), gemini: Boolean(GEMINI_KEY), ownerAuth: Boolean(OWNER_ACCESS_TOKEN) } });
  }
  if (req.method === "POST" && u.pathname === "/api/auth") {
    const b = await body(req);
    if (!OWNER_ACCESS_TOKEN) return json(res, 503, { error: "Owner authentication is not configured" });
    if (b.token !== OWNER_ACCESS_TOKEN) return json(res, 401, { error: "Invalid owner token" });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("set-cookie", SESSION_COOKIE + "=" + encodeURIComponent(OWNER_ACCESS_TOKEN) + "; HttpOnly; SameSite=Strict; Path=/" + secure);
    return json(res, 200, { ok: true, role: "owner" });
  }
  if (req.method === "GET" && u.pathname === "/api/auth") return json(res, 200, { authenticated: isAuthorized(req) });
  if (u.pathname.startsWith("/api/") && u.pathname !== "/api/health" && u.pathname !== "/api/auth") {
    if (!requireOwner(req, res)) return;
  }
  if (req.method === "GET" && u.pathname === "/api/state") return json(res, 200, publicState());
  if (req.method === "GET" && u.pathname === "/api/metrics") {
    const activeBots = state.bots.filter(b => b.status === "active").length;
    const errors = state.events.filter(e => e.type === "error" || e.type === "worker_error").length;
    return json(res, 200, { uptimeSeconds: Math.floor(process.uptime()), projects: state.projects.length, activeBots, events: state.events.length, alerts: state.alerts.length, errors, requestId });
  }
  if (req.method === "GET" && u.pathname === "/api/payments/status") return json(res, 200, paymentStatus());
  if (req.method === "GET" && u.pathname === "/api/lottery/signals") {
    const games = ["Pick 3", "Powerball", "Mega Millions"];
    return json(res, 200, { signals: games.map(g => lotterySignal(g, [])), methodology: "1-10 research signal only; not a winning probability." });
  }

  if (req.method === "POST" && u.pathname === "/api/lottery/signals") {
    const b = await body(req);
    if (!b.game) return json(res, 400, { error: "game is required" });
    const result = lotterySignal(b.game, b.recentNumbers || []);
    audit("lottery_signal", "lotterycloud", "Research signal generated", { result });
    await saveState();
    return json(res, 200, result);
  }

  if (req.method === "POST" && u.pathname === "/api/projects") {
    const b = await body(req);
    if (!b.name) return json(res, 400, { error: "name is required" });
    const project = { id: randomUUID(), name: b.name, description: b.description || "", site: { pages: [{ path: "/", title: b.name, content: "" }] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.projects.unshift(project);
    audit("project_created", "customer", `Project created: ${project.name}`, { projectId: project.id });
    await saveState();
    return json(res, 201, project);
  }

  if (req.method === "POST" && u.pathname === "/api/builder/generate") {
    const b = await body(req);
    if (!b.projectId || !b.instruction) return json(res, 400, { error: "projectId and instruction are required" });
    const project = state.projects.find(x => x.id === b.projectId);
    if (!project) return json(res, 404, { error: "project not found" });
    const prompt = `You are the website-builder intelligence inside a customer-owned gateway. Generate a concise production website specification for this project. Project: ${project.name}. User request: ${b.instruction}. Return JSON with pages, copy, components, SEO, accessibility, and nextActions. Do not claim actions were executed unless they are in this request.`;
    const ai = await runGemini(prompt);
    const text = ai?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    project.site.lastGeneration = { instruction: b.instruction, result: text, at: new Date().toISOString() };
    project.updatedAt = new Date().toISOString();
    audit("site_generation", "ai-builder", "Website specification generated", { projectId: project.id });
    await saveState();
    return json(res, 200, { project, ai: text });
  }

  if (req.method === "POST" && u.pathname === "/api/ai/plan") {
    const b = await body(req);
    if (!b.goal) return json(res, 400, { error: "goal is required" });
    const ai = await runGemini(`Act as the gateway's multi-agent planner. Goal: ${b.goal}. Identify concrete tasks, useful bots, dependencies, risks, and measurable completion evidence. You may recommend adding bots, but every bot creation or upgrade must be written to the immutable audit stream and alerted to the owner. Do not claim completion for unexecuted work.`);
    const text = ai?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    audit("ai_plan", "orchestrator", "AI plan generated", { goal: b.goal });
    await saveState();
    return json(res, 200, { plan: text });
  }

  if (req.method === "POST" && u.pathname === "/api/bots") {
    const b = await body(req);
    if (!b.name || !b.role) return json(res, 400, { error: "name and role are required" });
    return json(res, 201, await createBot(b.name, b.role, b.reason || "Owner requested", "customer"));
  }

  if (req.method === "DELETE" && u.pathname.startsWith("/api/bots/")) {
    const id = u.pathname.split("/").pop();
    const bot = state.bots.find(x => x.id === id);
    if (!bot) return json(res, 404, { error: "bot not found" });
    bot.status = "deleted";
    bot.deletedAt = new Date().toISOString();
    audit("bot_deleted", "customer", `Bot deleted: ${bot.name}`, { botId: id });
    await alert(`Bot deleted: ${bot.name}`, { botId: id });
    await saveState();
    return json(res, 200, { ok: true, bot });
  }

  if (req.method === "POST" && u.pathname === "/api/bots/auto-evaluate") {
    if (!AUTO_BOT_MODE) return json(res, 403, { error: "autonomous mode is disabled" });
    const b = await body(req);
    const ai = await runGemini(`Review this operational goal and decide whether an additional specialized bot would materially improve execution. Goal: ${b.goal || "Improve customer business operations"}. Respond as JSON with shouldAddBot, name, role, reason. Never recommend hiding the action.`);
    const raw = ai?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let decision;
    try { decision = JSON.parse(raw.replace(/^```json|^```$/g, "").trim()); } catch { decision = { shouldAddBot: false, reason: "Planner returned non-JSON output", raw }; }
    if (decision.shouldAddBot && decision.name && decision.role) {
      const bot = await createBot(decision.name, decision.role, decision.reason || "AI operational evaluation", "orchestrator");
      return json(res, 200, { decision, bot });
    }
    audit("bot_evaluation", "orchestrator", "No bot added", { decision });
    await saveState();
    return json(res, 200, { decision });
  }

  if (req.method === "POST" && u.pathname === "/api/upgrade") {
    const b = await body(req);
    const event = audit("upgrade_proposed", "orchestrator", b.reason || "Upgrade proposed", { target: b.target || "gateway", changes: b.changes || [] });
    await alert("AI proposed an upgrade; owner was notified.", event);
    await saveState();
    return json(res, 202, { status: "proposed", event, message: "The gateway records and alerts every upgrade decision. Destructive/security-sensitive changes require owner approval." });
  }

  if (req.method === "GET") {
    let file = u.pathname === "/" ? "/index.html" : u.pathname;
    if (file.includes("..")) return json(res, 400, { error: "invalid path" });
    try {
      const content = await readFile(new URL("./public" + file, import.meta.url));
      const type = file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "application/octet-stream";
      res.writeHead(200, { "content-type": type });
      return res.end(content);
    } catch {}
  }
  return json(res, 404, { error: "not found" });
}

await loadState();
ensureCoreAgents(state);
audit("gateway_started", "system", "Customer Gateway started with AI2 and AI3 core agents");
await saveState();
http.createServer((req, res) => {
  const requestId = randomUUID();
  route(req, res).catch(async e => {
    try { audit("error", "gateway", e.message, { requestId }); await saveState(); } catch {}
    if (!res.headersSent) res.setHeader("x-request-id", requestId);
    if (!res.writableEnded) json(res, 500, { error: e.message, requestId });
  });
}).listen(PORT, () => console.log(`Customer Gateway listening on :${PORT}`));
