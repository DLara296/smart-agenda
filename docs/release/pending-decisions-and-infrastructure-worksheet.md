# Pending Decisions and Infrastructure Worksheet

**Project:** SmartAgenda  
**Date:** 2026-09-29  
**Status:** Review required before production implementation

Use this document to resolve the remaining product, authorization, architecture, and infrastructure gates. Do not mark a task complete until the decision or evidence is recorded here or linked from here.

## How to Use

1. Review the proposed default and alternatives.
2. Replace each `TBD` with an explicit decision, owner, and date.
3. Record the decision in the linked architecture or release document.
4. Only then start implementation or provisioning work.

## Current Baseline

- Backend and frontend automated suites pass.
- Gmail OAuth2 Email delivery is implemented behind a fail-closed configuration gate.
- SMS, WhatsApp, Google sign-in, Facebook sign-in, and calendar OAuth remain disabled.
- Notification history, dispatch, retry, cancel, and recipient-management actions are admin-only because coordinator-to-school assignments do not yet exist.
- No production hosting, database, secret manager, staging environment, or external credentials have been provisioned.

## Approved Closure From Attached Plan

The attached release plan resolves the previously open planning decisions. These are approved defaults for implementation and provisioning, not proof that the external services have been created:

- Launch model: one-school controlled pilot, with guest/family accounts included behind the release security gates.
- Hosting: Render Pro with isolated Staging and Production environments and manual human approval before every Production deployment.
- Database: paid managed PostgreSQL for Production and a separate lower-cost PostgreSQL database for Staging.
- Uploads: private Cloudflare R2 buckets with separate Staging and Production storage.
- Monitoring: Sentry for application errors and Better Stack plus Render health checks for uptime.
- CI/CD: GitHub Actions with automated checks, staging deployment, and a manual Production approval gate.
- Recovery: encrypted automated backups, 30-day retention, RPO at most 24 hours, RTO at most 4 hours, and a successful isolated restore rehearsal before launch.
- Domain shape: `app.<domain>`, `api.<domain>`, `staging.<domain>`, and `api-staging.<domain>`.
- Deferred: SMS, WhatsApp, Google/Facebook sign-in, calendar OAuth, Redis, autoscaling, multi-region deployment, and preview environments.

Remaining work is execution: application hardening, PostgreSQL migration validation, resource provisioning, secret configuration, privacy/legal review, staging evidence, rollback rehearsal, and final human release approval.

## Decision Summary

| Decision | Recommended default | Decision needed from | Status |
|---|---|---|---|
| V1 capabilities | Core school/family/session workflows; Email delivery conditional on Gmail staging validation; OAuth/calendar sync post-V1 | Product owner | TBD |
| Initial market and region | Mexico; Spanish and English UI/content as required by the launch audience | Product owner | Partially approved |
| Guest accounts | Launch only if family-scope and recovery/support processes are approved | Product owner | TBD |
| Coordinator authorization | Add explicit coordinator-to-school membership; preserve admin-only notification actions until implemented | Product owner/security owner | TBD |
| Expected scale | Start with a single-school, single-instance deployment and documented limits | Product/architecture owner | TBD |
| Production database | Durable SQLite on encrypted persistent storage for a small pilot, or PostgreSQL before multi-instance scale | Architecture owner | TBD |
| Hosting provider | Choose after region, persistence, backup, and operational requirements are approved | Architecture owner | TBD |
| Backup/RPO/RTO | Encrypted daily backups at minimum; targets must be approved before launch | Operations owner | TBD |
| Gmail launch | Email-only Gmail API OAuth2 using `gmail.send`; no SMS/WhatsApp | Product/deployment owner | Approved direction; staging TBD |

## T094: Coordinator-to-School Authorization

### Problem

Coordinator roles currently exist, but there is no persisted school-assignment model. Notification history, dispatch, retry, cancel, and recipient-management actions therefore remain admin-only.

### Recommended solution

Create an explicit `user_school_memberships` model containing:

- `user_id`
- `school_id`
- `role` or permission set
- `status` (`active`, `revoked`)
- `granted_by`
- `created_at`, `updated_at`
- audit records for grant and revocation

