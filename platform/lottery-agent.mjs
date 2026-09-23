import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.OWNER_CLOUD_DATA_DIR || path.resolve("platform/data");
const STATE_FILE = path.join(DATA_DIR, "lottery-state.json");
const SOURCE = "https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/Winning_Numbers/";
const INTERVAL = Math.max(60_000, Number(process.env.LOTTERY_AGENT_INTERVAL_MS || 900_000));

async function load(){ await fs.mkdir(DATA_DIR,{recursive:true}); try{return JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{return {source:SOURCE,updatedAt:null,draws:[],predictions:[]}}}
async function save(s){const tmp=STATE_FILE+".tmp";await fs.writeFile(tmp,JSON.stringify(s,null,2));await fs.rename(tmp,STATE_FILE)}
function parse(text){const rows=[];const re=/(\d{2}\/\d{2}\/\d{4})\s+\|\s+([0-9])\s*-\s*([0-9])\s*-\s*([0-9])/g;let m;while((m=re.exec(text)))rows.push({date:m[1],number:m[2]+m[3]+m[4]});return rows}
function analyze(draws){const recent=draws.slice(0,120),counts=[{},{},{}];for(const d of recent)d.number.split("").forEach((n,i)=>counts[i][n]=(counts[i][n]||0)+1);const hot=counts.map(c=>Object.entries(c).sort((a,b)=>b[1]-a[1]));const candidates=[];for(const a of hot[0].slice(0,4))for(const b of hot[1].slice(0,4))for(const c of hot[2].slice(0,4))candidates.push(a[0]+b[0]+c[0]);return {sampleSize:recent.length,positionHotDigits:hot.map(x=>x.slice(0,5).map(y=>y[0])),candidates:candidates.slice(0,20)}}
async function cycle(){const r=await fetch(SOURCE,{headers:{"user-agent":"OwnerCloud-LotteryObserver/1.0"}});if(!r.ok)throw new Error("LOTTERY_SOURCE_HTTP_"+r.status);const draws=parse(await r.text());if(!draws.length)throw new Error("LOTTERY_SOURCE_PARSE_FAILED");const s=await load();s.updatedAt=new Date().toISOString();s.draws=draws.slice(0,500);s.predictions=[{generatedAt:s.updatedAt,method:"recent positional frequency scan",...analyze(draws)}];s.notes=["Statistical candidates only; no guarantee of future results.","Owner-only reporting. No wagering, purchasing, payment, or financial actions."];await save(s);console.log(JSON.stringify({service:"LotteryObserver",status:"UPDATED",prediction:s.predictions[0]}))}
while(true){try{await cycle()}catch(e){console.error(JSON.stringify({service:"LotteryObserver",status:"ERROR",error:String(e)}))}await new Promise(r=>setTimeout(r,INTERVAL))}
