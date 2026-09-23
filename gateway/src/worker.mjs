import {loadStore,setSignals,addEvent} from "./store.mjs";
import {buildLotterySignals} from "./lottery.mjs";
import {runAgent} from "./ai.mjs";
await loadStore();let busy2=false,busy3=false;
async function tick(){await setSignals(buildLotterySignals());if(!busy2){busy2=true;try{await runAgent("AI2")}catch(e){console.error("AI2",e)}finally{busy2=false}}if(!busy3){busy3=true;try{await runAgent("AI3")}catch(e){console.error("AI3",e)}finally{busy3=false}}await addEvent({type:"supervisor_tick"});}
await tick();setInterval(tick,Math.max(15000,Number(process.env.AI2_INTERVAL_MS||60000)));console.log("Customer Gateway worker online: AI2 + AI3");