Authorize every school-scoped notification operation against an active membership. Keep global administrator access separate from school membership. Do not infer access from a coordinator's role alone.

### Alternatives

| Option | Advantages | Costs / risks | Recommendation |
|---|---|---|---|
| Persisted coordinator-school memberships | Least privilege, auditable, supports future multi-school use | Requires migration, admin UI/API, and authorization tests | Recommended |
| Single-school coordinator configuration | Smallest implementation | Does not scale cleanly and is easy to misconfigure | Acceptable only for a private pilot |
| Allow all coordinators to access all schools | Minimal code | Violates least privilege and cross-school privacy | Reject |

### Approval

- Decision: `TBD`
- Owner: `TBD`
- Date: `TBD`
- Required evidence: migration, grant/revoke flow, cross-school denial tests, notification route tests, audit records.

## T103: V1 Scope and Product Approval

Select one value in each row and record the rationale.

| Capability | Required for V1 | Recommended scope | Decision |
|---|---|---|---|
| School, grade, group, teacher management | Yes | Single-school pilot first | `TBD` |
| Family and guest accounts | Conditional | Launch only with support, recovery, and privacy review | `TBD` |
| Session scheduling and volunteer assignment | Yes | Core workflow | `TBD` |
| Gmail Email notifications | Conditional | Enable only after staging send and consent validation | `TBD` |
| SMS and WhatsApp | No | Keep disabled and visible as unavailable | `TBD` |
| Google/Facebook sign-in | No | Post-V1 | `TBD` |
| Calendar OAuth/two-way sync | No | Keep event-export links only | `TBD` |
| Audit history and operational reporting | Yes | Required for release review | `TBD` |

- Approved capabilities: `TBD`
- Explicitly deferred capabilities: `TBD`
- Product owner: `TBD`
- Approval date: `TBD`

## T103: Region, Locale, and Traffic Assumptions

- Initial country/market: `Mexico` / `TBD`
- Data-processing and residency requirements: `TBD`
- Supported locales: `Spanish` / `English` / `TBD`
- Schools at launch: `TBD`
- Users per school: `TBD`
- Peak concurrent coordinator requests: `TBD`
- Expected notification volume per day: `TBD`
- Support owner and escalation path: `TBD`

The selected values must be reflected in [production-readiness-audit.md](production-readiness-audit.md) and the deployment architecture decision.

## T104-T105: Production Startup and Initial Admin

### Recommended behavior

Production startup must fail closed unless all of the following are true:

- `NODE_ENV=production` is explicit.
- A durable database path or approved database connection is configured.
- Session secrets and required security configuration are present.
- Development demo seeding is disabled.
- Initial-admin provisioning uses a controlled, one-time process with a supplied password or invitation; no known default credentials are accepted.

### Decisions

- Production process command: `TBD`
- Initial-admin provisioning method: `TBD`
- Required environment variables: `TBD`
- Secret manager: `TBD`
- Owner for bootstrap credentials: `TBD`

### Evidence required

- Failing configuration tests first, followed by passing startup tests.
- Production-like startup with missing configuration must not listen.
- Production-like startup with valid configuration must pass readiness checks.
- Demo data and known development credentials must be absent.

## T106-T108: Hosting, Database, Migration, and Recovery

### Architecture choices

| Choice | Best fit | Main tradeoff | Decision |
|---|---|---|---|
| Single host + encrypted persistent SQLite volume | Small pilot, low traffic, current implementation | Single-instance limits and operational volume management | `TBD` |
| Managed PostgreSQL + application host | Multi-school growth and stronger durability | Requires database adapter/migration work | `TBD` |
| Serverless/ephemeral host with local SQLite | None for production data | Data loss or unsupported persistence model | Reject |

### Required decisions

- Hosting provider and region: `TBD`
- Database engine and version: `TBD`
- Persistent storage/encryption model: `TBD`
- Migration command and release gate: `TBD`
- Backup frequency: `TBD`
- Backup retention: `TBD`
- Backup encryption and key owner: `TBD`
- Approved RPO: `TBD`
- Approved RTO: `TBD`
- Restore owner: `TBD`

### Evidence required

- Upgrade from a prior schema in staging.
- Migration failure and recovery rehearsal.
- Backup integrity check.
- Restore into isolated storage.
- Measured RPO/RTO compared with approved targets.
- Restart test proving data persists.

