import {loadStore,setSignals,addEvent} from "./store.mjs";
import {buildLotterySignals} from "./lottery.mjs";
import {runAgent} from "./ai.mjs";
await loadStore();let busy=false;
async function tick(){
 await setSignals(buildLotterySignals());
 if(!busy){busy=true;try{for(const agent of ["AI1","AI2","AI3"]){try{await runAgent(agent)}catch(e){console.error(agent,e)}}}finally{busy=false}}
 await addEvent({type:"supervisor_tick"});
}
await tick();setInterval(tick,Math.max(15000,Number(process.env.AI2_INTERVAL_MS||60000)));
console.log("Customer Gateway supervisor online: AI1 + AI2 + AI3");
