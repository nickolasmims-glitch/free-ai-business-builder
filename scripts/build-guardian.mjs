import fs from "node:fs";

const file = process.argv[2] || "guardian-log.txt";
const log = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const sourceFiles = fs.existsSync("src/main.jsx") ? fs.readFileSync("src/main.jsx","utf8") : "";
const pkg = fs.existsSync("package.json") ? fs.readFileSync("package.json","utf8") : "";

const findings = [], audit = [], research = [];
const diagnosticProtocol = [
  ["1. Reproduce","Use the exact failing commit/run and reproduce the failure before changing code."],
  ["2. Find the earliest failure","Read workflow/job logs and isolate the first nonzero exit, parser error, dependency error, or environment mismatch; later errors may be cascades."],
  ["3. Classify","Classify as workflow syntax/trigger, runner/toolchain, dependency, source syntax, runtime, environment, network, security, or deployment failure."],
  ["4. Check the contract","Validate package.json, workflow YAML, required scripts, Node version, action versions, permissions, and expected files before touching application code."],
  ["5. Apply the smallest repair","Prefer one narrow change that addresses the root cause. Do not combine unrelated product features with a build repair."],
  ["6. Verify twice","Run static preflight plus the production build. A report is not a pass; the build must actually exit 0. A nonzero exit code marks the check failed."],
  ["7. Protect known-good","Never overwrite a known-good production version while a diagnostic build is failing. Roll back or isolate experimental work."],
  ["8. Learn from recurrence","Record the failure signature, root cause, repair, commit, and verification result so the same class of defect gets a preventive check next time."],
  ["9. Security gate","Never put credentials in source/workflows; use least-privilege tokens, review external side effects, and keep irreversible actions approval-gated."],
  ["10. Cost gate","Prefer free/public research and existing infrastructure; flag paid APIs, ads, software, credits, or usage before any spend."]
];
const add = (severity,title,evidence,repair) => findings.push({severity,title,evidence,repair});
const addAudit = (severity,area,status,evidence,action) => audit.push({severity,area,status,evidence,action});

const revenueScoutPlan = [
  ["Zero-cost acquisition","2026 free customer acquisition channels organic search communities referrals partnerships direct prospect research"],
  ["Fast cash offers","2026 productized service offers small business AI automation local business workflow pricing"],
  ["Buyer pain signals","2026 small business pain points repetitive tasks lead followup missed calls reviews scheduling reporting"],
  ["Free distribution","2026 free distribution strategies SEO Google Business Profile content communities referrals partnerships"],
  ["Micro-product opportunities","2026 simple AI tools templates calculators generators workflow products customers pay"],
  ["No-cost validation","2026 validate SaaS idea without spending money preorders interviews landing page waitlist"],
  ["Recurring revenue","2026 recurring revenue models AI services retainers subscriptions memberships"],
  ["Sales conversion","2026 B2B sales funnel discovery offer followup close small business"],
  ["Latest AI app opportunities","2026 emerging AI app use cases small business automation agents"],
  ["Revenue experiments","2026 low cost revenue experiments productized service digital product lead generation"],
];

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
  ["Compliance","2026 FTC advertising endorsements reviews disclosures AI business claims"],
  ["Google Trends demand signals","2026 Google Trends trending searches product validation demand discovery"],
  ["Google Play monetization","2026 Google Play subscriptions one-time products billing app monetization"],
  ["Google Ads conversion","2026 Google Ads conversion tracking customer acquisition ROI app"],
  ["Google Cloud AI apps","2026 Google Cloud build AI apps agents production deployment"],
  ["Money-making app strategy","2026 profitable micro SaaS AI app recurring revenue customer acquisition retention"],
  ["Zero-budget acquisition","2026 free customer acquisition organic SEO communities referrals partnerships direct outreach no ad spend"],
  ["Productized AI services","2026 AI automation productized service pricing small business fast delivery"],
  ["Revenue sprint validation","2026 sell before build pre-sell customer discovery deposits productized service"],
  ["Free distribution","2026 organic distribution free tools directories communities content search demand generation"]
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

for (const [theme,q] of [...revenueScoutPlan,...researchPlan]) {
  research.push({theme,query:q,results:await ddgSearch(q)});
}

