import fs from "node:fs";

const file = process.argv[2] || "guardian-log.txt";
const log = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const lower = log.toLowerCase();
const sourceFiles = fs.existsSync("src/main.jsx") ? fs.readFileSync("src/main.jsx","utf8") : "";
const pkg = fs.existsSync("package.json") ? fs.readFileSync("package.json","utf8") : "";

const findings = [];
const research = [];
const audit = [];
const add = (severity, title, evidence, repair) => findings.push({severity,title,evidence,repair});
const addAudit = (severity, area, status, evidence, action) => audit.push({severity,area,status,evidence,action});

const queries = [
  "GitHub Actions setup-node Node.js troubleshooting",
  "npm install npm ci lockfile troubleshooting",
  "Vite production build troubleshooting",
  "React JSX production build troubleshooting",
  "Vercel production deployment troubleshooting",
  "AI business automation compliance outreach best practices"
];
async function ddgSearch(q) {
  try {
    const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const res = await fetch(url, {headers: {"user-agent": "Mozilla/5.0 Build-Guardian/2.0"}});
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    return matches.slice(0,5).map(m => ({
      title: m[2].replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#x27;/g,"'").trim(),
      url: m[1]
    }));
  } catch { return []; }
}
for (const q of [...new Set(queries)]) research.push({query:q,results:await ddgSearch(q)});

const official = [
  ["GitHub Actions workflow syntax","https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax"],
  ["GitHub Actions events and schedules","https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows"],
  ["GitHub Actions security","https://docs.github.com/en/actions/reference/security/secure-use"],
  ["Vercel logs","https://vercel.com/academy/vercel-foundations/logs"],
  ["Vite guide","https://vite.dev/guide/"],
  ["npm CLI","https://docs.npmjs.com/cli/"]
];

if (lower.includes("setup-node") && (lower.includes("failed") || lower.includes("error")))
  add("HIGH","Node.js setup failed","The failure occurred during Node setup.","Verify the Node version and setup-node action, then rerun the build.");
if (lower.includes("npm err!") || lower.includes("npm error"))
  add("HIGH","npm dependency installation failed","npm reported an installation error.","Fix the earliest npm error and verify package versions/lockfile.");
if (lower.includes("vite") && (lower.includes("failed") || lower.includes("error")))
  add("HIGH","Vite production build failed","The log contains a Vite/ESBuild failure.","Fix the earliest compiler error before changing unrelated files.");
if (lower.includes("module not found") || lower.includes("cannot find module"))
  add("HIGH","A required module is missing","A referenced module could not be resolved.","Correct the import or add the dependency.");
if (lower.includes("jsx") || lower.includes("unexpected token"))
  add("HIGH","Source syntax/JSX error detected","The compiler reported a parsing problem.","Fix the earliest parser error and keep the change isolated.");
if (lower.includes("environment variable") || lower.includes("missing env"))
  add("MEDIUM","Environment configuration may be missing","The log references missing environment configuration.","Confirm required VITE_* values without committing secrets.");

const requiredModules = ["Research Brain","Content Factory","Repurpose Engine","Growth Loop","Revenue Engine","Trust & Compliance"];
for (const name of requiredModules) {
  const ok = sourceFiles.includes(`title:"${name}"`);
  addAudit(ok ? "PASS" : "HIGH","Business module: "+name,ok ? "Present in the production source." : "Expected module was not found in src/main.jsx.",ok ? "Present." : "Restore the module before treating the business system as complete.");
}
const checks = [
  ["Revenue tracking", /verified income|revenue\.income|Revenue Engine/.test(sourceFiles)],
  ["Compliance preflight", /Trust & Compliance|generateCompliance/.test(sourceFiles)],
  ["Performance feedback loop", /Growth Loop|generateGrowth/.test(sourceFiles)],
  ["Content repurposing", /Repurpose Engine|generateRepurpose/.test(sourceFiles)],
  ["Persistent activity tracking", /aibb_activity/.test(sourceFiles)],
  ["Persistent portfolio tracking", /aibb_portfolio/.test(sourceFiles)],
  ["Approval-gated external actions", /approval-gated|approval/i.test(sourceFiles)],
  ["Client-finding/outreach automation", /client|lead|outreach|prospect/i.test(sourceFiles)]
];
for (const [area,ok] of checks) {
  if (area==="Client-finding/outreach automation") {
    addAudit("HIGH",area,ok ? "FOUND" : "GAP",ok ? "Client/lead/outreach terms exist in the production source." : "No client-finding/outreach workflow was found in the current production source.","Build a dedicated lead research + outreach approval workflow before calling the business system fully autonomous.");
  } else {
    addAudit(ok ? "PASS" : "MEDIUM",area,ok ? "FOUND" : "NOT FOUND",ok ? "Expected capability markers are present." : "Expected capability markers were not found.","Review the production implementation and add the missing capability if required.");
  }
}
const risky = [
  ["External side effects", /fetch\(|window\.open|location\.|mailto:|navigator\.share/.test(sourceFiles)],
  ["Hard-coded secrets", /(sk-[A-Za-z0-9]|AIza[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY)/.test(sourceFiles+pkg)]
];
for (const [area,flag] of risky) addAudit(flag ? "REVIEW" : "PASS",area,flag ? "REQUIRES REVIEW" : "CLEAR",flag ? "Potential external side effect or secret-like material detected by static scan." : "Static scan found no obvious match.","Review the exact source lines; keep secrets in GitHub/Vercel environment variables and gate external actions.");

if (!findings.length) add("INFO","No known build failure signature matched","The current build log did not match a known failure pattern.","Use the business audit and current internet research to guide the next safe improvement.");

const priority={HIGH:0,MEDIUM:1,INFO:2};
findings.sort((a,b)=>priority[a.severity]-priority[b.severity]);

let out="# Build Guardian AI Report\n\n";
out+="**Role:** proactive engineering + business-system auditor for AI 1. It runs scheduled and change-triggered audits, researches current public technical/business guidance, and reports gaps. It does not silently deploy, send outreach, spend money, or change production.\n\n";
out+="## Build diagnosis\n\n";
for(const [i,f] of findings.entries()) out+=`### ${i+1}. [${f.severity}] ${f.title}\n\n**Evidence:** ${f.evidence}\n\n**Repair:** ${f.repair}\n\n`;
out+="## AI 1 business-system audit\n\n";
for(const a of audit) out+=`- **[${a.severity}] ${a.area} — ${a.status}**\n  - Evidence: ${a.evidence}\n  - Next action: ${a.action}\n`;
out+="\n## Internet research\n\n### Official technical references\n\n";
for(const [name,url] of official) out+=`- [${name}](${url})\n`;
out+="\n### Live search results\n\n";
for(const item of research){out+=`**Search:** ${item.query}\n\n`;for(const r of item.results) out+=`- [${r.title}](${r.url})\n`;if(!item.results.length)out+="- No search results returned.\n";out+="\n";}
out+="## Safety gate\n\n- Audit first.\n- Research current documentation before proposing changes.\n- Prefer primary/official sources.\n- Keep business actions approval-gated.\n- Never expose or commit secrets.\n- Require a passing production build before promotion.\n- Keep the known-good production deployment protected.\n";
process.stdout.write(out);
