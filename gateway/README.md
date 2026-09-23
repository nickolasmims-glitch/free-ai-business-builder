# Customer Gateway — ground-up build

This is a new customer-owned gateway implementation. It does not depend on Vercel or Lovable.

## Architecture
- Customer web app + website builder UI.
- Node gateway API.
- Gemini integration with Google Search-capable tool use.
- AI planner and autonomous bot evaluator.
- Visible owner alerts and append-style audit events for bot creation, deletion, AI plans, and upgrade proposals.
- PostgreSQL persistence when DATABASE_URL is configured.
- Docker container suitable for Google Cloud Run.

Google's current documentation describes Gemini agents/tools for multi-step execution and Google Search, while Cloud Run supports services, jobs, worker pools, and long-lived instances. See:
- https://ai.google.dev/gemini-api/docs/agents
- https://ai.google.dev/gemini-api/docs/tools
- https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run

## Important operating rule
"Autonomous" here means the system can reason, plan, call approved tools, create/delete its own bot records, and propose upgrades. It does not mean hidden or unrestricted destructive access. Every material bot/upgrade action is recorded and surfaced to the owner. Security-sensitive or destructive infrastructure changes should require explicit owner approval.

## Production
For real durability, deploy the container with PostgreSQL (Cloud SQL or another managed PostgreSQL service) and a worker runtime. The included local JSON persistence is for development only.

## High-capacity operating mode

The gateway is designed for horizontal scaling rather than a single browser session. The Cloud Run service is configured for warm instances, autoscaling, request concurrency, CPU/memory limits, startup/liveness probes, and a separate Worker Pool for continuous AI2/AI3 work.

### Reliability rules
- AI2 and AI3 run as distinct agent identities even though they share the worker image.
- Worker instances use a PostgreSQL advisory lock so multiple replicas do not execute the same planning cycle at the same time.
- Every bot creation, deletion, upgrade proposal, and worker error is recorded in the audit stream.
- The audit stream is hash-linked so later events can be checked against earlier events.
- External owner alerts are attempted through ALERT_WEBHOOK_URL; the in-app alert remains recorded even when external delivery is unavailable.
- /api/health checks PostgreSQL connectivity and required owner authentication configuration.
- /api/ready is a deployment readiness gate.
- /api/metrics exposes operational counts for the owner.
- Request bodies are bounded and API requests are rate-limited.
- Security-sensitive or destructive infrastructure changes remain owner-controlled; autonomous planning cannot silently bypass owner control.

### Deployment
Use .github/workflows/google-cloud-deploy.yml after configuring GitHub OIDC/Workload Identity Federation secrets: GCP_PROJECT_ID, GCP_REGION, GCP_WIF_PROVIDER, and GCP_SERVICE_ACCOUNT.

The deployment pipeline builds both the customer gateway and AI2/AI3 worker images into Google Artifact Registry and deploys the service and worker pool directly to Google Cloud. It does not require Vercel or Lovable.

### Deployment credential preflight
Before Google authentication, the deployment workflow checks that these GitHub Actions secrets are present: GCP_PROJECT_ID, GCP_REGION, GCP_WIF_PROVIDER, and GCP_SERVICE_ACCOUNT. If any are missing, the run stops with the exact missing secret names instead of failing inside the Google auth action. Runtime application secrets GEMINI_API_KEY, DATABASE_URL, and OWNER_ACCESS_TOKEN are checked after authentication.


### Deployment trigger marker
This marker commit is used to trigger the validated Ground-Up Gateway CI path so the Google Cloud deployment workflow can run from the current branch head.
