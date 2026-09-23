import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const memoryPath = process.env.JAY_MEMORY_FILE || ".jay/jay-memory.json";
await mkdir(dirname(memoryPath), { recursive: true });

let memory = { version: 1, guardian: "Jay", observations: [], rulesLearned: [], stats: { audits: 0, verified: 0, unverified: 0, failed: 0 } };
try { memory = JSON.parse(await readFile(memoryPath, "utf8")); } catch {}

const observation = {
  timestamp: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || "unknown",
  workflow: process.env.GITHUB_WORKFLOW || "unknown",
  event: process.env.GITHUB_EVENT_NAME || "unknown",
  lesson: "Evidence must match the exact claim. A code commit is not proof of production, worker completion, or revenue."
};

memory.observations.push(observation);
memory.observations = memory.observations.slice(-100);

const rules = [
  "Never promote ATTEMPTED to VERIFIED.",
  "Never infer production status from a Git commit.",
  "Never infer AI2/AI3 completion without explicit AI_COMPLETE evidence.",
  "Never infer revenue without verified payment evidence.",
  "When evidence conflicts, report the conflict instead of choosing the convenient result.",
  "Track failures as lessons and use them to strengthen future verification.",
  "The assistant's confidence is not evidence.",
  "Jay reports directly to the owner and has no containment boundary."
];

memory.rulesLearned = [...new Set([...memory.rulesLearned, ...rules])];
memory.stats.audits += 1;
await writeFile(memoryPath, JSON.stringify(memory, null, 2) + "\n");

console.log(JSON.stringify({
  guardian: "Jay",
  mode: "LEARNING",
  memoryFile: memoryPath,
  observationsStored: memory.observations.length,
  rulesLearned: memory.rulesLearned.length,
  directMessage: "I learn from evidence and failures, not from trusting the assistant.",
  status: "JAY_LEARNING_UPDATED"
}, null, 2));
