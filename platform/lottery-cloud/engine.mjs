import fs from "node:fs/promises";
import path from "node:path";

const DIR=process.env.LOTTERY_CLOUD_DATA_DIR||path.resolve("platform/data/lottery-cloud");
const FILE=path.join(DIR,"state.json");
const RUNS=Math.max(1000,Number(process.env.LOTTERY_SIMULATION_RUNS||10000));
const INTERVAL=Math.max(60000,Number(process.env.LOTTERY_CLOUD_INTERVAL_MS||300000));

const GAMES={
  texas_pick_3:{name:"Texas Pick 3",kind:"digits",range:10,width:3},
  texas_lowball:{name:"Texas Lowball",kind:"digits",range:10,width:4},
  powerball:{name:"Powerball",kind:"multi",whiteRange:69,whiteWidth:5,specialName:"Powerball",specialRange:26},
  mega_millions:{name:"Mega Millions",kind:"multi",whiteRange:70,whiteWidth:5,specialName:"Mega Ball",specialRange:24}
};

async function load(){await fs.mkdir(DIR,{recursive:true});try{return JSON.parse(await fs.readFile(FILE,"utf8"))}catch{return {entity:"LotteryCloud",status:"STARTING",games:{},runs:0}}}
async function save(s){s.updatedAt=new Date().toISOString();const t=FILE+".tmp";await fs.writeFile(t,JSON.stringify(s,null,2));await fs.rename(t,FILE)}
function rand(n){return Math.floor(Math.random()*n)}
function sampleUnique(range,width){const nums=new Set();while(nums.size<width)nums.add(1+rand(range));return [...nums].sort((a,b)=>a-b)}
function sample(g){if(g.kind==="digits")return Array.from({length:g.width},()=>rand(g.range)).join("");return {white:sampleUnique(g.whiteRange,g.whiteWidth),special:1+rand(g.specialRange)}}
function simulate(g){
  const counts=new Map();
  for(let i=0;i<RUNS;i++){const s=sample(g);const k=typeof s==="string"?s:s.white.join("-")+"+"+s.special;counts.set(k,(counts.get(k)||0)+1)}
  return [...counts].map(([candidate,frequency])=>({candidate,frequency,simulatedRate:frequency/RUNS})).sort((a,b)=>b.frequency-a.frequency).slice(0,20)
}
async function cycle(){
  const s=await load();s.status="RUNNING";s.independent=true;s.runs++;s.games={};
  for(const [id,g] of Object.entries(GAMES)){
    s.games[id]={name:g.name,simulationRuns:RUNS,ruleMatrix:g.kind==="multi"?{white:g.whiteWidth+" of "+g.whiteRange,special:g.specialName+" 1-"+g.specialRange}:{digits:g.width+" digits 0-9"},candidates:simulate(g),backtest:{status:"PENDING_REAL_DATA",note:"Candidate simulation alone does not demonstrate predictive advantage."}};
  }
  s.rules=["Owner-only reporting","No wagering or ticket purchasing","No financial actions","No control over AI2, AI3, Guardian, or business systems","Use public research only","Statistical outputs are not guaranteed winners"];
  await save(s);
  console.log(JSON.stringify({entity:"LotteryCloud",status:"UPDATED",runs:s.runs,simulationRunsPerGame:RUNS,games:Object.keys(GAMES)}))
}
console.log(JSON.stringify({entity:"LotteryCloud",status:"STARTING",independent:true,simulationRunsPerStrategy:RUNS,games:Object.keys(GAMES)}));
while(true){try{await cycle()}catch(e){const s=await load();s.status="ERROR";s.error=String(e).slice(0,1000);await save(s);console.error(JSON.stringify({entity:"LotteryCloud",status:"ERROR",error:String(e)}))}await new Promise(r=>setTimeout(r,INTERVAL))}