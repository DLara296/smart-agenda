# Production Release Checklist

Use this as a gated checklist. Do not mark an item complete without linked evidence (test run, config review, rehearsal, or approval).

## Scope and Governance

- [ ] V1 capability matrix approved by product owner.
- [ ] Data residency, target countries/locales, support owner, and release owner identified.
- [ ] P0/P1 audit findings have owners, tasks, and acceptance evidence.
- [ ] Notification channels not actually integrated are explicitly excluded or blocked in UI/API.

## P0 Security and Durability

- [ ] Guest session listing is family/school scoped and cross-scope denial regression test passes.
- [ ] Production startup fails closed without explicit production mode, durable database, and required configuration.
- [ ] Development admin/demo data provisioning cannot run in production.
- [ ] Production has durable persistence; restart does not lose user data.
- [ ] Automated encrypted backups and retention are enabled.
- [ ] Restore has been rehearsed; measured RPO/RTO meet owner-approved objectives.

## Build and CI

- [ ] Backend tests pass.
- [ ] Frontend tests pass.
- [ ] Lint passes.
- [ ] Production frontend build passes.
- [ ] Production backend start command is deterministic and does not use nodemon.
- [ ] CI runs install, lint, tests, build, migration validation, and artifact checks.
- [ ] Production deployment requires manual approval and records release identity.

## Database and Files

- [ ] Production DB/volume is provisioned and access restricted.
- [ ] Migration command is controlled, repeatable, and tested against a staging copy.
- [ ] Session uniqueness and referential constraints are verified in production engine.
- [ ] Migration failure and data recovery procedures are rehearsed.
- [ ] Image/data URL storage capacity, backup impact, and restore time are acceptable, or private object storage is implemented.

## Authentication and Security

- [ ] Password/session behavior and session expiration are reviewed.
- [ ] Secure, HttpOnly, SameSite cookies validated on deployment domains.
- [ ] CORS allows only intended origins and supports credentials only where required.
- [ ] CSRF defense selected and tested for cookie-authenticated writes.
- [ ] Admin/coordinator/guest authorization verified by API tests, including cross-school and cross-family cases.
- [ ] Rate limiting enabled for sign-in, registration, invitations, and other sensitive flows.
- [ ] Request validation, security headers, upload limits, and error redaction reviewed.
- [ ] Secret scanner run on tracked history/content; findings triaged and any exposed secrets rotated.

## External Services

- [ ] Every V1 external service has a named owner, approved provider, region, sender identity, callback/origin setup, and failure behavior.
- [ ] Credentials are installed directly in the production secret manager and rotation is documented.
- [ ] Email/SMS/WhatsApp delivery is tested only for approved channels; queue state is not reported as delivery.
- [ ] OAuth is either tested end-to-end or explicitly excluded from V1.
- [ ] Calendar exports are described as external links unless OAuth/calendar sync is implemented.

## Operations

- [ ] Readiness health check validates process and database connectivity without destructive writes.
- [ ] Structured logs, request IDs, metrics, error reporting, and privacy redaction are enabled.
- [ ] Alerts have a named recipient and an exercised delivery path.
- [ ] Queue/worker health and lag are monitored if asynchronous jobs are enabled.
- [ ] Rollback procedures for frontend, backend, configuration, and database are approved.
- [ ] Staging resembles production topology without real production data.

## Launch Approval

- [ ] Staging critical-path and smoke tests pass.
- [ ] Database migration and backup/restore evidence reviewed.
- [ ] P0 blockers resolved; accepted P1 exceptions have owner and mitigation.
- [ ] Production deployment window, operator, approver, and rollback authority identified.
- [ ] Post-release monitoring window and incident contact are scheduled.
