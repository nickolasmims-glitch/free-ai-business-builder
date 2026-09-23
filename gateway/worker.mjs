import { Pool } from "pg";
import { randomUUID, createHash } from "node:crypto";

const DB_URL = process.env.DATABASE_URL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const INTERVAL_MS = Number(process.env.AGENT_INTERVAL_MS || 300000);

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
async function tick() {
  const s = await state();
  addEvent(s,"worker_heartbeat","AI2/AI3","AI2 and AI3 worker cycle started");
  const prompt = `You are the combined planning layer for AI2 (execution engineering) and AI3 (research/growth). Review these current gateway facts: active bots=${s.bots.filter(b=>b.status==="active").map(b=>b.name).join(",")||"none"}; projects=${s.projects.map(p=>p.name).join(",")||"none"}. Return JSON with fields: priority, shouldAddBot, botName, botRole, reason, upgradeProposal. Do not claim that work was completed. Never hide or suppress actions.`;
  try {
    const raw = await gemini(prompt);
    let d; try { d=JSON.parse(raw.replace(/^\`\`\`json|^\`\`\`$/g,"").trim()); } catch { d={priority:"review",shouldAddBot:false,reason:"Non-JSON planner output",raw}; }
    addEvent(s,"ai_cycle","AI2/AI3","AI2/AI3 completed a planning cycle",{decision:d});
    if(d.shouldAddBot && d.botName && d.botRole){
      const bot={id:randomUUID(),key:"auto-"+randomUUID(),name:d.botName,role:d.botRole,reason:d.reason||"AI2/AI3 decision",status:"active",createdAt:new Date().toISOString(),createdBy:"AI2/AI3"};
      s.bots.unshift(bot);
      const ev=addEvent(s,"bot_created","AI2/AI3",`AI2/AI3 added bot: ${bot.name}`,{bot});
      s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:`AI2/AI3 added bot: ${bot.name}`,data:{bot,event:ev},delivered:false},...(s.alerts||[])].slice(0,1000);
    }
    if(d.upgradeProposal){
      const ev=addEvent(s,"upgrade_proposed","AI2/AI3","AI2/AI3 proposed an upgrade",{proposal:d.upgradeProposal});
      s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:"AI2/AI3 proposed an upgrade; owner notification recorded.",data:{proposal:d.upgradeProposal,event:ev},delivered:false},...(s.alerts||[])].slice(0,1000);
    }
  } catch(e) {
    addEvent(s,"worker_error","AI2/AI3",e.message);
    s.alerts=[{id:randomUUID(),at:new Date().toISOString(),detail:"AI2/AI3 worker error",data:{error:e.message},delivered:false},...(s.alerts||[])].slice(0,1000);
  }
  await save(s);
}
await tick();
setInterval(()=>tick().catch(e=>console.error(e)),INTERVAL_MS);
