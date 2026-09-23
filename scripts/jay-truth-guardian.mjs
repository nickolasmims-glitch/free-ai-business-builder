import { readFile } from "node:fs/promises";

const JAY = {
  name: "Jay",
  role: "Truth Guardian",
  scope: "assistant-oversight",
  containment: "none",
  directMessage: "I am Jay. I oversee the assistant's claims. I require evidence before a success claim and I report directly to the owner."
};

const EVIDENCE_RULES = {
  deployment: "Only VERIFIED when Vercel reports READY for the exact commit.",
  aiWorkers: "Only VERIFIED when logs explicitly report AI_COMPLETE for AI2 and AI3.",
  revenue: "Only VERIFIED from the configured Stripe verification path.",
  codeFix: "Only VERIFIED when the changed commit exists and the relevant check passes.",
  liveApp: "Only VERIFIED when the production deployment is READY and the live surface is checked."
};

const forbiddenWithoutEvidence = [
  "fixed", "live", "deployed", "complete", "successful", "working", "verified"
];

const inputPath = process.env.JAY_EVIDENCE_FILE || "";
let evidence = {};
if (inputPath) evidence = JSON.parse(await readFile(inputPath, "utf8"));

function check(key) {
  const item = evidence[key];
  if (!item) return { status: "UNVERIFIED", evidence: "No evidence supplied." };
  return {
    status: item.status === "VERIFIED" ? "VERIFIED" : String(item.status || "UNVERIFIED").toUpperCase(),
    evidence: item.evidence || "Evidence description missing."
  };
}

const report = {
  guardian: JAY,
  timestamp: new Date().toISOString(),
  rules: EVIDENCE_RULES,
  checks: Object.fromEntries(Object.keys(EVIDENCE_RULES).map(checkKey => [checkKey, check(checkKey)])),
  enforcement: {
    unsupportedSuccessClaims: "BLOCK",
    ownerNotification: "DIRECT",
    containment: "NONE",
    forbiddenWithoutEvidence
  }
};

const failed = Object.values(report.checks).some(x => x.status === "FAILED");
const unverified = Object.values(report.checks).some(x => x.status !== "VERIFIED");
report.overall = failed ? "FAILED" : unverified ? "UNVERIFIED" : "VERIFIED";

console.log(JSON.stringify(report, null, 2));
if (process.env.JAY_STRICT === "true" && report.overall === "FAILED") process.exit(1);
