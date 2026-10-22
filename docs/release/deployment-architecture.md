# Deployment Architecture Proposal

## Current Repository State

- React 18 / Create React App frontend (`packages/frontend`), built as static assets.
- Express/Node.js backend (`packages/backend`), currently JavaScript and started in development through nodemon.
- SQLite via `better-sqlite3` remains the local/test default; a pooled `pg` adapter and versioned PostgreSQL migrations are implemented for the approved production path.
- Application CI defines quality checks and an isolated PostgreSQL 16 migration/integration job. Hosting resources, domains, TLS, external object storage, and production secrets are not yet provisioned.
- Notifications do not dispatch through a real provider; unsupported Email/SMS/WhatsApp submissions fail closed with `503 CHANNEL_UNAVAILABLE`.

## Approved V1 Topology (Provisioning Pending)

Use Render Pro with isolated staging and production services, managed PostgreSQL, and manual approval before production deployment. Prefer single-origin browser routing to reduce cookie/CORS complexity:

```text
Browser -- HTTPS --> reverse proxy / edge
                         ├── static React build
                         └── /v1 API --> one Node.js process
                                           ├── managed PostgreSQL
                                           └── private Cloudflare R2 uploads
```

Provisioning and staging evidence remain pending. Migrations must run through the dedicated commands before web deployment; the application process must not mutate the PostgreSQL schema at startup. Do not enable production until the real PostgreSQL suite, restart persistence, backup/restore rehearsal, and migration-failure recovery pass in staging.

Static frontend may be hosted separately only if API origin, credentialed CORS, `SameSite` cookies, CSRF protections, and allowed origins are explicitly configured and tested. Same-origin routing is preferred for V1.

## Infrastructure Classification

| Capability | Classification | Rationale / decision status |
|---|---|---|
| HTTPS and production domain | REQUIRED FOR V1 | Protects family/student data and secure cookies; domain/provider not selected. |
| Durable database storage | REQUIRED FOR V1 | Managed PostgreSQL is approved; staging/production instances remain unprovisioned. |
| Encrypted off-host backups and restore | REQUIRED FOR V1 | No working repo backup path; recovery target TBD. |
| Single Node API instance/process manager | REQUIRED FOR V1 | Render Pro is approved for the pilot; service provisioning remains pending. |
| Static React hosting or API-served SPA | REQUIRED FOR V1 | Choose one-origin routing after host selection. |
| Secret manager | REQUIRED FOR V1 | No production secrets/configuration system present. |
| Object storage | RECOMMENDED / conditional | Current images stored in SQLite; required if DB/file volume or privacy model cannot support V1. |
| Managed PostgreSQL | REQUIRED FOR V1 | Adapter and migrations exist; CI/staging integration evidence remains pending. |
| Distributed queue/worker | OPTIONAL until async integrations are in V1 | No worker exists. Real notification delivery requires an approved dispatch architecture, but can be post-V1 if notifications are excluded. |
| External monitoring/error reporting | REQUIRED FOR PUBLIC V1 | Provider and alert owner TBD; repo currently has request logs only. |
| Kubernetes/microservices | FUTURE / NOT RECOMMENDED | No current scale or architecture evidence warrants it. |

## Execution Still Required

- Provision Render staging/production services and managed PostgreSQL instances in the approved region.
- Configure domain, DNS, TLS, reverse proxy, and static asset routing.
- Confirm exact service tiers, connection budgets, traffic limits, and support owner.
- Backup frequency, retention, RPO/RTO and restore owner.
- Whether notifications or OAuth are required in V1; if yes, provider and region review.

No cloud account or provider credentials are required to complete these decisions or the initial P0 remediation.
