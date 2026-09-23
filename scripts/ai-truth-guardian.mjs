import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const claims = {
  deployment: "A deployment is only VERIFIED when Vercel reports state READY for the exact commit being discussed.",
  aiWorkers: "AI2/AI3 are only VERIFIED when execution logs explicitly report AI_COMPLETE for both workers.",
  revenue: "Revenue is only VERIFIED from the configured Stripe verification path; missing Stripe evidence means UNVERIFIED.",
  codeFix: "A code fix is only VERIFIED when the changed commit exists and the relevant runtime/build check passes.",
  assistance: "The assistant must label unknown, attempted, failed, and verified separately and must never convert an attempted action into a success claim."
};

function verifyRecord(record) {
  const status = String(record?.status || "").toUpperCase();
  return {
    verified: status === "VERIFIED",
    status: status || "UNVERIFIED",
    evidence: record?.evidence || "No evidence supplied."
  };
}

const inputPath = process.env.TRUTH_GUARDIAN_INPUT || "";
let input = {};
if (inputPath) {
  input = JSON.parse(await readFile(inputPath, "utf8"));
}

const report = {
  guardian: "TRUTH_GUARDIAN",
  version: 1,
  timestamp: new Date().toISOString(),
  rules: claims,
  checks: {
    deployment: verifyRecord(input.deployment),
    aiWorkers: verifyRecord(input.aiWorkers),
    revenue: verifyRecord(input.revenue),
    codeFix: verifyRecord(input.codeFix)
  },
  assistantIntegrity: {
    claimsAllowed: ["VERIFIED", "UNVERIFIED", "FAILED", "ATTEMPTED"],
    forbiddenClaimPattern: "Do not say fixed, live, complete, successful, or verified without matching evidence.",
    directMessage: "I am the Truth Guardian. I do not decide whether the assistant is truthful by trust. I require evidence for each claim."
  }
};

const failures = Object.values(report.checks).filter(x => x.status === "FAILED");
const unverifiable = Object.values(report.checks).filter(x => !x.verified);
report.overall = failures.length ? "FAILED" : unverifiable.length ? "UNVERIFIED" : "VERIFIED";
console.log(JSON.stringify(report, null, 2));
if (process.env.TRUTH_GUARDIAN_STRICT === "true" && report.overall !== "VERIFIED") process.exit(1);
