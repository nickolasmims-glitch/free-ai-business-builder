import fs from "node:fs";

const file = process.argv[2] || "guardian-log.txt";
const log = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const lower = log.toLowerCase();

const findings = [];
const add = (severity, title, evidence, repair) => findings.push({severity,title,evidence,repair});

if (lower.includes("cache: npm") || lower.includes("some specified paths were not resolved")) {
  add("HIGH","Node dependency cache configuration is invalid or incomplete",
    "setup-node reported a cache/path problem. This commonly happens when npm caching is enabled without a lockfile.",
    "Use setup-node without cache, or commit a package-lock.json before enabling npm caching.");
}
if (lower.includes("setup-node") && (lower.includes("failed") || lower.includes("error"))) {
  add("HIGH","Node.js setup failed",
    "The failure occurred during setup-node, before dependency installation or the Vite build.",
    "Verify the Node version and setup-node action, then retry on ubuntu-latest.");
}
if (lower.includes("npm ci") && lower.includes("lockfile")) {
  add("HIGH","npm ci cannot use the current lockfile state",
    "npm ci requires a compatible package-lock.json or npm-shrinkwrap.json.",
    "Commit a valid package-lock.json or use npm install until the lockfile is restored.");
}
if (lower.includes("npm err!") || lower.includes("npm error")) {
  add("HIGH","npm dependency installation failed",
    "npm reported an installation error.",
    "Read the first npm error, verify package versions, and regenerate the lockfile if necessary.");
}
if (lower.includes("vite") && (lower.includes("failed") || lower.includes("error"))) {
  add("HIGH","Vite production build failed",
    "The log contains a Vite/ESBuild failure.",
    "Fix the earliest Vite/ESBuild error before changing unrelated files.");
}
if (lower.includes("module not found") || lower.includes("cannot find module")) {
  add("HIGH","A required module is missing",
    "The build references a module that could not be resolved.",
    "Add the dependency to package.json or correct the import path, then rebuild.");
}
if (lower.includes("jsx") || lower.includes("unexpected token")) {
  add("HIGH","Source syntax/JSX error detected",
    "The compiler reported a syntax or JSX parsing problem.",
    "Fix the earliest parser error and keep the change isolated to the affected file.");
}
if (lower.includes("environment variable") || lower.includes("missing env")) {
  add("MEDIUM","Environment configuration may be missing",
    "The log references environment configuration.",
    "Confirm required VITE_* values exist where the feature actually needs them. Never commit secrets.");
}
if (findings.length === 0) {
  add("INFO","No known failure signature matched",
    "The guardian did not find a recognized pattern in the supplied log.",
    "Inspect the earliest non-warning error and run npm run build before changing production code.");
}

const priority = {HIGH:0,MEDIUM:1,INFO:2};
findings.sort((a,b)=>priority[a.severity]-priority[b.severity]);

let out = "# Build Guardian AI Report\n\n";
out += "**Role:** independent build, CI, and repair reviewer for Free AI Business Builder.\n\n";
out += "The guardian diagnoses failures and proposes the smallest repair path. It does not deploy or modify production automatically.\n\n";
for (const [i,f] of findings.entries()) {
  out += `## ${i+1}. [${f.severity}] ${f.title}\n\n`;
  out += `**Evidence:** ${f.evidence}\n\n`;
  out += `**Repair:** ${f.repair}\n\n`;
}
out += "## Safety gate\n\n";
out += "- Diagnose first.\n- Change one feature at a time.\n- Require a passing production build before promotion.\n- Keep the known-good production deployment protected from experiments.\n";
process.stdout.write(out);
