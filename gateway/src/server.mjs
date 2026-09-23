import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {loadStore,snapshot,addEvent} from "./store.mjs";
import {buildLotterySignals} from "./lottery.mjs";
import {runAgent} from "./ai.mjs";
import "./worker.mjs";
await loadStore();
const port=Number(process.env.PORT||8080),publicDir=path.resolve("./public");
async function body(req){let b="";for await(const c of req)b+=c;return b}
function json(res,status,data){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(data))}
async function handler(req,res){
 const u=new URL(req.url,"http://"+req.headers.host);
 if(req.method==="GET"&&u.pathname==="/health")return json(res,200,{ok:true,service:"customer-gateway",time:new Date().toISOString()});
 if(req.method==="GET"&&u.pathname==="/api/status"){const s=snapshot();return json(res,200,{ok:true,service:"customer-gateway",workers:s.workers,signals:s.signals,recentJobs:s.jobs.slice(0,20),recentEvents:s.events.slice(0,20)})}
 if(req.method==="GET"&&u.pathname==="/api/lottery")return json(res,200,{ok:true,signals:buildLotterySignals()});
 if(req.method==="POST"&&u.pathname==="/api/agent/run"){const b=JSON.parse(await body(req)||"{}");if(!["AI2","AI3"].includes(b.agent))return json(res,400,{ok:false,error:"agent must be AI2 or AI3"});return json(res,202,await runAgent(b.agent))}
 if(req.method==="POST"&&u.pathname==="/api/stripe/webhook"){const raw=await body(req),sig=req.headers["stripe-signature"]||"";if(process.env.STRIPE_WEBHOOK_SECRET){const t=sig.match(/(?:^|,)t=(\d+)/)?.[1],v=sig.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1];if(!t||!v)return json(res,400,{ok:false,error:"invalid stripe signature"});const expected=crypto.createHmac("sha256",process.env.STRIPE_WEBHOOK_SECRET).update(t+"."+raw).digest("hex");if(expected!==v)return json(res,400,{ok:false,error:"signature verification failed"})}let event;try{event=JSON.parse(raw)}catch{return json(res,400,{ok:false,error:"invalid json"})}await addEvent({type:"stripe_webhook",stripeType:event.type||"unknown"});return json(res,200,{received:true})}
 if(req.method==="GET"){const file=u.pathname==="/"?"index.html":u.pathname.replace(/^\//,"");try{const data=await fs.readFile(path.join(publicDir,file));res.writeHead(200,{"content-type":file.endsWith(".html")?"text/html":"text/plain"});return res.end(data)}catch{}}
 return json(res,404,{ok:false,error:"not found"});
}
http.createServer((req,res)=>handler(req,res).catch(e=>json(res,500,{ok:false,error:e.message}))).listen(port,()=>console.log("Customer Gateway listening on "+port));