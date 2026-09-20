import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,Video,Scissors,TrendingUp,DollarSign,ShieldCheck,Play,Plus,Brain,ArrowLeft,CheckCircle2,Sparkles,Loader2,Copy,RefreshCw} from "lucide-react";
import "./styles.css";

const modules=[
 {icon:Search,title:"Research Brain",text:"Find topics, gaps, audiences and commercial opportunities.",detail:"Turn a niche or problem into practical research opportunities."},
 {icon:Video,title:"Content Factory",text:"Turn research into original scripts, hooks, titles and production plans.",detail:"Build a complete content package from one approved idea."},
 {icon:Scissors,title:"Repurpose Engine",text:"Create platform-specific versions from every core idea.",detail:"Adapt one approved concept into multiple platform formats."},
 {icon:TrendingUp,title:"Growth Loop",text:"Measure results and feed what works back into research.",detail:"Use performance data to prioritize the next content cycle."},
 {icon:DollarSign,title:"Revenue Engine",text:"Track ads, affiliates, sponsors, products and leads against targets.",detail:"Only verified revenue counts toward the $350,000 target."},
 {icon:ShieldCheck,title:"Trust & Compliance",text:"Flag copyright, reused-content, disclosure and policy risks.",detail:"Review risks before public publishing or monetization actions."}
];