async function googleTrendsUS() {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US",{headers:{"user-agent":"Mozilla/5.0 Build-Guardian/5.0"}});
    if (!res.ok) return [];
    const xml = await res.text();
    const itemPattern = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<traffic>([\s\S]*?)<\/traffic>[\s\S]*?<\/item>/gi;
    return [...xml.matchAll(itemPattern)]
      .slice(0,20)
      .map(m=>({topic:m[1].replace(/<!\[CDATA\[|\]\]>/g,"").trim(),traffic:m[2].replace(/<!\[CDATA\[|\]\]>/g,"").trim()}));
  } catch { return []; }
}
const trendSnapshot = await googleTrendsUS();

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
 ["Google Trends","https://trends.google.com/trends/"],
 ["Google Cloud build AI apps","https://cloud.google.com/use-cases/how-to-build-an-app-with-ai"],
 ["Google Cloud AI agents guide","https://cloud.google.com/resources/content/building-ai-agents"],
 ["Google Play subscriptions","https://developer.android.com/google/play/billing/subscriptions"],
 ["Google Play one-time products","https://developer.android.com/google/play/billing/one-time-products"],
 ["Google Play Billing integration","https://developer.android.com/google/play/billing/integrate"],
 ["Google Ads conversion measurement","https://support.google.com/google-ads/answer/1722022"],
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

const zeroBudgetPlaybook = [
 ["Organic search","Create useful pages around validated buyer questions; track impressions, clicks, leads and sales."],
 ["Direct prospect research","Build small relevant prospect lists from public business information; draft personalized outreach and require human approval before sending."],
 ["Referrals","Ask satisfied customers or contacts for specific introductions; track referral source and conversion."],
 ["Partnerships","Offer referral or fulfillment partnerships to complementary businesses without buying ads."],
 ["Communities","Answer real questions in relevant communities without spam; link only when it directly helps."],
 ["Free lead magnet","Give away a useful calculator, checklist, audit or template that naturally leads to the paid offer."],
 ["Productized service","Sell a fixed-scope result first, then automate the repeated workflow after demand is proven."],
 ["Pre-sell validation","Present the offer and collect qualified interest before spending time building a large product."]
];

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
out+="**Role:** AI 2 engineering guardian + **AI 3 Revenue Scout**. AI 3 continuously refreshes public-web research for zero-cost acquisition, customer pain, fast-to-sell offers, micro-products, recurring revenue, and new AI-app opportunities, then feeds findings into AI 1. AI 2 audits code/build health. Neither silently deploys, spends money, or sends outreach.  Every run refreshes public-web research across customer discovery, monetization, acquisition, retention, unit economics, AI cost control, agent architecture, payments, compliance, and reliability. It audits the codebase and reports concrete gaps. It does not silently deploy, send outreach, spend money, or change production.\n\n";

out+="## AI 3 Revenue Scout\n\n";
out+="- **Freshness loop:** rerun scheduled research and compare new findings against the existing business model before recommending a change.\n";
out+="- **$1,000 sprint:** prioritize offers that can be fulfilled manually with existing free tools, have a clear buyer, a concrete deliverable, and a short path from prospect to payment.\n";
out+="- **Zero-cost rule:** favor free/public research, organic distribution, referrals, partnerships, direct prospecting, and existing infrastructure; flag any tactic that requires paid software, ads, inventory, or credits before use.\n";
out+="- **Evidence rule:** trends are signals, not proof of willingness to pay. Require buyer/problem evidence and verified transactions before declaring a model successful.\n";
out+="- **Never fabricate:** no invented customers, leads, revenue, demand, testimonials, search volume, or conversion rates.\n\n";
out+="## AI 3 revenue sprint intelligence\n\n";
out+="**Target:** $1,000 by Friday, September 25, 2026. This is an execution goal, not a guaranteed outcome. AI 3 must optimize for zero ad spend and near-zero software cost, using free/public research and existing infrastructure wherever possible.\n\n";
out+="### Revenue math to test\n\n";
out+="- Test combinations such as 4 × $250, 5 × $200, 10 × $100, or 20 × $50 based on a real offer and buyer. These are planning scenarios, not forecasts.\n";
out+="- Prioritize offers with a clear buyer, deliverable, price, proof/verification step, and repeatable acquisition path.\n";
out+="- Do not spend on ads, paid data, premium APIs, or software unless the user explicitly approves a cost and the economics are documented first.\n";
out+="- Never claim a sale, lead, customer, trend, or revenue result unless it is verified.\n\n";
out+="### Zero-budget acquisition playbook\n\n";
for(const [name,desc] of zeroBudgetPlaybook) out+=`- **${name}:** ${desc}\n`;
out+="\n";
out+="### AI 3 operating loop\n\n";
out+="- Research demand → identify buyer/problem → formulate offer → calculate price/margin → create free distribution asset → identify qualified prospects → draft personalized outreach → human approval → deliver → verify payment → record conversion → improve offer → repeat.\n";
out+="- Record source, prospect, offer, price, status, next action, conversion, revenue, fulfillment time, and cost on every cycle.\n";
out+="- If a channel produces no qualified signals after a defined test, reallocate effort instead of blindly repeating it.\n\n";
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
