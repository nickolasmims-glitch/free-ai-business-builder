import fs from "node:fs";

const file = process.argv[2] || "guardian-log.txt";
const log = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const sourceFiles = fs.existsSync("src/main.jsx") ? fs.readFileSync("src/main.jsx","utf8") : "";
const pkg = fs.existsSync("package.json") ? fs.readFileSync("package.json","utf8") : "";

const findings = [], audit = [], research = [];
const add = (severity,title,evidence,repair) => findings.push({severity,title,evidence,repair});
const addAudit = (severity,area,status,evidence,action) => audit.push({severity,area,status,evidence,action});

const researchPlan = [
  ["Problem discovery","2026 customer discovery painful business problems willingness to pay MVP product market fit"],
  ["AI SaaS monetization","2026 AI SaaS pricing subscription usage based hybrid credits outcome based"],
  ["Pricing packaging","2026 SaaS pricing value metric tiers upgrade path expansion retention"],
  ["Unit economics","2026 SaaS CAC LTV gross margin payback churn retention metrics"],
  ["Customer acquisition","2026 SaaS customer acquisition channels product led growth referrals SEO partnerships outbound"],
  ["Lead generation","2026 small business B2B lead generation compliant outreach email marketing"],
  ["Conversion","2026 SaaS landing page activation conversion onboarding trial freemium checkout"],
  ["Retention","2026 SaaS retention churn engagement expansion revenue customer success"],
  ["AI cost control","2026 production AI agent cost attribution budgets limits alerts caching routing"],
  ["Agent architecture","2026 production AI agents tools evals approval gates loop ceilings observability"],
  ["Automation opportunities","2026 AI automation workflows small business ROI repetitive tasks"],
  ["Digital products","2026 creator digital products templates memberships information products monetization"],
  ["Marketplace model","2026 marketplace business model take rate supply demand liquidity monetization"],
  ["Affiliate model","2026 affiliate marketing software content disclosure FTC guidance"],
  ["Payments","2026 SaaS payments subscriptions usage billing Stripe"],
  ["Reliability","2026 Vercel production deployment observability rollback AI apps"],
  ["Security","2026 GitHub Actions least privilege secrets automation security"],
  ["Compliance","2026 FTC advertising endorsements reviews disclosures AI business claims"]
];

