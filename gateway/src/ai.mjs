import {addJob,addEvent,recordWorker} from "./store.mjs";
function plan(agent){
 if(agent==="AI1")return{type:"orchestration",action:"coordinate-agents",output:"Coordinate AI2 research and AI3 operations while requiring runtime evidence before advancing work."};
 if(agent==="AI2")return{type:"research",action:"scan-business-opportunities",output:"Review queued business opportunities and record evidence before execution."};
 if(agent==="AI3")return{type:"operations",action:"verify-and-progress",output:"Check system health and advance only work supported by runtime evidence."};
 throw new Error("unknown agent");
}
export async function runAgent(agent){const p=plan(agent);try{await addJob({agent,status:"completed",...p,ranAt:new Date().toISOString()});await addEvent({type:"agent_run",agent,action:p.action});await recordWorker(agent.toLowerCase(),true);return{ok:true,agent,plan:p}}catch(e){await recordWorker(agent.toLowerCase(),false,e.message);throw e}}
