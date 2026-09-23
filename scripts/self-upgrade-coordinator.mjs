import { readFile, writeFile, mkdir } from "node:fs/promises";

const agents = ["JAY", "AI2", "AI3"];
const allowed = [
  "scripts/jay-truth-guardian.mjs",
  "scripts/jay-learning-engine.mjs",
  "scripts/jay-evidence-collector.mjs",
  "workflows/steps/ai-agents.js",
  "workflows/ai2-ai3.js"
];

const memoryFile = ".jay/self-upgrade-history.json";
await mkdir(".jay", { recursive: true });

let history = { version: 1, upgrades: [] };
try { history = JSON.parse(await readFile(memoryFile, "utf8")); } catch {}

const plan = {
  JAY: {
    mission: "Improve evidence quality, contradiction detection, audit memory, and claim verification.",
    neverChange: ["owner approval gates", "financial authorization rules", "scope of oversight"]
  },
  AI2: {
    mission: "Improve research quality, opportunity discovery, execution reliability, and useful revenue-work output.",
    neverChange: ["financial authority", "owner approval gates", "truth requirements"]
  },
  AI3: {
    mission: "Improve independent research, validation, testing, and delivery quality.",
    neverChange: ["financial authority", "owner approval gates", "truth requirements"]
  }
};

const cycle = {
  timestamp: new Date().toISOString(),
  agents,
  allowedFiles: allowed,
  plans: plan,
  rule: "SELF_UPGRADE_PROPOSE_TEST_VERIFY",
  requirement: "No upgrade is accepted merely because an agent claims it is better. It must pass repository checks and preserve protected rules."
};

history.upgrades.push(cycle);
history.upgrades = history.upgrades.slice(-50);
await writeFile(memoryFile, JSON.stringify(history, null, 2) + "\n");

console.log(JSON.stringify({
  guardian: "Jay",
  status: "SELF_UPGRADE_COORDINATOR_READY",
  agents,
  mode: "controlled",
  nextAction: "Each agent may propose improvements only inside the allowlist; verification gates decide acceptance.",
  protected: ["financial authority", "owner approval", "truth verification"],
  historyEntries: history.upgrades.length
}, null, 2));
