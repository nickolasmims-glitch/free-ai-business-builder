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
