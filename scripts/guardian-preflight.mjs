import fs from "node:fs";

const fail = (message) => {
  console.error("GUARDIAN PREFLIGHT FAILURE:", message);
  process.exitCode = 1;
};

const read = (path) => {
  if (!fs.existsSync(path)) {
    fail(`Missing required file: ${path}`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
};

const pkgText = read("package.json");
let pkg = null;
try { pkg = JSON.parse(pkgText); } catch (error) { fail(`package.json is invalid JSON: ${error.message}`); }

const guardian = read("scripts/build-guardian.mjs");
const workflow = read(".github/workflows/build-guardian.yml");
const buildWorkflow = read(".github/workflows/build.yml");

const requiredWorkflow = [
  "name: Build Guardian AI + Revenue Scout",
  "workflow_run:",
  "workflow_dispatch:",
  "actions: read",
  "contents: read",
  "issues: write",
  "actions/checkout@v7",
  "actions/github-script@v9",
  "node scripts/build-guardian.mjs guardian-log.txt > guardian-report.md",
  "if: always()"
];
for (const marker of requiredWorkflow) {
  if (!workflow.includes(marker)) fail(`Guardian workflow missing required control: ${marker}`);
}

const requiredBuild = [
  "name: Build Check",
  "actions/checkout@v5",
  "actions/setup-node@v7",
  "node-version: 24",
  "npm install",
  "npm run build"
];
for (const marker of requiredBuild) {
  if (!buildWorkflow.includes(marker)) fail(`Build workflow missing required control: ${marker}`);
}

if (pkg) {
  const deps = pkg.dependencies || {};
  for (const [name, version] of Object.entries(deps)) {
    if (version === "latest" || /^(\^|~)\s*latest$/i.test(version)) {
      fail(`Unpinned dependency detected: ${name}=${version}`);
    }
  }
  for (const script of ["build"]) {
    if (!pkg.scripts?.[script]) fail(`package.json is missing the ${script} script`);
  }
}

const forbiddenSecretPatterns = [
  /sk-[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/
];
for (const [label, text] of [
  ["guardian script", guardian],
  ["guardian workflow", workflow],
  ["build workflow", buildWorkflow],
  ["package.json", pkgText]
]) {
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(text)) fail(`Secret-like material detected in ${label}`);
  }
}

if (guardian) {
  const result = await import("node:child_process").then(({execFileSync}) => {
    try {
      execFileSync(process.execPath, ["--check", "scripts/build-guardian.mjs"], {stdio:"pipe"});
      return true;
    } catch (error) {
      console.error(String(error.stdout || ""));
      console.error(String(error.stderr || ""));
      return false;
    }
  });
  if (!result) fail("scripts/build-guardian.mjs failed Node syntax validation");
}

const diagnosticKnowledge = [
  "earliest error",
  "exit code",
  "dependency",
  "syntax",
  "workflow",
  "environment",
  "rollback",
  "security",
  "approval"
];
for (const term of diagnosticKnowledge) {
  if (!guardian.toLowerCase().includes(term)) fail(`Guardian diagnostic knowledge missing keyword: ${term}`);
}

if (process.exitCode) {
  console.error("Guardian preflight failed. Stop before research/reporting so the failure is actionable.");
} else {
  console.log("Guardian preflight PASS: workflow controls, dependency pinning, syntax validation, secret scan, and diagnostic knowledge checks passed.");
}
