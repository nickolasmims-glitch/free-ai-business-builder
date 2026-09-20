import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,Video,Scissors,TrendingUp,DollarSign,ShieldCheck,Play,Plus,Brain,ArrowLeft,CheckCircle2,Sparkles,Loader2,Copy,RefreshCw,BarChart3,WalletCards} from "lucide-react";
import "./styles.css";

const modules=[
 {icon:Search,title:"Research Brain",text:"Find topics, gaps, audiences and commercial opportunities.",detail:"Turn a niche or problem into practical research opportunities."},
 {icon:Video,title:"Content Factory",text:"Turn research into original scripts, hooks, titles and production plans.",detail:"Build a complete content package from one approved idea."},
 {icon:Scissors,title:"Repurpose Engine",text:"Create platform-specific versions from every core idea.",detail:"Adapt one approved concept into multiple platform formats."},
 {icon:TrendingUp,title:"Growth Loop",text:"Measure results and feed what works back into research.",detail:"Use verified performance data to prioritize the next content cycle."},
 {icon:DollarSign,title:"Revenue Engine",text:"Track ads, affiliates, sponsors, products and leads against targets.",detail:"Track verified income, expenses and profit across your business systems."},
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
 const [metrics,setMetrics]=useState({views:"",watchTime:"",likes:"",comments:"",shares:"",clicks:"",conversions:"",revenue:""});
 const [revenue,setRevenue]=useState({target:"350000",income:"",expenses:"",source:"YouTube",status:"Verified",month:""});
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

 const generateRepurpose=()=>{
  const seed=topic.trim()||factory?.seed||ideas[0]?.title||"AI tools for small businesses";
  generate(`Create a platform-specific repurposing package for this approved content topic: "${seed}".
Return exactly these sections:
YOUTUBE SHORTS: 3 distinct 30-60 second scripts, each with a different hook and clear payoff.
TIKTOK: 3 distinct short scripts optimized for native short-form viewing, not copies of the Shorts.
HOOKS: 6 alternate opening lines.
ON-SCREEN TEXT: 6 concise text overlays.
TITLES: 6 accurate short-form titles.
CAPTIONS: 3 platform-ready captions.
HASHTAGS: 3 small relevant hashtag sets; avoid spammy tags.
CTAS: 3 natural CTA variants.
REUSE CHECK: explain how each version adds original value and avoids repetitive/mass-produced content.
Do not invent statistics, customers, revenue, quotes, or sources. Clearly label anything that needs verification.`);
 };

 const generateGrowth=()=>{
  const clean=Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,v||"0"]));
  const seed=topic.trim()||factory?.seed||ideas[0]?.title||"the latest approved content";
  generate(`Analyze this content performance record for "${seed}".
VERIFIED/USER-ENTERED METRICS:
Views: ${clean.views}
Watch time or retention: ${clean.watchTime}
Likes: ${clean.likes}
Comments: ${clean.comments}
Shares: ${clean.shares}
Clicks: ${clean.clicks}
Conversions: ${clean.conversions}
Verified revenue: $${clean.revenue}

Return exactly:
WHAT THE DATA SHOWS: summarize only observable patterns; do not invent benchmarks.
NEXT 3 TESTS: three specific content experiments with one variable changed at a time.
TOPIC IDEAS: five follow-up topics based on the supplied data.
HOOK TESTS: five new opening hooks.
FORMAT TEST: one recommendation for length/format to test, clearly labeled as a test.
RETIRE OR REWORK: identify what should be reworked only when the supplied data supports it.
MEASUREMENT PLAN: what to record on the next cycle.
Do not claim causation from correlation. Do not invent statistics, customers, revenue, sources, or results. If data is missing, say what is missing.`);
 };

 const generateRevenuePlan=()=>{
  const t=Number(revenue.target)||350000, i=Number(revenue.income)||0, e=Number(revenue.expenses)||0, profit=i-e, gap=Math.max(t-i,0);
  const source=revenue.source||"Not specified";
  generate(`Create a practical revenue review for this business.
ANNUAL TARGET: $${t}
VERIFIED INCOME ENTERED: $${i}
EXPENSES ENTERED: $${e}
CALCULATED PROFIT: $${profit}
REMAINING TARGET GAP: $${gap}
REVENUE SOURCE: ${source}
PAYOUT STATUS: ${revenue.status}
MONTH: ${revenue.month||"not supplied"}

Return exactly:
REVENUE SNAPSHOT: repeat the supplied numbers and calculated arithmetic only.
GAP TO TARGET: explain the remaining amount without predicting future results.
REVENUE MIX: suggest legitimate categories to track (ads, affiliate, sponsorships, products, services/leads) without claiming they are currently earning.
NEXT ACTIONS: 5 concrete actions that can be taken without spending money or making public/account changes.
TRACKING CHECKLIST: what evidence should be saved for each verified revenue entry.
RISK CHECKS: note payout, refund, fee, tax, disclosure, or attribution items that may affect net revenue.
Do not invent customers, sales, payouts, fees, taxes, revenue, or results. Clearly distinguish entered facts from suggestions.`);
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

 const metricFields=[
  ["views","Views"],["watchTime","Watch time / retention"],["likes","Likes"],["comments","Comments"],
  ["shares","Shares"],["clicks","Clicks"],["conversions","Conversions"],["revenue","Verified revenue ($)"]
 ];
 const income=Number(revenue.income)||0,expenses=Number(revenue.expenses)||0,target=Number(revenue.target)||350000,profit=income-expenses,gap=Math.max(target-income,0);

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
   </div> : active.title==="Repurpose Engine" ? <div className="moduleCard">
    <h2>Repurpose Engine</h2><p>Turn one approved idea into distinct short-form assets for YouTube Shorts and TikTok. The engine creates platform-specific variations instead of simple duplicates.</p>
    <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateRepurpose()} placeholder="Enter a topic or use your Content Factory idea…"/><button onClick={generateRepurpose}><Scissors size={18}/> Repurpose</button></div>
    <div className="factorySteps"><span>01 Shorts scripts</span><span>02 TikTok versions</span><span>03 Hooks</span><span>04 Captions</span><span>05 CTAs</span><span>06 Reuse check</span></div>
    {aiStatus!=="idle"&&<div className="aiStatus"><span>{aiStatus==="starting"||aiStatus==="loading"||aiStatus==="generating"?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} {aiStatus==="loading"?`Loading local model ${Math.round(aiProgress)}%`:aiStatus==="generating"?"Repurposing…":aiStatus==="ready"?"Package ready":aiStatus==="error"?"AI error":"Starting…"}</span></div>}
    {aiOutput&&<><div className="outputActions"><button className="secondary" onClick={copy}><Copy size={15}/> Copy</button><button className="secondary" onClick={generateRepurpose}><RefreshCw size={15}/> Regenerate</button></div><div className="aiOutput">{aiOutput}</div></>}
   </div> : active.title==="Growth Loop" ? <div className="moduleCard">
    <h2><BarChart3 size={21}/> Growth Loop</h2><p>Enter real or imported performance data. The AI uses only the numbers you provide to design the next content experiments. Blank fields stay blank rather than becoming fake results.</p>
    <div className="metricGrid">{metricFields.map(([key,label])=><label key={key}><span>{label}</span><input inputMode={key==="revenue"?"decimal":"numeric"} value={metrics[key]} onChange={e=>setMetrics(v=>({...v,[key]:e.target.value}))} placeholder="Enter verified data"/></label>)}</div>
    <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Content topic / video name (optional)"/><button onClick={generateGrowth}><TrendingUp size={18}/> Analyze & Plan</button></div>
    <div className="factorySteps"><span>01 Record data</span><span>02 Find patterns</span><span>03 Test hooks</span><span>04 Test topics</span><span>05 Measure again</span><span>06 Feed research</span></div>
    {aiStatus!=="idle"&&<div className="aiStatus"><span>{aiStatus==="starting"||aiStatus==="loading"||aiStatus==="generating"?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} {aiStatus==="loading"?`Loading local model ${Math.round(aiProgress)}%`:aiStatus==="generating"?"Analyzing performance…":aiStatus==="ready"?"Growth plan ready":aiStatus==="error"?"AI error":"Starting…"}</span></div>}
    {aiOutput&&<><div className="outputActions"><button className="secondary" onClick={copy}><Copy size={15}/> Copy</button><button className="secondary" onClick={generateGrowth}><RefreshCw size={15}/> Re-run analysis</button></div><div className="aiOutput">{aiOutput}</div></>}
   </div> : active.title==="Revenue Engine" ? <div className="moduleCard">
    <h2><WalletCards size={21}/> Revenue Engine</h2>
    <p>Track money actually received or otherwise verified. Nothing here is treated as revenue until you enter it and identify its source/status.</p>
    <div className="revenueStats"><div><small>ANNUAL TARGET</small><strong>${target.toLocaleString()}</strong></div><div><small>VERIFIED INCOME</small><strong>${income.toLocaleString()}</strong></div><div><small>EXPENSES</small><strong>${expenses.toLocaleString()}</strong></div><div><small>CALCULATED PROFIT</small><strong>${profit.toLocaleString()}</strong></div></div>
    <div className="metricGrid revenueGrid">
      <label><span>Annual target ($)</span><input inputMode="decimal" value={revenue.target} onChange={e=>setRevenue(v=>({...v,target:e.target.value}))}/></label>
      <label><span>Verified income ($)</span><input inputMode="decimal" value={revenue.income} onChange={e=>setRevenue(v=>({...v,income:e.target.value}))} placeholder="0"/></label>
      <label><span>Expenses ($)</span><input inputMode="decimal" value={revenue.expenses} onChange={e=>setRevenue(v=>({...v,expenses:e.target.value}))} placeholder="0"/></label>
      <label><span>Month</span><input value={revenue.month} onChange={e=>setRevenue(v=>({...v,month:e.target.value}))} placeholder="YYYY-MM"/></label>
      <label><span>Revenue source</span><input value={revenue.source} onChange={e=>setRevenue(v=>({...v,source:e.target.value}))} placeholder="YouTube, affiliate, sponsor…"/></label>
      <label><span>Payout status</span><select value={revenue.status} onChange={e=>setRevenue(v=>({...v,status:e.target.value}))}><option>Verified</option><option>Pending</option><option>Refunded</option><option>Unverified</option></select></label>
    </div>
    <div className="revenueGap"><b>Remaining target gap:</b> ${gap.toLocaleString()} <span>· target is a goal, not a forecast</span></div>
    <div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Optional revenue note or business context"/><button onClick={generateRevenuePlan}><DollarSign size={18}/> Review Revenue</button></div>
    <div className="factorySteps"><span>01 Verify income</span><span>02 Track expenses</span><span>03 Calculate profit</span><span>04 Check payout status</span><span>05 Review mix</span><span>06 Plan next action</span></div>
    {aiStatus!=="idle"&&<div className="aiStatus"><span>{aiStatus==="starting"||aiStatus==="loading"||aiStatus==="generating"?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} {aiStatus==="loading"?`Loading local model ${Math.round(aiProgress)}%`:aiStatus==="generating"?"Reviewing revenue…":aiStatus==="ready"?"Revenue review ready":aiStatus==="error"?"AI error":"Starting…"}</span></div>}
    {aiOutput&&<><div className="outputActions"><button className="secondary" onClick={copy}><Copy size={15}/> Copy</button><button className="secondary" onClick={generateRevenuePlan}><RefreshCw size={15}/> Re-run review</button></div><div className="aiOutput">{aiOutput}</div></>}
   </div> :
   <div className="moduleCard"><h2>Run local AI</h2><p>Enter an opportunity and generate a practical next step.</p><div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAI()} placeholder="Enter an opportunity…"/><button onClick={runAI}><Sparkles size={18}/> Generate</button></div>{aiOutput&&<div className="aiOutput">{aiOutput}</div>}</div>}
  </section> : <>
   <section className="hero"><div className="eyebrow">RESEARCH → CREATE → REPURPOSE → MEASURE → MONETIZE</div><h1>Build a content business<br/><span>with an AI operating system.</span></h1><p>One research idea can become a complete, original content campaign across YouTube and short-form platforms—while the system tracks opportunities, output and verified revenue.</p><div className="actions"><button onClick={run}><Play size={17}/>{running?"Running…":"Run AI Cycle"}</button><button className="secondary" onClick={generateFactory}><Sparkles size={17}/>Build Content</button><button className="secondary" onClick={addIdea}><Plus size={17}/>Add idea</button></div>{aiOutput&&<div className="aiOutput heroOutput">{aiOutput}</div>}</section>
   <section className="target"><div><small>ANNUAL REVENUE TARGET</small><strong>$350,000</strong></div><div className="progress"><span style={{width:"0%"}}/></div><div className="muted">$0 verified revenue · target only</div></section>
   <section className="grid">{modules.map(m=>{const Icon=m.icon;return <button className="module" key={m.title} onClick={()=>setActive(m)}><Icon size={22}/><h3>{m.title}</h3><p>{m.text}</p><span className="open">Open →</span></button>})}</section>
   <section className="workspace"><div className="sectionHead"><div><small>CONTENT PIPELINE</small><h2>Today's operating queue</h2></div><span className="status"><CheckCircle2 size={13}/> Ready</span></div><div className="inputRow"><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIdea()} placeholder="Enter a topic, niche or content opportunity…"/><button onClick={addIdea}><Plus size={18}/></button></div>{ideas.length===0?<div className="empty">No ideas queued yet. Add your first opportunity above.</div>:ideas.map((x,i)=><div className="idea" key={i}><div><b>{x.title}</b><small>{x.status} · {x.time}</small></div><span>QUEUED</span></div>)}</section>
  </>}
  <footer>AI Business Builder · Browser-first AI · Automated actions remain approval-gated.</footer>
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);