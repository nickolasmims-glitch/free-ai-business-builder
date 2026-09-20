import fs from "node:fs";

const file = process.argv[2] || "guardian-log.txt";
const log = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const lower = log.toLowerCase();
const sourceFiles = fs.existsSync("src/main.jsx") ? fs.readFileSync("src/main.jsx","utf8") : "";
const pkg = fs.existsSync("package.json") ? fs.readFileSync("package.json","utf8") : "";

const findings = [], audit = [], research = [];
const add = (severity,title,evidence,repair) => findings.push({severity,title,evidence,repair});
const addAudit = (severity,area,status,evidence,action) => audit.push({severity,area,status,evidence,action});

const queries = [
  "2026 AI SaaS monetization pricing usage based hybrid subscriptions",
  "2026 SaaS customer acquisition CAC LTV retention referral growth",
  "2026 AI app product validation customer discovery willingness to pay",
  "2026 AI agent business automation ROI workflow software",
  "2026 small business lead generation outreach compliance FTC CAN SPAM",
  "2026 SaaS payments subscriptions usage billing Stripe docs",
  "2026 Vercel production deployment reliability observability",
  "2026 GitHub Actions secure automation least privilege scheduled workflows"
];

async function ddgSearch(q) {
  try {
    const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const res = await fetch(url,{headers:{"user-agent":"Mozilla/5.0 Build-Guardian/3.0"}});
    if (!res.ok) return [];
    const html = await res.text();
    return [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .slice(0,5).map(m=>({
        title:m[2].replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#x27;/g,"'").trim(),
        url:m[1]
      }));
  } catch { return []; }
}
for (const q of queries) research.push({query:q,results:await ddgSearch(q)});

const official = [
 ["Stripe AI pricing","https://stripe.com/guides/pricing-ai-products-lessons-from-leading-ai-companies"],
 ["Stripe SaaS pricing","https://stripe.com/resources/more/saas-pricing-and-packaging-strategy"],
 ["Stripe usage pricing","https://stripe.com/resources/more/usage-based-pricing-strategy-for-saas"],
 ["Stripe CAC","https://stripe.com/resources/more/cac-in-saas"],
 ["GitHub workflow syntax","https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax"],
 ["GitHub events/schedules","https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows"],
 ["GitHub security","https://docs.github.com/en/actions/reference/security/secure-use"],
 ["Vercel logs","https://vercel.com/academy/vercel-foundations/logs"],
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
 ["Offer/pricing model",/price|pricing|offer|plan|subscription|usage/i],
 ["Customer acquisition",/client|lead|prospect|outreach|acquisition|customer/i],
 ["Retention/engagement",/retention|repeat|return|engagement|churn/i],
 ["Unit economics",/CAC|LTV|margin|cost|expense|profit|break.?even/i],
 ["Conversion funnel",/conversion|click|signup|checkout|purchase|funnel/i],
 ["Payment readiness",/stripe|payment|checkout|billing|subscription/i],
 ["Experiment/market validation",/experiment|test|validate|feedback|research/i]
];
for (const [area,re] of checks) {
  const ok=re.test(sourceFiles);
  const severity=ok?"PASS":(["Offer/pricing model","Customer acquisition","Unit economics","Conversion funnel","Payment readiness"].includes(area)?"HIGH":"MEDIUM");
  addAudit(severity,area,ok?"FOUND":"GAP",ok?"Relevant implementation markers exist.":"No strong implementation marker was found in the production source.",ok?"Continue measuring it.":"Add a concrete workflow/UI/data model and verify it with the production build.");
}

const risky=[
 ["External side effects",/fetch\(|window\.open|location\.|mailto:|navigator\.share/.test(sourceFiles)],
 ["Hard-coded secrets",/(sk-[A-Za-z0-9]|AIza[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY)/.test(sourceFiles+pkg)]
];
for(const [area,flag] of risky)
  addAudit(flag?"REVIEW":"PASS",area,flag?"REQUIRES REVIEW":"CLEAR",flag?"Potential external side effect or secret-like material detected.":"Static scan found no obvious match.",flag?"Review exact lines; keep secrets in GitHub/Vercel environment variables and gate external actions.":"Keep this check in every audit.");

if(!findings.length) add("INFO","No known build failure signature matched","The current log did not match a known failure pattern.","Use the business audit and current research to choose the next safe improvement.");

let out="# Build Guardian AI Report\n\n";
out+="**Role:** proactive engineering, monetization, growth, and business-system research agent for AI 1. It refreshes its public-web knowledge every run, audits the codebase, and reports actionable gaps. It does not silently deploy, send outreach, spend money, or change production.\n\n";
out+="## Money-making app knowledge audit\n\n";
out+="- **Value before price:** identify the customer problem, measurable outcome, and value metric before choosing what users pay for.\n";
out+="- **Monetization:** consider subscription, usage-based, hybrid, outcome-based, or credit models; align price with delivered value and variable AI cost.\n";
out+="- **Unit economics:** track revenue, gross margin, acquisition cost (CAC), lifetime value (LTV), churn/retention, conversion, and payback.\n";
out+="- **Growth:** test acquisition channels, landing-page conversion, referrals, content, partnerships, and repeat usage rather than assuming traffic becomes revenue.\n";
out+="- **Validation:** research real customer pain, test an offer early, measure willingness to pay, and iterate from observed behavior.\n";
out+="- **AI cost control:** use model/call budgets, usage limits, caching where appropriate, and spending alerts so AI costs cannot silently outrun revenue.\n";
out+="- **Trust:** keep claims accurate, protect credentials, disclose automation where appropriate, and gate external actions that can message customers or spend money.\n\n";
out+="## Build diagnosis\n\n";
for(const [i,f] of findings.entries()) out+=`### ${i+1}. [${f.severity}] ${f.title}\n\n**Evidence:** ${f.evidence}\n\n**Repair:** ${f.repair}\n\n`;
out+="## AI 1 business-system audit\n\n";
for(const a of audit) out+=`- **[${a.severity}] ${a.area} — ${a.status}**\n  - Evidence: ${a.evidence}\n  - Next action: ${a.action}\n`;
out+="\n## Internet research\n\n### Official references\n\n";
for(const [name,url] of official) out+=`- [${name}](${url})\n`;
out+="\n### Live web research results\n\n";
for(const item of research){out+=`**Search:** ${item.query}\n\n`;for(const r of item.results)out+=`- [${r.title}](${r.url})\n`;if(!item.results.length)out+="- No results returned.\n";out+="\n";}
out+="## Next-build decision framework\n\n";
out+="- 1. Find a real problem and target customer.\n- 2. Define a measurable value metric.\n- 3. Build the smallest useful workflow.\n- 4. Add a clear offer and payment path.\n- 5. Instrument acquisition → activation → conversion → retention → revenue.\n- 6. Measure CAC, LTV, margin, AI cost, and payback.\n- 7. Run one controlled improvement at a time.\n- 8. Promote only after production build and safety checks pass.\n\n";
out+="## Safety gate\n\n- Research current documentation before proposing changes.\n- Prefer primary/official sources for technical and payments guidance.\n- Never expose or commit secrets.\n- Keep outreach, purchases, payments, and other external side effects approval-gated until explicitly connected and tested.\n- Require a passing production build before promotion.\n- Protect the known-good production deployment.\n";
process.stdout.write(out);
