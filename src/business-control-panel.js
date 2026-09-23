(() => {
  const mount = () => {
    if (document.getElementById("owner-business-control-panel")) return;
    const el = document.createElement("section");
    el.id = "owner-business-control-panel";
    el.innerHTML = `
      <style>
        #owner-business-control-panel{margin:24px auto;max-width:1180px;padding:0 16px;font-family:Inter,system-ui,-apple-system,sans-serif}
        .obc-shell{background:linear-gradient(180deg,#111827,#090d16);border:1px solid #263244;border-radius:22px;padding:22px;color:#f8fafc;box-shadow:0 18px 60px rgba(0,0,0,.25)}
        .obc-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.obc-kicker{font-size:11px;letter-spacing:.14em;color:#94a3b8}.obc-title{font-size:28px;font-weight:800;margin:5px 0}.obc-sub{color:#94a3b8;font-size:13px}
        .obc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}.obc-card{background:#0f1724;border:1px solid #253247;border-radius:15px;padding:15px}.obc-card small{display:block;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.obc-card strong{display:block;font-size:22px;margin:7px 0}.obc-card span{font-size:12px;color:#a7f3d0}
        .obc-sections{display:grid;grid-template-columns:1.3fr 1fr;gap:12px}.obc-panel{background:#0b1220;border:1px solid #253247;border-radius:15px;padding:16px}.obc-panel h3{margin:0 0 12px;font-size:15px}.obc-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px}.obc-row:last-child{border-bottom:0}.obc-muted{color:#94a3b8}.obc-bar{height:8px;background:#1e293b;border-radius:99px;overflow:hidden;margin-top:7px}.obc-fill{height:100%;background:#38bdf8;border-radius:99px}.obc-input{width:100%;box-sizing:border-box;background:#111827;color:#fff;border:1px solid #334155;border-radius:9px;padding:9px;margin:5px 0}.obc-btn{background:#f8fafc;color:#0f172a;border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer;margin-top:7px}.obc-note{font-size:11px;color:#94a3b8;margin-top:9px;line-height:1.5}
        .obc-badge{padding:6px 9px;border-radius:999px;background:#13251f;color:#a7f3d0;font-size:11px;white-space:nowrap}
        @media(max-width:800px){.obc-grid{grid-template-columns:repeat(2,1fr)}.obc-sections{grid-template-columns:1fr}.obc-head{flex-direction:column}.obc-title{font-size:23px}}
        @media(max-width:500px){.obc-grid{grid-template-columns:1fr 1fr}.obc-card strong{font-size:18px}}
      </style>
      <div class="obc-shell">
        <div class="obc-head"><div><div class="obc-kicker">OWNER CONTROL PLANE</div><div class="obc-title">Business Control Panel</div><div class="obc-sub">Targets • pace • profit • production • sales intelligence • statistical forecasts</div></div><div class="obc-badge">OWNER AUTHORITY · Vercel is infrastructure only</div></div>
        <div class="obc-grid">
          <div class="obc-card"><small>Verified Revenue</small><strong id="obc-revenue">$0</strong><span id="obc-revtrend">Waiting for verified sales</span></div>
          <div class="obc-card"><small>Target Pace</small><strong id="obc-pace">0%</strong><span id="obc-pacedetail">Calculating from target</span></div>
          <div class="obc-card"><small>Profit Forecast</small><strong id="obc-profit">$0</strong><span>Forecast ≠ guaranteed result</span></div>
          <div class="obc-card"><small>Production Success</small><strong id="obc-success">0%</strong><span id="obc-production">0 completed jobs</span></div>
        </div>
        <div class="obc-sections">
          <div class="obc-panel">
            <h3>Target & Forecast</h3>
            <div class="obc-row"><span class="obc-muted">Friday target</span><b>$1,000 by Sep 25, 2026</b></div>
            <div class="obc-row"><span class="obc-muted">Four-month target</span><b>$4,000,000 by Jan 25, 2027</b></div>
            <div class="obc-row"><span class="obc-muted">Current pace</span><b id="obc-pace2">$0/day</b></div>
            <div class="obc-row"><span class="obc-muted">Projected 30-day revenue</span><b id="obc-30">$0</b></div>
            <div class="obc-row"><span class="obc-muted">Projected 4-month revenue</span><b id="obc-120">$0</b></div>
            <div class="obc-bar"><div class="obc-fill" id="obc-targetbar" style="width:0%"></div></div>
            <div class="obc-note">Forecasts are calculated from recorded verified revenue and elapsed time; they are not promises or predictions of guaranteed income.</div>
          </div>
          <div class="obc-panel">
            <h3>Sales & Hot Signals</h3>
            <div id="obc-sales"></div>
            <h3 style="margin-top:16px">Buyer Age Groups</h3>
            <div id="obc-age"></div>
            <div class="obc-note">Age reporting only appears when purchase records contain age-group data. The panel will not invent demographics.</div>
          </div>
          <div class="obc-panel">
            <h3>AI2 + AI3 Production</h3>
            <div class="obc-row"><span>AI2</span><b id="obc-ai2">Awaiting runtime evidence</b></div>
            <div class="obc-row"><span>AI3</span><b id="obc-ai3">Awaiting runtime evidence</b></div>
            <div class="obc-row"><span>Combined jobs</span><b id="obc-jobs">0</b></div>
            <div class="obc-row"><span>Successful jobs</span><b id="obc-successjobs">0</b></div>
            <div class="obc-note">This panel intentionally distinguishes local UI activity from verified cloud-worker execution.</div>
          </div>
          <div class="obc-panel">
            <h3>Texas Pick 3 — Statistical Lab</h3>
            <input class="obc-input" id="obc-draws" placeholder="Paste recent draws, e.g. 526,166,504,127">
            <button class="obc-btn" id="obc-calc">Calculate candidates</button>
            <div id="obc-lottery" style="margin-top:10px"></div>
            <div class="obc-note">Exact-order odds for any specific Pick 3 number are 1 in 1,000. This tool ranks historical-pattern candidates only; it cannot know or guarantee the next winning number.</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    const money=n=>"$"+Math.round(n||0).toLocaleString();
    const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}};
    const syncLive=async()=>{ try{ const [p,a]=await Promise.all([fetch("/api/business-metrics",{cache:"no-store"}),fetch("/api/analytics-event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"page_view",path:location.pathname,referrer:document.referrer})})]); const m=await p.json(); if(m?.payments){ document.getElementById("obc-revenue").textContent=money(m.payments.grossRevenueUsd); document.getElementById("obc-revtrend").textContent=(m.payments.successfulPayments||0)+" verified payments"; } }catch{} };
    const calculate=()=>{
      const ledger=read("aibb_ledger",[]), score=read("aibb_scorecard",{}), offers=read("aibb_offers",[]), activity=read("aibb_activity",[]);
      const verified=ledger.filter(x=>x.status==="Verified").reduce((a,x)=>a+(Number(x.amount)||0),0);
      const cash=Math.max(verified,Number(score.cash)||0);
      const cost=Number(score.toolCost)||0, profit=cash-cost;
      const now=new Date(), deadline=new Date("2026-09-25T23:59:59-05:00");
      const start=new Date("2026-09-19T00:00:00-05:00"), elapsed=Math.max((now-start)/86400000,.25);
      const pace=cash/elapsed, pct=Math.min(cash/1000*100,100);
      const monthly=pace*30, four=pace*120;
      document.getElementById("obc-revenue").textContent=money(cash); document.getElementById("obc-pace").textContent=pct.toFixed(1)+"%"; document.getElementById("obc-profit").textContent=money(profit);
      document.getElementById("obc-pace2").textContent=money(pace)+"/day"; document.getElementById("obc-30").textContent=money(monthly); document.getElementById("obc-120").textContent=money(four); document.getElementById("obc-targetbar").style.width=pct+"%";
      document.getElementById("obc-revtrend").textContent=cash?"Verified ledger evidence":"No verified revenue recorded";
      document.getElementById("obc-pacedetail").textContent=Math.max(0,Math.ceil((deadline-now)/86400000))+" days remaining in Friday sprint";
      const completed=activity.filter(x=>/completed/i.test(x.status||"")||/completed/i.test(x.action||"")).length, failed=activity.filter(x=>/failed|error|retry/i.test((x.status||"")+" "+(x.action||""))).length, total=completed+failed;
      const success=total?completed/total*100:0; document.getElementById("obc-success").textContent=success.toFixed(0)+"%"; document.getElementById("obc-production").textContent=total+" observed jobs";
      document.getElementById("obc-jobs").textContent=total; document.getElementById("obc-successjobs").textContent=completed;
      document.getElementById("obc-ai2").textContent="Requires OwnerCloud heartbeat evidence"; document.getElementById("obc-ai3").textContent="Requires OwnerCloud heartbeat evidence";
      const sales=offers.map(o=>({name:o.name,sales:Number(o.sales)||0,revenue:(Number(o.sales)||0)*(Number(o.price)||0)})).filter(x=>x.sales||x.revenue).sort((a,b)=>b.revenue-a.revenue);
      document.getElementById("obc-sales").innerHTML=sales.length?sales.slice(0,5).map(x=>'<div class="obc-row"><span>'+x.name+'</span><b>'+x.sales+' sales · '+money(x.revenue)+'</b></div>').join(""):'<div class="obc-muted">No recorded sales yet.</div>';
      const buyers=read("aibb_buyers",[]), groups={}; buyers.forEach(b=>{const g=b.ageGroup||b.age_band||b.age; if(g)groups[g]=(groups[g]||0)+1}); const ages=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
      document.getElementById("obc-age").innerHTML=ages.length?ages.slice(0,5).map(x=>'<div class="obc-row"><span>'+x[0]+'</span><b>'+x[1]+' purchases</b></div>').join(""):'<div class="obc-muted">No age-group purchase data recorded.</div>';
    };
    document.getElementById("obc-calc").onclick=()=>{
      const draws=document.getElementById("obc-draws").value.match(/\b\d{3}\b/g)||[]; const counts=[{}, {}, {}];
      draws.forEach(d=>d.split("").forEach((n,i)=>counts[i][n]=(counts[i][n]||0)+1));
      const rank=pos=>Object.entries(counts[pos]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
      const hot=[0,1,2].map(i=>rank(i)[0]||"—"); const candidate=hot.join("");
      document.getElementById("obc-lottery").innerHTML=draws.length?'<div class="obc-row"><span>Pattern candidate</span><b>'+candidate+'</b></div><div class="obc-row"><span>Position-hot digits</span><b>'+hot.join(" · ")+'</b></div><div class="obc-row"><span>Sample size</span><b>'+draws.length+' draws</b></div>':'<div class="obc-muted">Add recent draws to calculate a candidate.</div>';
    };
    calculate(); syncLive(); setInterval(calculate,10000); setInterval(syncLive,30000);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();