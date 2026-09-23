# OwnerCloud architecture contract

## Why

The repeated Vercel failures exposed an architectural problem: the deployment platform was too close to the application's control path. OwnerCloud separates those concerns.

## Runtime layers

### 1. Control plane
Owns:
- desired configuration
- policy gates
- worker registration
- run IDs
- health
- audit events
- deployment intent

### 2. Worker plane
AI2 and AI3 are independent long-running/scheduled workers. A worker must report:
- started
- executing
- completed or failed
- model/provider
- error class
- evidence produced
- next action

A green deployment does not equal a green worker.

### 3. Provider adapters
Adapters isolate external systems:
- GitHub adapter
- Stripe adapter
- AI model adapter
- email adapter
- hosting adapter

The business logic never calls a hosting provider directly.

### 4. Storage
The next implementation stage should persist:
- runs
- worker heartbeats
- audit events
- verified revenue
- owner approvals
- deployment records

SQLite is suitable for a single-node first version; PostgreSQL can be substituted later.

### 5. Hosting
The first independent host should be a small Linux server/container with:
- systemd or Docker restart policy
- HTTPS reverse proxy
- persistent volume
- firewall
- encrypted secrets
- scheduled worker process

Vercel can remain the frontend host while OwnerCloud is proven. It is not required for worker execution.

## Non-negotiable ownership rule

Vercel, GitHub, Stripe, and AI providers are infrastructure/services. None of them gets authority to redefine owner goals or business policy.
