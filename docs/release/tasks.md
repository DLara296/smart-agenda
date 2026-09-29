# Production Release Tasks

Task format follows the release plan request. Tasks remain pending until acceptance evidence is attached. Dependencies refer to IDs in this file.

## Phase 0 — Readiness Audit

### REL-001 — Complete production readiness audit
- **Priority:** P0
- **Phase:** 0 — Audit
- **Dependencies:** None
- **Blocking:** Yes, gates all infrastructure decisions
- **Description:** Inspect application, data, auth, integrations, build/test, CI/CD, storage, operations, backups, secrets, and deployment configuration. Record factual findings and verification commands in [production-readiness-audit.md](production-readiness-audit.md).
- **Acceptance Criteria:**
  - [x] Readiness findings are classified P0-P3 with file evidence.
  - [x] Current backend/frontend tests, lint, and frontend build have recorded results.
  - [x] Secretlint with the recommended preset passed on all tracked current files, and a reachable Git-history scan found no high-confidence credential patterns. No credential was found to rotate.
  - [x] Product owner acknowledges scope and blocker report in the attached release decisions.
- **Definition of Done:** Verified audit report reviewed; no unverified claim is marked complete.
- **Status:** Audit and approved baseline recorded; provisioning and release evidence remain pending.

## Phase 1 — Resolve P0 Blockers

### REL-002 — Scope guest session listing
- **Priority:** P0
- **Phase:** 1 — Security remediation
- **Dependencies:** REL-001
- **Blocking:** Yes
- **Description:** Add a failing test for guest access to another family's/school's sessions; scope `GET /v1/sessions` or remove guest access and route guest screens through scoped history.
- **Acceptance Criteria:** Guest can list only authorized sessions; cross-family/school IDs and global metadata are denied; admin/coordinator flows continue to work.
- **Definition of Done:** Backend integration tests prove allowed and denied cases; frontend guest workflow passes.
- [x] Implemented by reusing family-scoped history sessions for guests in `packages/backend/src/app.js`.
- [x] Regression test in `packages/backend/__tests__/integration/session-history.test.js` passed: 6 tests.
- **Status:** Implemented in current worktree; full backend regression passed (31 suites, 73 tests).

### REL-003 — Fail closed on production startup
- **Priority:** P0
- **Phase:** 1 — Operations/security
- **Dependencies:** REL-001
- **Blocking:** Yes
- **Description:** Require explicit `NODE_ENV=production`, durable database configuration, and controlled initial-admin provisioning; ensure production cannot seed demo schools or use the known development admin/password fallback.
- **Acceptance Criteria:** Production startup fails safely for missing/invalid required config; no known default credentials are accepted; local development behavior remains opt-in.
- **Definition of Done:** Startup/config tests and a production-mode smoke test pass without exposing secrets.

### REL-004 — Provision durable storage and recovery
- **Priority:** P0
- **Phase:** 1 — Data durability
- **Dependencies:** REL-001, REL-006
- **Blocking:** Yes
- **Description:** Select storage/database compatible with the actual SQLite implementation or first implement another DB adapter; configure encrypted backups and restore path.
- **Acceptance Criteria:** Restart preserves data; backup is automated and encrypted; restore rehearsal meets approved RPO/RTO.
- **Definition of Done:** Staging restore report and responsible operator approved.

## Phase 2 — V1 and Architecture Decisions

### REL-005 — Approve V1 capability scope and data region
- **Priority:** P0
- **Phase:** 2 — Product/architecture
- **Dependencies:** REL-001
- **Blocking:** Yes
- **Description:** Approve the capability matrix in the audit, countries/locales, data residency, user scale, support owner, and whether guest/OAuth/calendar sync/notifications are required at launch.
- **Acceptance Criteria:** Each capability is marked Required, Recommended, or Post-V1; owner approval is recorded.
- **Definition of Done:** Release scope and non-goals are signed off.
- **Status:** Approved baseline recorded in `production-readiness-audit.md` and `pending-decisions-and-infrastructure-worksheet.md`; infrastructure execution remains pending.

### REL-006 — Approve hosting and database architecture
- **Priority:** P0
- **Phase:** 2 — Architecture
- **Dependencies:** REL-005
- **Blocking:** Yes
- **Description:** Compare hosting/database/storage options against single-instance SQLite constraints, durable volume, region, restore, cost, and maintenance. Choose same-origin routing if feasible.
- **Acceptance Criteria:** Provider-neutral ADR records selected topology, cost assumptions, region, scaling limits, backup ownership, and rejected alternatives.
- **Definition of Done:** Architecture is approved before infrastructure provisioning.
- **Status:** Render Pro, managed PostgreSQL, Cloudflare R2, Sentry, Better Stack, and GitHub Actions are the approved planning baseline; provisioning and exact service-tier pricing remain pending.

## Phase 3 — Environment, Data, and Security

### REL-007 — Define validated environment schema and secret lifecycle
- **Priority:** P1
- **Phase:** 3 — Environment/secrets
- **Dependencies:** REL-006
- **Blocking:** Yes
- **Description:** Replace stale `.env.example` with runtime-accurate non-secret placeholders; validate config at startup; define isolated environment secret ownership/rotation.
- **Acceptance Criteria:** No secret is committed; required vars validate; dev/staging/prod are separate; secret access/rotation is documented.
- **Definition of Done:** CI config tests and staged secret-manager setup pass.