function App(){
 const [ideas,setIdeas]=useState([]);
 const [topic,setTopic]=useState("");
 const [running,setRunning]=useState(false);
 const [active,setActive]=useState(null);
 const [aiStatus,setAiStatus]=useState("idle");
 const [aiProgress,setAiProgress]=useState(0);
 const [aiOutput,setAiOutput]=useState("");
 const [factory,setFactory]=useState(null);
 const worker=useRef(null);

 useEffect(()=>{
  worker.current=new Worker(new URL("./ai-worker.js",import.meta.url),{type:"module"});
  worker.current.onmessage=e=>{
   const d=e.data||{};
   if(d.type==="status")setAiStatus(d.status);
   if(d.type==="progress")setAiProgress(d.progress);
   if(d.type==="complete"){setAiStatus("ready");setAiProgress(100);setAiOutput(d.text||"");}
   if(d.type==="error"){setAiStatus("error");setAiOutput(d.error||"Browser AI unavailable.");}
  };
  return()=>worker.current?.terminate();
 },[]);

 const generate=(prompt)=>{
  setAiOutput("");setAiProgress(0);setAiStatus("starting");
  worker.current?.postMessage({type:"generate",prompt});
 };

 const generateFactory=()=>{
  const seed=topic.trim()||ideas[0]?.title||"AI tools for small businesses";
  setFactory({seed});
  generate(`Create an ORIGINAL YouTube content package for this topic: "${seed}".
Return exactly these sections:
TITLE OPTIONS: 3 compelling but accurate titles.
HOOK: a 20-second opening.
ANGLE: the unique viewer value.
OUTLINE: 6 concise sections.
SHORTS: 3 short-form video ideas.
CTA: one non-pushy call to action.
MONETIZATION: 2 legitimate ways this content could eventually earn revenue.
COMPLIANCE: key copyright, disclosure, reused-content, or factual-verification checks.
Do not invent statistics, customers, revenue, quotes, or sources. Clearly label anything that needs verification.`);
 };

 const runAI=()=>{
  const seed=topic.trim()||ideas[0]?.title||"an AI-powered small business opportunity";
  generate(`Analyze this opportunity: "${seed}".
Return:
1) target audience
2) problem worth solving
3) 3 content angles
4) one ethical monetization path
5) next action.
Keep it concise and do not claim unverified facts.`);
 };

 const addIdea=()=>{if(!topic.trim())return;setIdeas(v=>[{title:topic.trim(),status:"Research queued",time:new Date().toLocaleTimeString()},...v]);setTopic("")};
 const run=()=>{setRunning(true);setTimeout(()=>{setRunning(false);setIdeas(v=>v.length?v:[{title:"AI business opportunity scan",status:"Cycle completed",time:new Date().toLocaleTimeString()}])},900)};
 const copy=()=>{if(aiOutput)navigator.clipboard?.writeText(aiOutput)};

 return <main>
  <header><div className="brand"><Brain size={28}/><span>AI Business Builder</span></div><div className="pill">FREE MODE · LOCAL AI</div></header>
  {active ? <section className="modulePage">
   <button className="secondary back" onClick={()=>setActive(null)}><ArrowLeft size={17}/> Back to dashboard</button>
   <div className="moduleIcon">{React.createElement(active.icon,{size:30})}</div>
   <div className="eyebrow">AI MODULE</div><h1>{active.title}</h1><p className="moduleDetail">{active.detail}</p>
   {active.title==="Content Factory" ? <div className="moduleCard">
    <h2>Content Factory</h2><p>One topic becomes a complete original content package. The AI runs locally in your browser when supported.</p>
    <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateFactory()} placeholder="Enter your topic or niche…"/><button onClick={generateFactory}><Sparkles size={18}/> Build Package</button></div>
    {factory&&<div className="factorySteps"><span>01 Research angle</span><span>02 Hook</span><span>03 Outline</span><span>04 Shorts</span><span>05 Monetization</span><span>06 Compliance</span></div>}
    {aiStatus!=="idle"&&<div className="aiStatus"><span>{aiStatus==="starting"||aiStatus==="loading"||aiStatus==="generating"?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} {aiStatus==="loading"?`Loading local model ${Math.round(aiProgress)}%`:aiStatus==="generating"?"Building package…":aiStatus==="ready"?"Package ready":aiStatus==="error"?"AI error":"Starting…"}</span></div>}
    {aiOutput&&<><div className="outputActions"><button className="secondary" onClick={copy}><Copy size={15}/> Copy</button><button className="secondary" onClick={generateFactory}><RefreshCw size={15}/> Regenerate</button></div><div className="aiOutput">{aiOutput}</div></>}
   </div> :
   <div className="moduleCard"><h2>Run local AI</h2><p>Enter an opportunity and generate a practical next step.</p><div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAI()} placeholder="Enter an opportunity…"/><button onClick={runAI}><Sparkles size={18}/> Generate</button></div>{aiOutput&&<div className="aiOutput">{aiOutput}</div>}</div>}
  </section> : <>
   <section className="hero"><div className="eyebrow">RESEARCH → CREATE → REPURPOSE → MEASURE</div><h1>Build a content business<br/><span>with an AI operating system.</span></h1><p>One research idea can become a complete, original content campaign across YouTube and short-form platforms—while the system tracks opportunities, output and revenue targets.</p><div className="actions"><button onClick={run}><Play size={17}/>{running?"Running…":"Run AI Cycle"}</button><button className="secondary" onClick={generateFactory}><Sparkles size={17}/>Build Content</button><button className="secondary" onClick={addIdea}><Plus size={17}/>Add idea</button></div>{aiOutput&&<div className="aiOutput heroOutput">{aiOutput}</div>}</section>
   <section className="target"><div><small>ANNUAL REVENUE TARGET</small><strong>$350,000</strong></div><div className="progress"><span style={{width:"0%"}}/></div><div className="muted">$0 verified revenue · target only</div></section>
   <section className="grid">{modules.map(m=>{const Icon=m.icon;return <button className="module" key={m.title} onClick={()=>setActive(m)}><Icon size={22}/><h3>{m.title}</h3><p>{m.text}</p><span className="open">Open →</span></button>})}</section>
   <section className="workspace"><div className="sectionHead"><div><small>CONTENT PIPELINE</small><h2>Today's operating queue</h2></div><span className="status"><CheckCircle2 size={13}/> Ready</span></div><div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIdea()} placeholder="Enter a topic, niche or content opportunity…"/><button onClick={addIdea}><Plus size={18}/></button></div>{ideas.length===0?<div className="empty">No ideas queued yet. Add your first opportunity above.</div>:ideas.map((x,i)=><div className="idea" key={i}><div><b>{x.title}</b><small>{x.status} · {x.time}</small></div><span>QUEUED</span></div>)}</section>
  </>}
  <footer>AI Business Builder · Browser-first AI · Automated actions remain approval-gated.</footer>
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);