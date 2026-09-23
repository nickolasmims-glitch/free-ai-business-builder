import { Pool } from "pg";
import { randomUUID, createHash } from "node:crypto";

const DB_URL = process.env.DATABASE_URL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const INTERVAL_MS = Number(process.env.AGENT_INTERVAL_MS || 300000);
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";

if (!DB_URL) throw new Error("DATABASE_URL is required for autonomous workers");
if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is required for autonomous workers");

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function state() {
  await pool.query("CREATE TABLE IF NOT EXISTS gateway_state (key TEXT PRIMARY KEY,value JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const r = await pool.query("SELECT value FROM gateway_state WHERE key='state'");
  return r.rows[0]?.value || { projects: [], bots: [], events: [], alerts: [] };
}
async function save(s) {
  await pool.query("INSERT INTO gateway_state(key,value) VALUES('state',$1) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()", [JSON.stringify(s)]);
}
function addEvent(s, type, actor, detail, data={}) {
  const prev = s.events?.[0]?.hash || "";
  const base = JSON.stringify({ type, actor, detail, data, prev });
  const hash = createHash("sha256").update(base).digest("hex");
  const event = { id: randomUUID(), at: new Date().toISOString(), type, actor, detail, data, prev, hash };
  s.events = [event, ...(s.events || [])].slice(0,5000);
  return event;
}
async function gemini(prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],tools:[{google_search:{}}]})
  });
  const d=await r.json(); if(!r.ok) throw new Error(d?.error?.message||"Gemini worker call failed");
  return d?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
}
async function notify(detail, data) {
  if (!ALERT_WEBHOOK_URL) return false;
  try { const r = await fetch(ALERT_WEBHOOK_URL, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({gateway:"Customer Gateway",alert:{detail,data,at:new Date().toISOString()}}) }); return r.ok; } catch { return false; }
}
function parseDecision(raw) {
  try { return JSON.parse(raw.replace(/^```json|^```$/g,"").trim()); } catch { return { shouldAddBot:false, priority:"review", reason:"Planner returned non-JSON output", raw }; }
}
async function agentDecision(agent, facts) {
  const role = agent === "AI2" ? "Execution Engineer" : "Research & Growth Engineer";
  const search = agent === "AI3" ? " Use Google Search when useful." : "";
  const prompt = "You are " + agent + ", the " + role + "." + search + " Review gateway facts: active bots=" + facts.bots + "; projects=" + facts.projects + ". Identify the highest-value task, whether a specialized bot is needed, and any upgrade proposal. Return JSON: priority, shouldAddBot, botName, botRole, reason, upgradeProposal. Do not claim unexecuted work as complete.";
  return parseDecision(await gemini(prompt));
}
async function tick() {
  const lock = await pool.query("SELECT pg_try_advisory_lock(81723651) AS locked");
  if (!lock.rows[0]?.locked) return;
  const s = await state();
  addEvent(s,"worker_heartbeat","AI2/AI3","AI2 and AI3 worker cycle started");
  const facts = { bots:s.bots.filter(b=>b.status==="active").map(b=>b.name).join(",")||"none", projects:s.projects.map(p=>p.name).join(",")||"none" };
  try {
    for (const agent of ["AI2","AI3"]) {
      const d = await agentDecision(agent, facts);
      addEvent(s,"ai_cycle",agent,agent+" completed a planning cycle",{decision:d});
      if (d.shouldAddBot && d.botName && d.botRole && !s.bots.some(b=>b.status==="active" && b.name.toLowerCase()===String(d.botName).toLowerCase())) {
        const bot={id:randomUUID(),key:"auto-"+randomUUID(),name:d.botName,role:d.botRole,reason:d.reason||agent+" decision",status:"active",createdAt:new Date().toISOString(),createdBy:agent};
        s.bots.unshift(bot);
        const ev=addEvent(s,"bot_created",agent,agent+" added bot: "+bot.name,{bot});
        const delivered=await notify(agent+" added bot: "+bot.name,{bot,event:ev});
        s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:agent+" added bot: "+bot.name,data:{bot,event:ev},delivered},...(s.alerts||[])].slice(0,1000);
      }
      if (d.upgradeProposal) {
        const ev=addEvent(s,"upgrade_proposed",agent,agent+" proposed an upgrade",{proposal:d.upgradeProposal});
        const delivered=await notify(agent+" proposed an upgrade",{proposal:d.upgradeProposal,event:ev});
        s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:agent+" proposed an upgrade; owner notification recorded.",data:{proposal:d.upgradeProposal,event:ev},delivered},...(s.alerts||[])].slice(0,1000);
      }
    }
  } catch(e) {
    addEvent(s,"worker_error","AI2/AI3",e.message);
    const delivered=await notify("AI2/AI3 worker error",{error:e.message});
    s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:"AI2/AI3 worker error",data:{error:e.message},delivered},...(s.alerts||[])].slice(0,1000);
  }
  await save(s);
}
await tick();
setInterval(()=>tick().catch(e=>console.error(e)),INTERVAL_MS);
