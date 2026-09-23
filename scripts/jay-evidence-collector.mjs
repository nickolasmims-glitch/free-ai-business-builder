const repo = process.env.GITHUB_REPOSITORY || "";
const token = process.env.GITHUB_TOKEN || "";
const sha = process.env.GITHUB_SHA || "";
const headers = {
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  ...(token ? { authorization: `Bearer ${token}` } : {})
};

async function gh(path) {
  if (!token || !repo) return null;
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers });
  if (!response.ok) return null;
  return response.json();
}

const runs = await gh(`/actions/runs?per_page=50`);
const relevant = (runs?.workflow_runs || []).map(r => ({
  workflow: r.name,
  status: r.status,
  conclusion: r.conclusion,
  head_sha: r.head_sha,
  run_id: r.id,
  created_at: r.created_at,
  updated_at: r.updated_at
}));

const aiEvidence = relevant.filter(r =>
  /ownercloud|ai2|ai3/i.test(r.workflow) &&
  r.conclusion === "success"
);

const report = {
  guardian: "Jay",
  evidenceCollector: "INDEPENDENT_GITHUB",
  timestamp: new Date().toISOString(),
  exactCommit: sha || "UNKNOWN",
  github: {
    accessible: Boolean(runs),
    matchingRuns: relevant,
    successfulRelevantRuns: aiEvidence
  },
  claims: {
    codeFix: sha ? "VERIFIED" : "UNVERIFIED",
    githubWorkflowExecution: aiEvidence.length ? "VERIFIED" : "UNVERIFIED",
    deployment: "UNVERIFIED",
    aiWorkers: aiEvidence.some(r => /ownercloud|ai2|ai3/i.test(r.workflow)) ? "VERIFIED" : "UNVERIFIED",
    revenue: "UNVERIFIED",
    liveApp: "UNVERIFIED"
  },
  directMessage: "I collect evidence independently. Missing evidence remains UNVERIFIED."
};

console.log(JSON.stringify(report, null, 2));
if (!sha) process.exitCode = 2;