async function ddgSearch(q) {
  try {
    const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const res = await fetch(url,{headers:{"user-agent":"Mozilla/5.0 Build-Guardian/4.0"}});
    if (!res.ok) return [];
    const html = await res.text();
    return [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .slice(0,6).map(m=>({
        title:m[2].replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#x27;/g,"'").replace(/&quot;/g,'"').trim(),
        url:m[1]
      }));
  } catch { return []; }
}

for (const [theme,q] of researchPlan) {
  research.push({theme,query:q,results:await ddgSearch(q)});
}

const official = [
 ["Stripe AI pricing","https://stripe.com/guides/pricing-ai-products-lessons-from-leading-ai-companies"],
 ["Stripe SaaS pricing","https://stripe.com/resources/more/saas-pricing-and-packaging-strategy"],
 ["Stripe usage pricing","https://stripe.com/resources/more/usage-based-pricing-strategy-for-saas"],
 ["Stripe SaaS metrics","https://stripe.com/resources/more/essential-saas-metrics"],
 ["Stripe CAC","https://stripe.com/resources/more/cac-in-saas"],
 ["YC product-market fit","https://www.ycombinator.com/blog/the-real-product-market-fit/"],
 ["Vercel agentic AI guide","https://vercel.com/i/building-agentic-ai-applications-with-a-problem-first-approach"],
 ["Vercel production agents","https://vercel.com/i/how-to-build-production-ready-ai-agents"],
 ["Vercel AI cost management","https://vercel.com/i/llm-cost-management-track-control-model-spend"],
 ["Vercel docs","https://vercel.com/docs"],
 ["FTC advertising guidance","https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business"],
 ["FTC endorsements and reviews","https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews"],
 ["GitHub workflow syntax","https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax"],
 ["GitHub events/schedules","https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows"],
 ["GitHub security","https://docs.github.com/en/actions/reference/security/secure-use"],
 ["Vite guide","https://vite.dev/guide/"],
 ["npm CLI","https://docs.npmjs.com/cli/"]
];

if (/(setup-node|node\.js)/i.test(log) && /(failed|error)/i.test(log))
  add("HIGH","Node.js setup failed","The build log contains a Node/setup failure.","Verify the Node version and action version, then rerun the build.");
if (/npm err!|npm error/i.test(log))
  add("HIGH","npm dependency installation failed","npm reported an installation error.","Fix the earliest npm error and verify package versions/lockfile.");
if (/vite|esbuild/i.test(log) && /(failed|error)/i.test(log))
  add("HIGH","Production compiler failure detected","The log contains a Vite/ESBuild failure.","Fix the earliest compiler error before unrelated changes.");
if (/module not found|cannot find module/i.test(log))
  add("HIGH","Required module is missing","A referenced module could not be resolved.","Correct the import or add the dependency.");
if (/jsx|unexpected token/i.test(log))
  add("HIGH","Source syntax/JSX error detected","The compiler reported a parsing problem.","Fix the earliest parser error and keep the change isolated.");
if (/environment variable|missing env/i.test(log))
  add("MEDIUM","Environment configuration may be missing","The log references missing environment configuration.","Confirm required VITE_* values without committing secrets.");

const requiredModules = ["Research Brain","Content Factory","Repurpose Engine","Growth Loop","Revenue Engine","Trust & Compliance"];
for (const name of requiredModules) {
  const ok = sourceFiles.includes(`title:"${name}"`);
  addAudit(ok?"PASS":"HIGH","Business module: "+name,ok?"PRESENT":"GAP",ok?"Found in production source.":"Expected module was not found in src/main.jsx.",ok?"Keep covered by regression checks.":"Restore the module before treating the system as complete.");
}

const checks = [
 ["Revenue tracking",/revenue|income|Revenue Engine/i],
 ["Compliance preflight",/Trust & Compliance|generateCompliance/i],
 ["Performance feedback loop",/Growth Loop|generateGrowth/i],
 ["Content repurposing",/Repurpose Engine|generateRepurpose/i],
 ["Persistent activity tracking",/aibb_activity/i],
 ["Persistent portfolio tracking",/aibb_portfolio/i],
 ["Approval-gated external actions",/approval-gated|approval/i],
 ["Problem/market research",/research|Research Brain|customer|market/i],
 ["Offer/pricing model",/price|pricing|offer|plan|subscription|usage/i],
 ["Customer acquisition",/client|lead|prospect|outreach|acquisition|customer/i],
 ["Retention/engagement",/retention|repeat|return|engagement|churn/i],
 ["Unit economics",/CAC|LTV|margin|cost|expense|profit|break.?even/i],
 ["Conversion funnel",/conversion|click|signup|checkout|purchase|funnel/i],
 ["Payment readiness",/stripe|payment|checkout|billing|subscription/i],
 ["Experiment/market validation",/experiment|test|validate|feedback|research/i],
 ["AI cost controls",/token|usage|budget|cost|spend|limit|model/i],
 ["Agent/tool boundaries",/tool|agent|worker|approval|permission|guard/i],
 ["Observability/audit trail",/activity|metrics|log|audit|status/i]
];

for (const [area,re] of checks) {
  const ok=re.test(sourceFiles);
  const high=["Offer/pricing model","Customer acquisition","Unit economics","Conversion funnel","Payment readiness","AI cost controls","Agent/tool boundaries"].includes(area);
  addAudit(ok?"PASS":(high?"HIGH":"MEDIUM"),area,ok?"FOUND":"GAP",ok?"Relevant implementation markers exist.":"No strong implementation marker was found in the production source.",ok?"Continue measuring it.":"Add a concrete workflow/UI/data model and verify it with the production build.");
}

const opportunityModels = [
 ["B2B micro-SaaS","Solve one expensive, recurring business problem for a narrow customer segment; charge subscription or usage."],
 ["AI workflow automation","Automate a bounded repetitive workflow with measurable time/cost savings; meter usage where AI cost varies."],
 ["Productized service","Package a repeatable service into a fixed-scope workflow before attempting full software automation."],
 ["Lead-generation software","Find, qualify, enrich, and organize prospects; keep outreach approval-gated and compliant."],
 ["Creator/content engine","Turn one research input into multiple content assets and track conversion rather than views alone."],
 ["Templates/data/tools","Sell reusable assets or utilities with low marginal delivery cost and optional subscription updates."],
 ["Marketplace","Connect a specific supply/demand pair and monetize transactions or subscriptions after proving liquidity."],
 ["Affiliate/referral","Recommend products only where there is genuine user value; disclose material connections and track attributable conversions."]
];

const risky=[
 ["External side effects",/fetch\(|window\.open|location\.|mailto:|navigator\.share/.test(sourceFiles)],
 ["Hard-coded secrets",/(sk-[A-Za-z0-9]|AIza[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY)/.test(sourceFiles+pkg)]
];
for(const [area,flag] of risky)
  addAudit(flag?"REVIEW":"PASS",area,flag?"REQUIRES REVIEW":"CLEAR",flag?"Potential external side effect or secret-like material detected.":"Static scan found no obvious match.",flag?"Review exact lines; keep secrets in GitHub/Vercel environment variables and gate external actions.":"Keep this check in every audit.");

if(!findings.length) add("INFO","No known build failure signature matched","The current log did not match a known failure pattern.","Use the business audit and current research to choose the next safe improvement.");

let out="# Build Guardian AI Report\n\n";
out+="**Role:** proactive engineering + money-making-app research agent for AI 1. Every run refreshes public-web research across customer discovery, monetization, acquisition, retention, unit economics, AI cost control, agent architecture, payments, compliance, and reliability. It audits the codebase and reports concrete gaps. It does not silently deploy, send outreach, spend money, or change production.\n\n";

out+="## Money-making app intelligence\n\n";
out+="### Core build rules\n\n";
out+="- **Problem first:** start with a painful, specific customer problem and define a measurable success outcome before adding features.\n";
out+="- **Smallest sellable workflow:** build one bounded workflow that can deliver value end-to-end before expanding into a broad platform.\n";
out+="- **Value metric before price:** decide what customers actually gain and what unit naturally represents that value; then choose pricing and packaging.\n";
out+="- **Monetization options:** compare subscription, usage-based, hybrid, credits, outcome-based, transaction/take-rate, affiliate, and productized-service models against customer value and delivery cost.\n";
out+="- **Unit economics:** track revenue, gross margin, CAC, LTV, churn/retention, conversion, payback, AI cost per task, and cost per acquired customer.\n";
out+="- **Acquisition:** test organic content/SEO, referrals, partnerships, communities, outbound, and paid channels separately; measure qualified leads and paying customers, not traffic alone.\n";
out+="- **Retention:** instrument activation, repeat usage, churn, expansion, and reasons customers stop using the product.\n";
out+="- **AI economics:** attribute model spend to features/tasks, set per-run and per-user budgets, cap retries/loops, and alert on anomalies.\n";
out+="- **Agent design:** use deterministic code for deterministic work, model reasoning where judgment adds value, and human approval for irreversible actions.\n";
out+="- **Trust/compliance:** substantiate marketing claims, disclose material connections, protect credentials, and avoid deceptive reviews or unsupported earnings claims.\n\n";

out+="### Business models AI 2 will investigate\n\n";
for(const [name,desc] of opportunityModels) out+=`- **${name}:** ${desc}\n`;
out+="\n";

out+="## Build diagnosis\n\n";
for(const [i,f] of findings.entries()) out+=`### ${i+1}. [${f.severity}] ${f.title}\n\n**Evidence:** ${f.evidence}\n\n**Repair:** ${f.repair}\n\n`;

out+="## AI 1 business-system audit\n\n";
for(const a of audit) out+=`- **[${a.severity}] ${a.area} — ${a.status}**\n  - Evidence: ${a.evidence}\n  - Next action: ${a.action}\n`;

out+="\n## Internet research\n\n### Official references\n\n";
for(const [name,url] of official) out+=`- [${name}](${url})\n`;

out+="\n### Live research by theme\n\n";
for(const item of research){
  out+=`#### ${item.theme}\n\n**Search:** ${item.query}\n\n`;
  for(const r of item.results) out+=`- [${r.title}](${r.url})\n`;
  if(!item.results.length) out+="- No results returned this run.\n";
  out+="\n";
}

out+="## Next-build decision framework\n\n";
out+="- 1. Identify a narrow customer + painful problem.\n";
out+="- 2. Verify the problem with evidence and define a measurable outcome.\n";
out+="- 3. Build the smallest useful workflow.\n";
out+="- 4. Add a clear offer and payment path.\n";
out+="- 5. Instrument acquisition → activation → conversion → retention → revenue.\n";
out+="- 6. Measure CAC, LTV, margin, AI cost, and payback.\n";
out+="- 7. Run one controlled improvement at a time and preserve the known-good build.\n";
out+="- 8. Add automation only after the workflow works manually and the agent has clear tools, limits, and stopping conditions.\n";
out+="- 9. Promote only after production build, regression checks, security, and business-safety checks pass.\n\n";

out+="## Safety gate\n\n";
out+="- Research current documentation before proposing changes.\n";
out+="- Prefer primary/official sources for technical, payments, advertising, and compliance guidance.\n";
out+="- Never expose or commit secrets.\n";
out+="- Keep outreach, purchases, payments, publishing, account changes, and other irreversible side effects approval-gated until explicitly connected and tested.\n";
out+="- Bound agent loops, retries, tool permissions, and AI spend.\n";
out+="- Require a passing production build before promotion.\n";
out+="- Protect the known-good production deployment.\n";

process.stdout.write(out);
