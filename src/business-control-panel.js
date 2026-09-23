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
        .obc-sections{display:grid;grid-template-columns:1.3fr 1fr;gap:12px}.obc-panel{background:#0b1220;border:1px solid #253247;border-radius:15px;padding:16px}.obc-panel h3{margin:0 0 12px;font-size:15px}.obc-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px}.obc-row:last-child{border-bottom:0}.obc-muted{color:#94a3b8}.obc-bar{height:8px;background:#1e293b;border-radius:99px;overflow:hidden;margin-top:7px}.obc-fill{height:100%;background:#38bdf8;border-radius:99px}.obc-input{width:100%;box-sizing:border-box;background:#111827;color:#fff;border:1px solid #334155;border-radius:9px;padding:9px;margin:5px 0}.obc-btn{background:#f8fafc;color:#0f172a;border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer;margin-top:7px}.obc-note{font-size:11px;color:#94a3b8;margin-top:9px;line-height:1.5}
        .obc-badge{padding:6px 9px;border-radius:999px;background:#13251f;color:#a7f3d0;font-size:11px;white-space:nowrap}
        .lc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lc-card{background:#0f1724;border:1px solid #253247;border-radius:14px;padding:14px}.lc-card h4{margin:0 0 6px;font-size:14px}.lc-card p{margin:0 0 8px;color:#94a3b8;font-size:11px}.lc-card textarea{width:100%;min-height:54px;box-sizing:border-box;background:#111827;color:#fff;border:1px solid #334155;border-radius:9px;padding:8px;resize:vertical}.lc-result{margin-top:8px;font-size:12px}.lc-pill{display:inline-block;padding:4px 7px;border-radius:999px;background:#182233;color:#cbd5e1;margin-right:5px;margin-bottom:4px}.lc-signal{display:inline-block;padding:5px 9px;border-radius:999px;background:#3b2410;color:#fde68a;font-weight:800;border:1px solid #f59e0b;animation:lcBlink 1s steps(2,start) infinite}@keyframes lcBlink{50%{opacity:.25}}
        @media(max-width:800px){.obc-grid{grid-template-columns:repeat(2,1fr)}.obc-sections{grid-template-columns:1fr}.obc-head{flex-direction:column}.obc-title{font-size:23px}.lc-grid{grid-template-columns:1fr}}
        @media(max-width:500px){.obc-grid{grid-template-columns:1fr 1fr}.obc-card strong{font-size:18px}}
      </style>
      <div class="obc-shell">
        <div class="obc-head"><div><div class="obc-kicker">OWNER CONTROL PLANE</div><div class="obc-title">Business Control Panel</div><div class="obc-sub">Targets • pace • profit • production • sales intelligence • LotteryCloud analytics</div></div><div class="obc-badge">OWNER AUTHORITY · Vercel is infrastructure only</div></div>
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
            <div class="obc-note">Forecasts use recorded verified revenue and are not guarantees.</div>
          </div>
          <div class="obc-panel">
            <h3>Sales & Hot Signals</h3>
            <div id="obc-sales"></div>
            <h3 style="margin-top:16px">Buyer Age Groups</h3>
            <div id="obc-age"></div>
            <div class="obc-note">Only recorded purchase data is shown.</div>
          </div>
          <div class="obc-panel">
            <h3>AI2 + AI3 Production</h3>
            <div class="obc-row"><span>AI2</span><b id="obc-ai2">Awaiting runtime evidence</b></div>
            <div class="obc-row"><span>AI3</span><b id="obc-ai3">Awaiting runtime evidence</b></div>
            <div class="obc-row"><span>Combined jobs</span><b id="obc-jobs">0</b></div>
            <div class="obc-row"><span>Successful jobs</span><b id="obc-successjobs">0</b></div>
            <div class="obc-note">Cloud execution is reported only when runtime evidence exists.</div>
          </div>
          <div class="obc-panel" style="grid-column:1/-1">
            <h3>LotteryCloud — Statistical Research Lab</h3>
            <div class="obc-note" style="margin-bottom:12px">LotteryCloud remains an independent research service; this app is its owner-facing control surface. No ticket purchases, wagering, money movement, or guaranteed-winning claims.</div>
            <div class="lc-grid">
              <div class="lc-card"><h4>Texas Pick 3</h4><p>3 digits, 0–9. Paste recent draws.</p><textarea id="lc-p3" placeholder="526,166,504,127"></textarea><button class="obc-btn" data-game="p3">Analyze</button><div class="lc-result" id="lc-p3-result"></div></div>
              <div class="lc-card"><h4>Texas Lowball</h4><p>LotteryCloud research box.</p><textarea id="lc-low" placeholder="Paste recent results"></textarea><button class="obc-btn" data-game="low">Analyze</button><div class="lc-result" id="lc-low-result"></div></div>
              <div class="lc-card"><h4>Powerball</h4><p>5 white balls 1–69 + Powerball 1–26.</p><textarea id="lc-pb" placeholder="Example: 2 7 9 17 58 + 20"></textarea><button class="obc-btn" data-game="pb">Analyze</button><div class="lc-result" id="lc-pb-result"></div></div>
              <div class="lc-card"><h4>Mega Millions</h4><p>5 white balls 1–70 + Mega Ball 1–24.</p><textarea id="lc-mm" placeholder="Example: 10 20 30 40 50 + 12"></textarea><button class="obc-btn" data-game="mm">Analyze</button><div class="lc-result" id="lc-mm-result"></div></div>
            </div>
            <div class="obc-note">The blinking STATISTICAL SIGNAL marks numbers tied for the highest frequency in the historical results you supplied. It does not mean those numbers have a higher mathematical chance in the next random draw.</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);

    const money=n=>"$"+Math.round(n||0).toLocaleString();
    const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}};
    const syncLive=async()=>{try{const [p,a]=await Promise.all([fetch("/api/business-metrics",{cache:"no-store"}),fetch("/api/analytics-event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"page_view",path:location.pathname,referrer:document.referrer})})]);const m=await p.json();if(m?.payments){document.getElementById("obc-revenue").textContent=money(m.payments.grossRevenueUsd);document.getElementById("obc-revtrend").textContent=(m.payments.successfulPayments||0)+" verified payments"}}catch{}};
    const calculate=()=>{
      const ledger=read("aibb_ledger",[]),score=read("aibb_scorecard",{}),offers=read("aibb_offers",[]),activity=read("aibb_activity",[]);
      const verified=ledger.filter(x=>x.status==="Verified").reduce((a,x)=>a+(Number(x.amount)||0),0),cash=Math.max(verified,Number(score.cash)||0),cost=Number(score.toolCost)||0,profit=cash-cost;
      const now=new Date(),deadline=new Date("2026-09-25T23:59:59-05:00"),start=new Date("2026-09-19T00:00:00-05:00"),elapsed=Math.max((now-start)/86400000,.25),pace=cash/elapsed,pct=Math.min(cash/1000*100,100),monthly=pace*30,four=pace*120;
      document.getElementById("obc-revenue").textContent=money(cash);document.getElementById("obc-pace").textContent=pct.toFixed(1)+"%";document.getElementById("obc-profit").textContent=money(profit);document.getElementById("obc-pace2").textContent=money(pace)+"/day";document.getElementById("obc-30").textContent=money(monthly);document.getElementById("obc-120").textContent=money(four);document.getElementById("obc-targetbar").style.width=pct+"%";document.getElementById("obc-revtrend").textContent=cash?"Verified ledger evidence":"No verified revenue recorded";document.getElementById("obc-pacedetail").textContent=Math.max(0,Math.ceil((deadline-now)/86400000))+" days remaining in Friday sprint";
      const completed=activity.filter(x=>/completed/i.test(x.status||"")||/completed/i.test(x.action||"")).length,failed=activity.filter(x=>/failed|error|retry/i.test((x.status||"")+" "+(x.action||""))).length,total=completed+failed,success=total?completed/total*100:0;
      document.getElementById("obc-success").textContent=success.toFixed(0)+"%";document.getElementById("obc-production").textContent=total+" observed jobs";document.getElementById("obc-jobs").textContent=total;document.getElementById("obc-successjobs").textContent=completed;document.getElementById("obc-ai2").textContent="Requires OwnerCloud heartbeat evidence";document.getElementById("obc-ai3").textContent="Requires OwnerCloud heartbeat evidence";
      const sales=offers.map(o=>({name:o.name,sales:Number(o.sales)||0,revenue:(Number(o.sales)||0)*(Number(o.price)||0)})).filter(x=>x.sales||x.revenue).sort((a,b)=>b.revenue-a.revenue);document.getElementById("obc-sales").innerHTML=sales.length?sales.slice(0,5).map(x=>'<div class="obc-row"><span>'+x.name+'</span><b>'+x.sales+' sales · '+money(x.revenue)+'</b></div>').join(""):'<div class="obc-muted">No recorded sales yet.';
      const buyers=read("aibb_buyers",[]),groups={};buyers.forEach(b=>{const g=b.ageGroup||b.age_band||b.age;if(g)groups[g]=(groups[g]||0)+1});const ages=Object.entries(groups).sort((a,b)=>b[1]-a[1]);document.getElementById("obc-age").innerHTML=ages.length?ages.slice(0,5).map(x=>'<div class="obc-row"><span>'+x[0]+'</span><b>'+x[1]+' purchases</b></div>').join(""):'<div class="obc-muted">No age-group purchase data recorded.</div>';
    };

    const parseNumbers=s=>(s.match(/\b\d{1,2}\b/g)||[]).map(Number);
    const freq=arr=>{const m={};arr.forEach(n=>m[n]=(m[n]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([n,c])=>({n:Number(n),c}))};
    const analyze=(game)=>{
      const id=game==="p3"?"lc-p3":game==="low"?"lc-low":game==="pb"?"lc-pb":"lc-mm";
      const out=document.getElementById(id+"-result"),raw=document.getElementById(id).value||"";
      if(game==="p3"){const draws=raw.match(/\b\d{3}\b/g)||[];if(!draws.length){out.textContent="Add recent 3-digit draws.";return}const cols=[0,1,2].map(i=>freq(draws.map(d=>Number(d[i]))).slice(0,3));out.innerHTML=cols.map((x,i)=>'<span class="lc-pill">Pos '+(i+1)+': '+(x.map(v=>v.n).join(" · ")||"—")+'</span>').join("")}
      else {const nums=parseNumbers(raw);if(!nums.length){out.textContent="Add recent results.";return}const f=freq(nums);const limit=game==="pb"?69:game==="mm"?70:9;const top=f.filter(x=>x.n>=0&&x.n<=limit).slice(0,5);const max=top[0]?.c||0;const signal=top.filter(x=>x.c===max&&max>1).map(x=>x.n).join(" · ");out.innerHTML='<span class="lc-pill">Highest historical frequency: '+(top.map(x=>x.n).join(" · ")||"—")+'</span><span class="lc-pill">Samples: '+nums.length+'</span>'+(signal?'<div class="lc-signal">STATISTICAL SIGNAL: '+signal+'</div>':'')+'<div class="obc-note">All valid combinations retain the same mathematical odds in a fair draw.</div>'}
    };
    el.querySelectorAll("[data-game]").forEach(b=>b.addEventListener("click",()=>analyze(b.dataset.game)));
    calculate();syncLive();setInterval(calculate,10000);setInterval(syncLive,30000);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();