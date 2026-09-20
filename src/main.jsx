import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,Video,Scissors,TrendingUp,DollarSign,ShieldCheck,Play,Plus,Brain,ArrowLeft,CheckCircle2,Sparkles,Loader2} from "lucide-react";
import "./styles.css";

const modules=[
 {icon:Search,title:"Research Brain",text:"Find topics, gaps, audiences and commercial opportunities.",detail:"Use the local AI engine to turn a niche or problem into practical research opportunities."},
 {icon:Video,title:"Content Factory",text:"Turn research into original scripts, hooks, titles and production plans.",detail:"Generate original content concepts and production-ready starting points."},
 {icon:Scissors,title:"Repurpose Engine",text:"Create platform-specific versions from every core idea.",detail:"Turn one approved idea into YouTube, Shorts and TikTok-ready variants."},
 {icon:TrendingUp,title:"Growth Loop",text:"Measure results and feed what works back into research.",detail:"Track output and use performance data to prioritize the next cycle."},
 {icon:DollarSign,title:"Revenue Engine",text:"Track ads, affiliates, sponsors, products and leads against targets.",detail:"Verified revenue is the only revenue counted toward the $350,000 target."},
 {icon:ShieldCheck,title:"Trust & Compliance",text:"Flag copyright, reused-content, disclosure and policy risks before publishing.",detail:"Review risks before public publishing or monetization actions."}
];

function App(){
 const [ideas,setIdeas]=useState([]);
 const [topic,setTopic]=useState("");
 const [running,setRunning]=useState(false);
 const [active,setActive]=useState(null);
 const [aiStatus,setAiStatus]=useState("idle");
 const [aiProgress,setAiProgress]=useState(0);
 const [aiOutput,setAiOutput]=useState("");
 const worker=useRef(null);

 useEffect(()=>{
   worker.current=new Worker(new URL("./ai-worker.js",import.meta.url),{type:"module"});
   worker.current.onmessage=(event)=>{
     const data=event.data||{};
     if(data.type==="status") setAiStatus(data.status);
     if(data.type==="progress") setAiProgress(data.progress);
     if(data.type==="complete"){
       setAiStatus("ready"); setAiProgress(100); setAiOutput(data.text||"");
     }
     if(data.type==="error"){
       setAiStatus("error"); setAiOutput(data.error||"Browser AI is unavailable.");
     }
   };
   return()=>worker.current?.terminate();
 },[]);

 const addIdea=()=>{if(!topic.trim())return;setIdeas(v=>[{title:topic.trim(),status:"Research queued",time:new Date().toLocaleTimeString()},...v]);setTopic("")};

 const runAI=()=>{
   const seed=topic.trim()||ideas[0]?.title||"an AI-powered small business opportunity";
   setAiOutput("");setAiProgress(0);setAiStatus("starting");
   worker.current?.postMessage({type:"generate",prompt:
     `Analyze this opportunity: "${seed}".
Return:
1) target audience
2) problem worth solving
3) 3 content angles
4) one ethical monetization path
5) next action.
Keep it concise and do not claim unverified facts.`
   });
 };

 const run=()=>{setRunning(true);setTimeout(()=>{setRunning(false);setIdeas(v=>v.length?v:[{title:"AI business opportunity scan",status:"Cycle completed",time:new Date().toLocaleTimeString()}])},900)};

 return <main>
  <header><div className="brand"><Brain size={28}/><span>AI Business Builder</span></div><div className="pill">FREE MODE · LOCAL AI</div></header>
  {active ? <section className="modulePage">
    <button className="secondary back" onClick={()=>setActive(null)}><ArrowLeft size={17}/> Back to dashboard</button>
    <div className="moduleIcon">{React.createElement(active.icon,{size:30})}</div>
    <div className="eyebrow">AI MODULE</div><h1>{active.title}</h1><p className="moduleDetail">{active.detail}</p>
    <div className="moduleCard"><h2>Run local AI</h2><p>Enter an opportunity and the browser will run a small open model locally when your device supports WebGPU. The model is fetched automatically and cached by the browser.</p><div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAI()} placeholder="Enter an opportunity…"/><button onClick={runAI}><Sparkles size={18}/> Generate</button></div>
    {aiStatus!=="idle"&&<div className="aiStatus"><span>{aiStatus==="starting"||aiStatus==="loading"||aiStatus==="generating"?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} {aiStatus==="loading"?`Loading local model ${Math.round(aiProgress)}%`:aiStatus==="generating"?"Generating…":aiStatus==="ready"?"AI ready":aiStatus==="error"?"Fallback/error":"Starting…"}</span></div>}
    {aiOutput&&<div className="aiOutput">{aiOutput}</div>}</div>
  </section> : <>
  <section className="hero">
   <div className="eyebrow">RESEARCH → CREATE → REPURPOSE → MEASURE</div>
   <h1>Build a content business<br/><span>with an AI operating system.</span></h1>
   <p>One research idea can become a complete, original content campaign across YouTube and short-form platforms—while the system tracks opportunities, output and revenue targets.</p>
   <div className="actions"><button onClick={run}><Play size={17}/>{running?"Running…":"Run AI Cycle"}</button><button className="secondary" onClick={runAI}><Sparkles size={17}/>Run Local AI</button><button className="secondary" onClick={addIdea}><Plus size={17}/>Add idea</button></div>
   {aiOutput&&<div className="aiOutput heroOutput">{aiOutput}</div>}
  </section>
  <section className="target"><div><small>ANNUAL REVENUE TARGET</small><strong>$350,000</strong></div><div className="progress"><span style={{width:"0%"}}/></div><div className="muted">$0 verified revenue · target only</div></section>
  <section className="grid">{modules.map(m=>{const Icon=m.icon;return <button className="module" key={m.title} onClick={()=>setActive(m)}><Icon size={22}/><h3>{m.title}</h3><p>{m.text}</p><span className="open">Open →</span></button>})}</section>
  <section className="workspace">
   <div className="sectionHead"><div><small>CONTENT PIPELINE</small><h2>Today's operating queue</h2></div><span className="status"><CheckCircle2 size={13}/> Ready</span></div>
   <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIdea()} placeholder="Enter a topic, niche or content opportunity…"/><button onClick={addIdea}><Plus size={18}/></button></div>
   {ideas.length===0?<div className="empty">No ideas queued yet. Add your first opportunity above.</div>:ideas.map((x,i)=><div className="idea" key={i}><div><b>{x.title}</b><small>{x.status} · {x.time}</small></div><span>QUEUED</span></div>)}
  </section>
  </>}
  <footer>AI Business Builder · Browser-first AI · Automated actions remain approval-gated.</footer>
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);