## T109-T110: Environment and Web Security

### Environment separation

| Environment | Database | Secrets | Data policy | Owner |
|---|---|---|---|---|
| Development | Local SQLite | Local `.env`, never committed | Synthetic/local data | `TBD` |
| CI | Ephemeral test database | CI secret store only | Synthetic fixtures | `TBD` |
| Staging | Production-like durable database | Staging secret store | Synthetic/sanitized data | `TBD` |
| Production | Approved durable database | Production secret manager | Real user data | `TBD` |

### Required security decisions

- Allowed frontend origin(s): one canonical HTTPS `FRONTEND_ORIGIN` per environment; exact values are set during domain provisioning.
- Same-origin proxy or credentialed CORS: prefer same-origin routing; backend credentialed CORS allows only `FRONTEND_ORIGIN`.
- Cookie `Secure`, `HttpOnly`, and `SameSite` policy: production session cookies use `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, and seven-day maximum age.
- CSRF defense: unsafe production requests require the exact configured frontend `Origin`.
- Security headers policy: Helmet defaults; validate final CSP and proxy/TLS headers in staging.
- Sign-in, registration, invitation, and notification rate limits: auth 20 requests/15 minutes/IP; invitations 30/hour/IP; notification limits remain `TBD`.
- Upload size/type/storage policy: JSON body limit 3 MB; embedded images are bounded and restricted to approved raster MIME types; private R2 persistence/cleanup remains pending.
- Secret rotation interval and owner: `TBD`

## T111: Authorization and Public-Account Readiness

Before enabling public production accounts, approve and test:

- Admin, coordinator, and guest access for every list, detail, search, history, and export route.
- Cross-family and cross-school denial behavior.
- Secure invitation acceptance and single-use token handling.
- Rate limiting for authentication and invitation endpoints.
- Upload validation and bounded storage behavior.
- Guest account support, recovery, and deactivation ownership.

Decision to enable public guest accounts: `TBD`  
Security reviewer: `TBD`  
Approval date: `TBD`

## T112-T115: Operations, CI/CD, Staging, and Rollback

### Required operational choices

- Health/readiness monitoring provider: `TBD`
- Error reporting provider: `TBD`
- Alert destination and on-call owner: `TBD`
- Request correlation and log retention: `TBD`
- Database and backup freshness monitoring: `TBD`
- CI provider: `TBD`
- Deployment method: `TBD`
- Manual production approval owner: `TBD`
- Staging environment owner: `TBD`
- Rollback authority: `TBD`
- Required monitoring window after release: `TBD`

### Staging acceptance checklist

- [ ] Synthetic or sanitized data only.
- [ ] Auth, guest scope, school scope, and session uniqueness validated.
- [ ] Gmail OAuth token refresh validated, if Email is in V1.
- [ ] Dedicated consented test email completed, if Email is in V1.
- [ ] Migration upgrade and failure recovery rehearsed.
- [ ] Backup and restore rehearsed.
- [ ] Frontend responsive and deep-link behavior validated.
- [ ] Health, logs, alerts, and backup monitoring validated.
- [ ] Frontend, backend, configuration, and database rollback rehearsed.

## T116-T117: Release Approval

Do not deploy production until every applicable item below has an owner and evidence link.

- Release owner: `TBD`
- Production operator: `TBD`
- Approval authority: `TBD`
- Deployment window: `TBD`
- Rollback authority: `TBD`
- Post-release review date: `TBD`

Release decision: `NOT APPROVED`  
Decision date: `TBD`  
Evidence links: `TBD`

## Decision Log

| Date | Decision | Owner | Affected tasks | Evidence / link |
|---|---|---|---|---|
| 2026-09-29 | Gmail API OAuth2 Email-only direction approved; SMS and WhatsApp remain disabled | Product/deployment owner | T088, T091, REL-013 | [Notification contract](../../specs/001-smart-agenda-build/contracts/notification-delivery.md) |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

## Next Review Meeting

- Date/time: `TBD`
- Participants: `TBD`
- Decisions expected: V1 scope, guest launch, coordinator authorization, hosting/database, region, RPO/RTO, and release ownership.