### REL-008 — Build controlled migration and backup/restore workflow
- **Priority:** P0
- **Phase:** 4 — Database
- **Dependencies:** REL-006, REL-007
- **Blocking:** Yes
- **Description:** Introduce a dedicated controlled migration process and database-engine-appropriate backup, retention, integrity, and restore process.
- **Acceptance Criteria:** Upgrade from previous schema, failure recovery, integrity checks, backup and restore all pass in staging.
- **Definition of Done:** Database plan and rehearsal record approved.

### REL-009 — Harden auth, CORS/cookies, CSRF, abuse, and uploads
- **Priority:** P1
- **Phase:** 6 — Security
- **Dependencies:** REL-006, REL-007
- **Blocking:** Yes
- **Description:** Add explicit origin/cookie/CSRF policy, rate limiting, protected admin bootstrap, invitation completion, security headers, and upload review.
- **Acceptance Criteria:** Auth boundary tests cover role and school/family scope; abuse limits and upload validation are exercised; errors/logs are reviewed.
- **Definition of Done:** Staging security checklist and reviewer approval pass.

## Phase 4 — Deployment and Operations

### REL-010 — Add production server/static routing and readiness checks
- **Priority:** P1
- **Phase:** 5/6 — Backend/frontend deployment
- **Dependencies:** REL-006, REL-007, REL-008, REL-009
- **Blocking:** Yes
- **Description:** Add production process command, static asset/API routing, DB readiness health, graceful shutdown, and deployment smoke checks.
- **Acceptance Criteria:** Fresh production-like environment starts reproducibly; health returns failure when DB is unavailable; deep links/assets/auth work.
- **Definition of Done:** Staging start/restart/health smoke tests pass.

### REL-011 — Add operational telemetry and alerts
- **Priority:** P1
- **Phase:** 11 — Monitoring
- **Dependencies:** REL-006, REL-010
- **Blocking:** Yes
- **Description:** Add request correlation, privacy-safe structured events, metrics/error reporting, alert destinations, DB/disk/backup monitoring, and incident owner.
- **Acceptance Criteria:** A test alert is received; dashboards show API errors/latency, DB health, backup freshness, and auth anomalies without sensitive payloads.
- **Definition of Done:** Alert and incident-response rehearsal complete.

### REL-012 — Establish CI/CD with release approval
- **Priority:** P1
- **Phase:** 10 — CI/CD
- **Dependencies:** REL-007, REL-008, REL-009
- **Blocking:** Yes
- **Description:** Create application CI for install, lint, tests, build, secret scan, and migration checks; add staging deploy and manual production approval gate.
- **Acceptance Criteria:** PR failures block merge; staging artifact is identifiable; production deploy requires human approval and rollback reference.
- **Definition of Done:** Pipeline rehearsal completes without production credentials in CI logs.

## Phase 5 — External Services and Release

### REL-013 — Verify and enable approved Gmail API delivery
- **Priority:** P1
- **Phase:** 8 — External services
- **Dependencies:** REL-005, REL-007, REL-009
- **Blocking:** Conditional
- **Description:** V1 selects Email through Gmail API OAuth2 using `gmail.send` and `david.lara170385@gmail.com`. Enable Gmail API, configure OAuth consent and server OAuth client, provision offline refresh credentials, verify sender eligibility/app verification requirements, and install secrets directly in a secret manager. Keep SMS, WhatsApp, social sign-in, and calendar OAuth/sync disabled unless separately approved.
- **Acceptance Criteria:** Gmail OAuth token refresh validates in staging; a dedicated consented test recipient receives a verified test email; provider failures and token revocation are handled; secrets/contact values do not enter logs; queue acceptance is never claimed as confirmed delivery.
- **Definition of Done:** Provider-specific evidence and runbook approved; credentials are installed directly in secret management.

### REL-014 — Staging release and production-readiness approval
- **Priority:** P0
- **Phase:** 14/15 — Release candidate
- **Dependencies:** REL-002 through REL-012; REL-013 for required integrations
- **Blocking:** Yes
- **Description:** Deploy staging, validate critical workflows, migration, backup/restore, security, smoke tests, and rollback; obtain release approval.
- **Acceptance Criteria:** Required checklist items pass; no P0 remains; accepted P1s have owners and mitigations.
- **Definition of Done:** Signed release candidate decision and rollback authority documented.

### REL-015 — Production deployment, smoke tests, and post-release review
- **Priority:** P0
- **Phase:** 16-19 — Launch/operations
- **Dependencies:** REL-014
- **Blocking:** Yes
- **Description:** Execute approved deployment sequence, monitor critical flows and infrastructure, verify backup, and conduct post-release review.
- **Acceptance Criteria:** HTTPS/auth/session/scope/session creation/uniqueness/health/backup and every required integration pass; rollback is available.
- **Definition of Done:** Release record, monitoring window, incidents, and follow-up tasks are complete.
