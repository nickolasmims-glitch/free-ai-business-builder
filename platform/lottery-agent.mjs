import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR=process.env.OWNER_CLOUD_DATA_DIR||path.resolve("platform/data");
const STATE_FILE=path.join(DATA_DIR,"lottery-state.json");
const BASE="https://www.texaslottery.com/export/sites/lottery/Games/Pick_3";
const SOURCES={morning:BASE+"/morning_pre_test_results.html",day:BASE+"/day_pre_test_results.html",evening:BASE+"/evening_pre_test_results.html",night:BASE+"/night_pre_test_results.html",official:BASE+"/index.html"};
const INTERVAL=Math.max(60_000,Number(process.env.LOTTERY_AGENT_INTERVAL_MS||300_000));

async function load(){await fs.mkdir(DATA_DIR,{recursive:true});try{return JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{return {status:"STARTING",scope:"Texas Pick 3 only",ownerOnly:true,pretests:[],draws:[],predictions:[]}}}
async function save(s){const tmp=STATE_FILE+".tmp";s.updatedAt=new Date().toISOString();await fs.writeFile(tmp,JSON.stringify(s,null,2));await fs.rename(tmp,STATE_FILE)}
async function get(url){const r=await fetch(url,{headers:{"user-agent":"OwnerCloud-Texas-Pick3-Analyst/1.0"}});if(!r.ok)throw new Error("SOURCE_HTTP_"+r.status);return r.text()}
function parsePre(text){return [...text.matchAll(/(\d{2}\/\d{2}\/\d{4})[^\n]*?([0-9])\s*-\s*([0-9])\s*-\s*([0-9])/g)].map(m=>({date:m[1],number:m.slice(2).join(""),type:"pretest"}))}
function parseOfficial(text){return [...text.matchAll(/(\d{2}\/\d{2}\/\d{4})[^\n]*?([0-9])\s*-\s*([0-9])\s*-\s*([0-9])/g)].map(m=>({date:m[1],number:m.slice(2).join(""),type:"official"}))}
function analyze(pre,draws){
 const data=[...pre,...draws].map(x=>x.number).filter(x=>/^\d{3}$/.test(x)).slice(-500);
 const pos=[{},{},{}], exact={};
 for(const n of data){n.split("").forEach((d,i)=>pos[i][d]=(pos[i][d]||0)+1);exact[n]=(exact[n]||0)+1}
 const rank=i=>Object.entries(pos[i]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 const out=[];for(const a of rank(0).slice(0,5))for(const b of rank(1).slice(0,5))for(const c of rank(2).slice(0,5)){const n=a+b+c;out.push({number:n,score:(pos[0][a]||0)+(pos[1][b]||0)+(pos[2][c]||0),historicalHits:exact[n]||0})}
 return {sampleSize:data.length,positionHotDigits:[0,1,2].map(rank),candidates:out.sort((a,b)=>b.score-a.score||b.historicalHits-a.historicalHits).slice(0,20)}
}
async function cycle(){
 const pre=[];for(const k of ["morning","day","evening","night"]){try{pre.push(...parsePre(await get(SOURCES[k])))}catch{}}
 let draws=[];try{draws=parseOfficial(await get(SOURCES.official))}catch{}
 const s=await load();s.status="RUNNING";s.scope="Texas Lottery Pick 3 only";s.ownerOnly=true;s.pretests=pre.slice(-1000);s.draws=draws.slice(-500);s.predictions=[{generatedAt:new Date().toISOString(),method:"pre-test + official Pick 3 positional frequency and recurrence analysis",...analyze(s.pretests,s.draws)}];s.notes=["Owner-only reporting.","No wagering, purchasing, payment, or financial actions.","Candidates are statistical pattern outputs, not guaranteed winning numbers."];await save(s);console.log(JSON.stringify({service:"TexasPick3PatternAnalyst",status:"UPDATED",top:s.predictions[0].candidates.slice(0,5)}))
}
console.log(JSON.stringify({service:"TexasPick3PatternAnalyst",status:"STARTING",scope:"Texas Lottery Pick 3 only",intervalMs:INTERVAL}));
while(true){try{await cycle()}catch(e){const s=await load();s.status="ERROR";s.error=String(e).slice(0,1000);await save(s);console.error(JSON.stringify({service:"TexasPick3PatternAnalyst",status:"ERROR",error:String(e)}))}await new Promise(r=>setTimeout(r,INTERVAL))}
