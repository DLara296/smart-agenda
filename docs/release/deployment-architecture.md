# Deployment Architecture Proposal

## Current Repository State

- React 18 / Create React App frontend (`packages/frontend`), built as static assets.
- Express/Node.js backend (`packages/backend`), currently JavaScript and started in development through nodemon.
- SQLite via `better-sqlite3`; `DATABASE_URL` is a SQLite filename and defaults to `:memory:`.
- No hosting provider, Docker/container config, app CI/CD, domain, TLS, external object storage, or production database adapter was found.
- Notifications do not dispatch through a real provider; unsupported Email/SMS/WhatsApp submissions fail closed with `503 CHANNEL_UNAVAILABLE`.

## V1 Proposal (Not Yet Approved)

Prefer a **single-origin, single-instance deployment** to reduce cookie/CORS complexity:

```text
Browser -- HTTPS --> reverse proxy / edge
                         ├── static React build
                         └── /v1 API --> one Node.js process
                                           ├── durable SQLite volume (only if host guarantees persistent local disk)
                                           └── scheduled backups to encrypted off-host storage
```

This is a proposal based on current implementation, not a provider selection. SQLite requires a single application writer/instance and durable POSIX storage with a verified backup/restore story. Do not horizontally scale the API against a local SQLite file. If the selected host cannot provide durable disk, concurrent access, and tested backups, select managed PostgreSQL and implement/test an adapter/migration before production rather than treating the current `DATABASE_URL` as PostgreSQL-compatible.

Static frontend may be hosted separately only if API origin, credentialed CORS, `SameSite` cookies, CSRF protections, and allowed origins are explicitly configured and tested. Same-origin routing is preferred for V1.

## Infrastructure Classification

| Capability | Classification | Rationale / decision status |
|---|---|---|
| HTTPS and production domain | REQUIRED FOR V1 | Protects family/student data and secure cookies; domain/provider not selected. |
| Durable database storage | REQUIRED FOR V1 | In-memory default loses all state; production DB/volume TBD. |
| Encrypted off-host backups and restore | REQUIRED FOR V1 | No working repo backup path; recovery target TBD. |
| Single Node API instance/process manager | REQUIRED FOR V1 | Match current SQLite semantics; host TBD. |
| Static React hosting or API-served SPA | REQUIRED FOR V1 | Choose one-origin routing after host selection. |
| Secret manager | REQUIRED FOR V1 | No production secrets/configuration system present. |
| Object storage | RECOMMENDED / conditional | Current images stored in SQLite; required if DB/file volume or privacy model cannot support V1. |
| Managed PostgreSQL | OPTIONAL until SQLite host constraints fail | Requires a real adapter/migration path; current code is SQLite-only. |
| Distributed queue/worker | OPTIONAL until async integrations are in V1 | No worker exists. Real notification delivery requires an approved dispatch architecture, but can be post-V1 if notifications are excluded. |
| External monitoring/error reporting | REQUIRED FOR PUBLIC V1 | Provider and alert owner TBD; repo currently has request logs only. |
| Kubernetes/microservices | FUTURE / NOT RECOMMENDED | No current scale or architecture evidence warrants it. |

## Decisions Still Required

- Hosting vendor and deployment region/data residency.
- Durable SQLite volume versus funded/implemented PostgreSQL migration.
- Domain, DNS, TLS, reverse proxy, and static asset routing.
- Expected traffic, concurrent admin count, data volume, and support owner.
- Backup frequency, retention, RPO/RTO and restore owner.
- Whether notifications or OAuth are required in V1; if yes, provider and region review.

No cloud account or provider credentials are required to complete these decisions or the initial P0 remediation.
