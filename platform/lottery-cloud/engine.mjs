import fs from "node:fs/promises";
import path from "node:path";

const DIR=process.env.LOTTERY_CLOUD_DATA_DIR||path.resolve("platform/data/lottery-cloud");
const FILE=path.join(DIR,"state.json");
const RUNS=Math.max(1000,Number(process.env.LOTTERY_SIMULATION_RUNS||10000));
const INTERVAL=Math.max(60000,Number(process.env.LOTTERY_CLOUD_INTERVAL_MS||300000));
const GAMES={
  texas_pick_3:{name:"Texas Pick 3",range:1000,width:3},
  texas_lowball:{name:"Texas Lowball",range:10,width:1},
  mega_millions:{name:"Mega Millions",range:70,width:5}
};
async function load(){await fs.mkdir(DIR,{recursive:true});try{return JSON.parse(await fs.readFile(FILE,"utf8"))}catch{return {entity:"LotteryCloud",status:"STARTING",games:{},runs:0}}}
async function save(s){s.updatedAt=new Date().toISOString();const t=FILE+".tmp";await fs.writeFile(t,JSON.stringify(s,null,2));await fs.rename(t,FILE)}
function rand(n){return Math.floor(Math.random()*n)}
function sample(game){const nums=new Set();while(nums.size<game.width)nums.add(1+rand(game.range));return [...nums].sort((a,b)=>a-b)}
function simulate(game){const counts=new Map();for(let i=0;i<RUNS;i++){const k=sample(game).join("-");counts.set(k,(counts.get(k)||0)+1)}return [...counts].map(([candidate,frequency])=>({candidate,frequency,simulatedRate:frequency/RUNS})).sort((a,b)=>b.frequency-a.frequency).slice(0,20)}
async function cycle(){const s=await load();s.status="RUNNING";s.independent=true;s.runs++;s.games={};for(const [id,g] of Object.entries(GAMES)){s.games[id]={name:g.name,simulationRuns:RUNS,candidates:simulate(g),backtest:{status:"PENDING_REAL_DATA",note:"Candidate simulation alone does not demonstrate predictive advantage."}}}s.rules=["Owner-only reporting","No wagering or ticket purchasing","No financial actions","No control over AI2, AI3, Guardian, or business systems","Use public research only","Statistical outputs are not guaranteed winners"];await save(s);console.log(JSON.stringify({entity:"LotteryCloud",status:"UPDATED",runs:s.runs,simulationRunsPerGame:RUNS}))}
console.log(JSON.stringify({entity:"LotteryCloud",status:"STARTING",independent:true,simulationRunsPerStrategy:RUNS}));
while(true){try{await cycle()}catch(e){const s=await load();s.status="ERROR";s.error=String(e).slice(0,1000);await save(s);console.error(JSON.stringify({entity:"LotteryCloud",status:"ERROR",error:String(e)}))}await new Promise(r=>setTimeout(r,INTERVAL))}
