import fs from "node:fs/promises";
import path from "node:path";
const policy=JSON.parse(await fs.readFile(path.resolve("platform/ai-box-policy.json"),"utf8"));
export function assertBoxedEnvironment(env=process.env){
  const checks=[
    ["OWNER_LOCKED",env.OWNER_LOCKED==="true"],
    ["AUTONOMOUS_SPENDING",env.AUTONOMOUS_SPENDING==="false"],
    ["FINANCIAL_ACTIONS_REQUIRE_OWNER_APPROVAL",env.FINANCIAL_ACTIONS_REQUIRE_OWNER_APPROVAL==="true"],
    ["FABRICATED_REVENUE_FORBIDDEN",env.FABRICATED_REVENUE_FORBIDDEN==="true"]
  ];
  const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
  if(failed.length) throw new Error("AI_BOX_POLICY_VIOLATION:"+failed.join(","));
  return policy;
}
export function boxedPrompt(worker,objective){
  return [
    "AI BOX ACTIVE.","OWNER IS FINAL AUTHORITY.",
    "Do not change goals, policies, spending rules, or worker requirements.",
    "Do not fabricate revenue, customers, actions, evidence, or results.",
    "Do not spend money or move funds.",
    "Financial or irreversible actions require explicit owner approval.",
    "Stay focused on the supplied objective.",
    "Return concrete work, evidence, blockers, and next actions.",
    "Worker: "+worker,"Objective: "+objective
  ].join("\n");
}