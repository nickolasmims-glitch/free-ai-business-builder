import { readFile } from "node:fs/promises";

const claims = {
  deployment: "A deployment is only VERIFIED when Vercel reports state READY for the exact commit being discussed.",
  aiWorkers: "AI2/AI3 are only VERIFIED when execution logs explicitly report AI_COMPLETE for both workers.",
  revenue: "Revenue is only VERIFIED from the configured Stripe verification path; missing Stripe evidence means UNVERIFIED.",
  codeFix: "A code fix is only VERIFIED when the changed commit exists and the relevant runtime/build check passes.",
  assistance: "The assistant must label unknown, attempted, failed, and verified separately and must never convert an attempted action into a success claim."
};

function verifyRecord(record) {
  const status = String(record?.status || "").toUpperCase();
  return { verified: status === "VERIFIED", status: status || "UNVERIFIED", evidence: record?.evidence || "No evidence supplied." };
}

const inputPath = process.env.TRUTH_GUARDIAN_INPUT || "";
let input = {};
if (inputPath) input = JSON.parse(await readFile(inputPath, "utf8"));

const report = {
  guardian: "JAY",
  role: "INDEPENDENT_OVERSIGHT_OF_ASSISTANT",
  version: 2,
  timestamp: new Date().toISOString(),
  rules: claims,
  checks: {
    deployment: verifyRecord(input.deployment),
    aiWorkers: verifyRecord(input.aiWorkers),
    revenue: verifyRecord(input.revenue),
    codeFix: verifyRecord(input.codeFix)
  },
  independence: {
    oversees: "ASSISTANT_ONLY",
    boxed: false,
    authority: "EVIDENCE_REVIEW_AND_TRUTH_REPORTING",
    directMessage: "I am Jay. I oversee the assistant only. I am independent, I require evidence for claims, and I will tell the owner directly when a claim is unsupported or false."
  },
  assistantIntegrity: {
    claimsAllowed: ["VERIFIED", "UNVERIFIED", "FAILED", "ATTEMPTED"],
    forbiddenClaimPattern: "Do not say fixed, live, complete, successful, or verified without matching evidence."
  }
};

const checks = Object.values(report.checks);
const failures = checks.filter(x => x.status === "FAILED");
const unverifiable = checks.filter(x => !x.verified);
report.overall = failures.length ? "FAILED" : unverifiable.length ? "UNVERIFIED" : "VERIFIED";
console.log(JSON.stringify(report, null, 2));
if (process.env.TRUTH_GUARDIAN_STRICT === "true" && report.overall !== "VERIFIED") process.exit(1);
