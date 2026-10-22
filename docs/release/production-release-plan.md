# SmartAgenda Production Release Plan

**Status:** Planning only; no infrastructure selected or provisioned.
**Audit:** [production-readiness-audit.md](production-readiness-audit.md)
**Date:** 2026-09-29

## Decision Summary

SmartAgenda is not production-ready. The test/build baseline is healthy, but there are confirmed production blockers: guest access to the global session list, known development-admin fallback risk, ephemeral default storage, and no verified backup/restore process. Real notifications are not implemented and must remain out of V1 or become an explicit delivery workstream.

Do not choose a cloud provider or deploy production until Phase 0 P0 fixes and the owner approves V1 scope, data region, hosting, and recovery targets.

## Phases

| Phase | Objective | Blocking | Exit criteria |
|---|---|---:|---|
| 0. Readiness audit | Establish verified current state and severity | Complete | Audit report reviewed; unresolved inputs assigned. |
| 1. P0 remediation | Close guest data leakage, startup fallback, ephemeral storage, backup/restore | Yes | Regression/security tests pass; production startup fails closed; restore rehearsal passes. |
| 2. V1 scope & architecture | Approve capabilities, hosting topology, data region, and operating model | Yes | Product owner approves V1 matrix and architecture decision. |
| 3. Environments & secrets | Isolate dev/test/staging/prod config and secret handling | Yes | Validated environment schema and secret manager ownership exist. |
| 4. Database & media | Select production persistence; migrations, backups, restore, media plan | Yes | Staging migration and restore tests pass; RPO/RTO approved. |
| 5. Backend release | Production startup, secure cookies/CORS, health, logs, process lifecycle | Yes | Staging API health/readiness and auth smoke tests pass. |
| 6. Frontend release | Build/hosting/API routing/cache/deep-link behavior | Yes | Staging frontend uses the production-like API/auth topology successfully. |
| 7. Security & access | Auth, roles, scope, rate limiting, CSRF, headers, uploads | Yes | Security checklist passes; critical authorization regression tests pass. |
| 8. External services | Enable only V1-approved OAuth/email/notifications/calendar services | Conditional | Every required service has approved owner/configuration, tested failures and rotation docs. |
| 9. Observability & recovery | Alerts, metrics, audit, backup restore, rollback | Yes | Alert delivery and restore/rollback rehearsals pass. |
| 10. CI/CD | Repeatable PR checks and gated staging/production pipeline | Yes | CI runs lint, tests, build, migration checks; production requires human approval. |
| 11. Staging release | Validate release candidate without production data | Yes | Critical flows and operational rehearsal pass in staging. |
| 12. Production approval & launch | Deploy approved release and verify smoke tests | Yes | Explicit approval, health, smoke tests, monitoring and rollback owner confirmed. |
| 13. Post-release | Monitor and review operational signals | Yes | Initial release window completed; issues and lessons assigned. |

## Ordered Release Path

1. Complete REL-001 guest session-scope test/fix.
2. Complete REL-002 production startup fail-closed and durable database requirement.
3. Complete REL-003 backup/restore design and rehearsal.
4. Approve V1 scope and data/hosting region.
5. Select the simplest hosting topology consistent with durable SQLite or approve a database migration to PostgreSQL before scaling.
6. Implement secret/config validation, production CORS/cookie/CSRF configuration, and security controls.
7. Build observability, backup, restore, migration and rollback processes.
8. Establish CI/CD and deploy staging.
9. Run staging security, integration, migration, restore, and end-to-end tests.
10. Review release checklist; obtain manual production approval.
11. Deploy in backward-compatible order, run smoke tests, monitor, and roll back if a critical check fails.

## Release Decision

Current answer to “Is SmartAgenda production-ready?”: **No.** The exact blockers and current verification are in the audit. No external credentials are requested for Phase 1. Credentials/access are requested only after their service, environment, owner, region, and V1 necessity have been approved.
