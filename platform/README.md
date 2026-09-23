# OwnerCloud — our own Vercel vision

OwnerCloud is the control plane for this project. Vercel is treated as optional infrastructure, not the authority.

## Control model

Owner → OwnerCloud Control Plane → Scheduler → Workers → Providers

- **Owner**: final authority over goals, policies, credentials, spending, deployments, and irreversible actions.
- **Control Plane**: stores desired state, validates policy, records runs, health, and deployment intent.
- **Scheduler**: triggers work independently of a browser session.
- **Workers**: AI2, AI3, payments/revenue verification, research, and fulfillment workers.
- **Providers**: GitHub, Stripe, AI Gateway, email, and optional hosting providers.

## Design goals

1. No browser dependency for background work.
2. No Vercel dependency for business decisions.
3. Provider failures must be isolated and visible.
4. Every run gets an ID and an append-only audit record.
5. AI2/AI3 cannot change owner goals or spending policy.
6. Secrets never live in source control.
7. The platform can migrate from Vercel to a VPS/container/Kubernetes host without rewriting business logic.
8. Health means end-to-end worker execution, not merely a successful deployment.

## Migration stages

- Stage 1: establish the OwnerCloud contract and control state.
- Stage 2: move scheduling/worker execution behind the control plane.
- Stage 3: add persistent run/audit storage.
- Stage 4: add independent worker hosting and failover.
- Stage 5: make Vercel optional for the UI only.
