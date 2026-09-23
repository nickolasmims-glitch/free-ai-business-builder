import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const file=path.resolve(process.env.DATA_FILE||"./gateway-data.json");
let state={jobs:[],events:[],signals:{},workers:{ai2:{runs:0,lastRun:null,lastError:null},ai3:{runs:0,lastRun:null,lastError:null}}};
let loaded=false;
export async function loadStore(){if(loaded)return;try{state=JSON.parse(await fs.readFile(file,"utf8"));}catch{}loaded=true;}
async function save(){await fs.writeFile(file,JSON.stringify(state,null,2),"utf8");}
export function snapshot(){return structuredClone(state);}
export async function recordWorker(name,ok,error=null){state.workers[name]??={runs:0,lastRun:null,lastError:null};state.workers[name].runs++;state.workers[name].lastRun=new Date().toISOString();state.workers[name].lastError=error;await save();}
export async function addJob(job){state.jobs.unshift({...job,id:crypto.randomUUID(),createdAt:new Date().toISOString()});state.jobs=state.jobs.slice(0,500);await save();}
export async function addEvent(event){state.events.unshift({...event,at:new Date().toISOString()});state.events=state.events.slice(0,1000);await save();}
export async function setSignals(signals){state.signals=signals;await save();}
