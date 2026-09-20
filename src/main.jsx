import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,Video,Scissors,TrendingUp,DollarSign,ShieldCheck,Play,Plus,Brain} from "lucide-react";
import "./styles.css";

const modules=[
 {icon:Search,title:"Research Brain",text:"Find topics, gaps, audiences and commercial opportunities."},
 {icon:Video,title:"Content Factory",text:"Turn research into original scripts, hooks, titles and production plans."},
 {icon:Scissors,title:"Repurpose Engine",text:"Create platform-specific versions from every core idea."},
 {icon:TrendingUp,title:"Growth Loop",text:"Measure results and feed what works back into research."},
 {icon:DollarSign,title:"Revenue Engine",text:"Track ads, affiliates, sponsors, products and leads against targets."},
 {icon:ShieldCheck,title:"Trust & Compliance",text:"Flag copyright, reused-content, disclosure and policy risks before publishing."}
];

function App(){
 const [ideas,setIdeas]=useState([]);
 const [topic,setTopic]=useState("");
 const [running,setRunning]=useState(false);
 const addIdea=()=>{if(!topic.trim())return;setIdeas(v=>[{title:topic.trim(),status:"Research queued",time:new Date().toLocaleTimeString()},...v]);setTopic("")};
 const run=()=>{setRunning(true);setTimeout(()=>setRunning(false),1400)};
 return <main>
  <header><div className="brand"><Brain size={28}/><span>AI Business Builder</span></div><div className="pill">FREE MODE</div></header>
  <section className="hero">
   <div className="eyebrow">RESEARCH → CREATE → REPURPOSE → MEASURE</div>
   <h1>Build a content business<br/><span>with an AI operating system.</span></h1>
   <p>One research idea can become a complete, original content campaign across YouTube and short-form platforms—while the system tracks opportunities, output and revenue targets.</p>
   <div className="actions"><button onClick={run}><Play size={17}/>{running?"Running…":"Run AI Cycle"}</button><button className="secondary" onClick={addIdea}><Plus size={17}/>Add idea</button></div>
  </section>
  <section className="target"><div><small>ANNUAL REVENUE TARGET</small><strong>$350,000</strong></div><div className="progress"><span style={{width:"0%"}}/></div><div className="muted">$0 verified revenue · target only</div></section>
  <section className="grid">{modules.map(({icon:Icon,title,text})=><article key={title}><Icon size={22}/><h3>{title}</h3><p>{text}</p></article>)}</section>
  <section className="workspace">
   <div className="sectionHead"><div><small>CONTENT PIPELINE</small><h2>Today's operating queue</h2></div><span className="status">● Ready</span></div>
   <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIdea()} placeholder="Enter a topic, niche or content opportunity…"/><button onClick={addIdea}><Plus size={18}/></button></div>
   {ideas.length===0?<div className="empty">No ideas queued yet. Add your first opportunity above.</div>:ideas.map((x,i)=><div className="idea" key={i}><div><b>{x.title}</b><small>{x.status} · {x.time}</small></div><span>QUEUED</span></div>)}
  </section>
  <footer>AI Business Builder · Browser-first foundation · Automated actions remain approval-gated.</footer>
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);
