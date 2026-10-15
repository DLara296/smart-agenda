# SmartAgenda Production Readiness Audit

**Audit date:** 2026-09-30
**Scope:** Repository inspection plus the test, lint, and frontend-build commands recorded below. No infrastructure was provisioned, no deployment was attempted, and no external credentials were used.
**Verdict:** Not production-ready. Do not deploy real user data until P0 blockers are resolved and staging/recovery checks pass.

## Verification Performed

- Backend tests: `npm test --workspace=backend -- --runInBand` — 47 suites and 127 tests passed; the 5 environment-gated real-PostgreSQL tests skipped because no PostgreSQL runtime is installed locally.
- Frontend tests: `npm test --workspace=frontend -- --watchAll=false --runInBand --silent` — 22 suites and 114 tests passed.
- Lint: `npm run lint` — passed.
- Frontend build: `npm run build --workspace=frontend` — passed; Browserslist freshness warning remains.
- Workflow validation: `actionlint .github/workflows/application-ci.yml .github/workflows/application-release.yml` — passed.
- Secret scan: `npm run secret:scan` with the recommended preset — passed. A reachable Git-history scan for high-confidence private-key and live-token patterns also returned no matches.
- Production dependency critical gate: `npm audit --omit=dev --audit-level=critical` — passed after compatible lockfile remediation; 30 lower-severity legacy CRA/toolchain findings remain tracked.
- Application CI defines install, secret scan, critical dependency audit, lint, backend/frontend tests, frontend build, SHA artifact, database-boundary checks, and a PostgreSQL 16 service job. A manual release workflow validates the same commit, migrates/deploys staging, and gates production behind the protected GitHub environment. The workflows have not yet produced remote execution evidence.

These checks establish a healthy development test/build baseline only. They do not prove staging, provider integrations, production migrations, backup restoration, security penetration testing, or deployment readiness.

## Approved V1 and Infrastructure Baseline

The attached `smartagenda-final-release-infrastructure-decisions.md` was reviewed as the approved planning baseline on 2026-09-29. It resolves the following release decisions:

- V1 is a one-school controlled pilot with school, family, session, assignment, audit, guest, and email/password workflows.
- Guest/family accounts remain in V1 subject to the authorization, recovery, rate-limit, upload, and privacy gates below.
- Gmail API OAuth2 Email is included only after staging token-refresh and consented-send validation; SMS, WhatsApp, social sign-in, and calendar OAuth remain post-V1.
- Mexico is the initial market; `es-MX` and English are the target locales. Mexico is a market scope, not a strict data-residency guarantee.
- Production infrastructure target is Render Pro with isolated staging and production services, managed PostgreSQL, Cloudflare R2 for private uploads, Sentry, Better Stack, and GitHub Actions.
- Recovery targets are RPO at most 24 hours, RTO at most 4 hours, and 30-day backup retention, subject to successful restore rehearsal.
- Production deployment requires CI, staging validation, and explicit human approval.

Production startup hardening is now implemented and covered by `config-foundation.test.js` and `production-startup.test.js`: unsafe production configuration fails before app creation, demo schools/default development users are not seeded, and the controlled initial admin is provisioned idempotently.

The pooled PostgreSQL adapter, shared async database contract, versioned checksummed migrations, controlled migration commands, and an environment-gated integration suite are implemented locally. Production web startup remains intentionally blocked from PostgreSQL until the real integration job and Render-like staging validation pass. T106 therefore remains open.

These decisions authorize implementation and provisioning work; they do not constitute evidence that external resources have been provisioned or that production is approved.

## Findings by Priority

### P0 — Production blockers

1. **Guest session list scope — remediated in current worktree, verify before release.** `GET /v1/sessions` previously returned global sessions to `guest`. It now reuses the family-scoped history service for guests; admins/coordinators retain the global operational list. The new regression assertion passes in `session-history.test.js` (6 tests). The fix is uncommitted and needs a full backend regression and code review before this P0 is closed for release. Evidence: `packages/backend/src/app.js`, `packages/backend/__tests__/integration/session-history.test.js`, `packages/backend/src/domain/session/historyService.js`.
2. **Unsafe startup fallback — remediated in current worktree.** Production validates the exact environment, durable database, session secret, HTTPS frontend origin, and controlled initial-admin credentials before app creation. Development admin/demo provisioning is disabled in production. External staging configuration evidence remains required.
3. **Ephemeral production fallback — remediated in current worktree.** Production rejects an empty or in-memory database configuration and exposes a database-backed readiness check. Managed PostgreSQL provisioning and restart-persistence evidence remain open.
4. **No verified backup/restore path.** Documentation mentions backups, but no repository-supported backup job, retention policy, restore runbook, or restore test was found. Do not onboard real family/child data until backup and restore are configured and verified.

### P1 — Required for release scope or operations

1. **No real notification dispatch.** All Email/SMS/WhatsApp channels are currently unavailable; direct send returns `503 CHANNEL_UNAVAILABLE`. The sandbox provider is not wired into the app and is not production delivery. If communications are required for V1, delivery is a release blocker; otherwise keep channels visibly unavailable and exclude delivery from approved V1 scope. Evidence: `packages/backend/src/config/index.js`, `packages/backend/src/app.js`, `packages/backend/src/domain/notification/sandboxProvider.js`.
2. **Production migration staging evidence is missing.** PostgreSQL migrations now run separately through transactional `status`, `up`, and recovery commands with checksum validation. CI service configuration and integration tests exist, but a real PostgreSQL run, previous-schema upgrade fixture, Render staging migration, and failure-recovery rehearsal still require evidence. Evidence: `packages/backend/src/db/migrate.js`, `packages/backend/src/db/migrations/`, `.github/workflows/application-ci.yml`.
3. **Invitation delivery remains operator-managed.** The application now issues 256-bit single-use tokens with validated future expiry and atomically creates/links invited admin/coordinator accounts, with coordinator school membership, audit records, and session creation. Duplicate-email acceptance fails generically and leaves the existing account and pending invitation unchanged. Tokens are not delivered by the application; an administrator must deliver them through an approved secure channel. Account recovery and public-account security approval remain open. Evidence: `packages/backend/src/app.js`, `packages/backend/src/domain/family/invitationService.js`, `packages/backend/__tests__/integration/invitation-acceptance.test.js`.
4. **Production deployment automation is incomplete.** Application CI checks and a PostgreSQL service job are defined, but there is no validated staging deployment, Render blueprint, domain/TLS setup, production process command, smoke-test job, or manual production approval evidence. The backend start script still uses nodemon and is not a production process command.
5. **No operational recovery implementation.** `/health` returns a static `ok` without a database readiness check. No metrics, alert routing, correlation IDs, job/queue monitoring, or error-reporting integration was found. Structured HTTP request logging exists but must be reviewed for privacy and operational sufficiency.
6. **Notification recipient consent policy is undefined.** Existing reminder preferences are per signed-in account; they are not consent records for each guardian/teacher recipient. No channel-specific opt-in, opt-out, or suppression enforcement exists. This must be approved and implemented before real sends.

### P2 — Recommended before broad rollout

1. **Cross-origin production auth configuration is absent.** CORS currently uses defaults and does not configure credentialed origins, while the frontend uses cookie credentials. Prefer a same-origin reverse proxy for V1 or explicitly configure allowed origins and credentials. Cookie `SameSite`, `Secure`, and CSRF strategy need a production deployment review.
2. **Public-account lifecycle controls remain incomplete.** Registration, sign-in, invitation issuance, and invitation acceptance are rate limited, and invitation acceptance is atomic/single-use with generic token errors. Email verification, account recovery, deactivation ownership, notification limits, and final public-account approval remain open.
3. **Images are embedded as data URLs in SQLite.** This works for local bounded uploads but increases database size and backup/recovery load. Object storage is not implemented. Keep bounded uploads and verify database/disk capacity for a single-instance V1, or plan private object storage before volume grows.
4. **Health and logs need operational signals.** Add DB readiness, request correlation IDs, metrics, alerts, and privacy review. Do not log tokens, contact data, or notification message bodies.
5. **Environment example is not operational.** `docs/adr/.env.example` documents `APP_ENV` and `API_BASE_URL`, neither of which is consumed by the backend config. Replace with a truthful, validated `.env.example` after production configuration decisions.
6. **Documentation differs from runtime.** Architecture docs describe TypeScript, object storage, and background workers; current source is JavaScript, stores images in SQLite, and has no delivery worker. Reconcile docs with the approved target plan.

### P3 — Can be deferred if excluded from V1

- Google/Facebook OAuth: no callback implementation or credentials. Password sign-in exists.
- Calendar integration is event-export links only, not OAuth or two-way synchronization.
- Horizontally scaled/multi-school hosting: SQLite and the current data model are single-instance oriented.
- Advanced analytics and WhatsApp reply ingestion.

## V1 Scope Recommendation

| Capability | Recommendation | Release condition |
|---|---|---|
| Admin sign-in and school/family/session operations | Required | Resolve P0 scope/startup issues; verify auth and durable storage. |
| Guest/family views and history | Required if guest accounts are launched | Close global session-list leak and prove cross-family/school denial. |
| Schools, grades, groups, teachers, students, families | Required | Verify persistence, authorization, backups, and recovery. |
| Session uniqueness, schedule, assignments, calendar view | Required | Existing automated coverage is a baseline; run staging smoke tests. |
| Calendar event export links | Recommended | Treat as user-initiated external links, not account integration. |
| Image/background uploads | Recommended/defer pending storage review | Keep bounded SQLite data URLs for a small pilot only, or implement private object storage. |
| Email/SMS/WhatsApp delivery | Post-V1 unless product owner requires one for launch | If required, provider, sender, region, credentials, consent and dispatch work become P0/P1. Do not present current queueing as sending. |
| Google/Facebook OAuth and calendar sync | Post-V1 | Requires separate provider approval and callback/configuration implementation. |
| Production observability, backup, restore, migration process | Required | Must be exercised in staging before launch. |

## First Release Task

**REL-001 (P0): Close the guest session-list data exposure.** Add a failing integration test where two families/schools exist and verify a guest only sees explicitly authorized sessions; then implement scoped listing or remove guest role from the global endpoint and update callers. No external credentials are needed. Do not proceed to public staging with family/student data until this test and related authorization tests pass.

## External Inputs Not Needed for This Audit

No credentials, cloud access, domain access, or provider secrets were needed to inspect the repository or run local tests/build. They will be needed only after the owner selects hosting, domain, email/SMS/WhatsApp/OAuth providers, and data region. Secrets must be entered directly into the selected secret manager, never sent in chat or committed.

## Verification Update (2026-10-08)

- Backup policy approved by the project owner on 2026-10-08: daily backups, 30-day retention, age client-side envelope encryption, RPO <=24 hours, RTO <=4 hours, Security Owner for private-key custody, and DBA Owner for restore execution/approval.
- Added a scheduled backup workflow, age-encrypted `pg_dump` archive script, R2 upload step, 30-day R2 lifecycle policy, and a manually dispatched restore workflow that requires an explicitly confirmed empty isolated database and verifies that it has no user objects.
- Mocked backup/restore script tests passed 4/4. No live age encryption, R2 upload, scheduled workflow run, or staging restore was performed because age/R2 tools and secrets/staging resources are not provisioned locally.
- Local PostgreSQL 16.15 is available. The isolated `smartagenda_test` database ran `POSTGRES_TEST_DATABASE_URL=postgresql:///smartagenda_test npm --prefix packages/backend test -- --runInBand __tests__/integration/postgres-database.test.js`: 1 suite and 6 tests passed, covering fresh/upgrade migrations, reconnect persistence, rollback, constraints, application routes, and worker dispatch.
- The controlled `db:status`, `db:migrate`, `db:status`, and `db:recover` commands ran against a fresh temporary schema in the local PostgreSQL test database; both migrations applied and recovery correctly reported no pending work. The focused migration unit suite passed 4/4, including a failed transactional migration remaining pending for recovery.
- GitHub Actions run `37559033280` completed successfully on 2026-10-07. Both `quality` and `postgres` jobs passed; the PostgreSQL job ran migration status/up/status and the PostgreSQL integration suite.
- The repository's default branch currently exposes Application CI but not `application-release.yml`; no GitHub `staging` environment or staging variables/secrets are configured. No deployment was attempted.
- T124 is partially evidenced: CI PostgreSQL service coverage and remote execution pass, but isolated deployed-staging migration evidence remains open. T125 and T106 remain open until a staging environment is provisioned and persistence, full PostgreSQL validation, and migration failure/recovery are rehearsed.

## Verification Update (2026-10-13)

- A real local recovery rehearsal used `age` encryption, PostgreSQL `pg_dump`, and the guarded restore script to restore into a newly created empty PostgreSQL 16 database. The two schema migration records matched the source after restore.
- The backup/restore mock suite passes 4/4; `actionlint` and `bash -n` pass for the new workflows and scripts.
- `/v1/history/sessions` now derives visibility from the authenticated role: guests remain family-scoped, coordinators see only active membership schools, and administrators see school history. Cross-school regression coverage passes on SQLite and PostgreSQL.
- Added an authorization route matrix to `security-checklist.md`, including role scopes for family, school, student, session, history, and notification surfaces. No server-side search/export routes exist; calendar export is a client-generated link from authorized session data.
- This remains local evidence only. R2 upload, scheduled workflow execution, and a staging restore with measured RPO/RTO have not been performed because AWS CLI, provider credentials, and staging resources are not configured.
- T108, T111, T124 staging evidence, T125, and T106 remain open until the live backup and isolated staging recovery gates pass; T111 additionally requires the remaining authorization matrix, account recovery/deactivation policy, and security approval.

## Verification Update (2026-10-14)

- Invitation tokens now use 32 cryptographic random bytes; issuance validates future expiry and coordinator school scope. Acceptance creates the account from the invitation's stored identity/scope, records the linked user, grants coordinator membership, writes audit events, creates an authenticated session, and rolls back safely on duplicate email or replay.
- The SQLite invitation acceptance/lifecycle and SC-006 critical-flow tests pass. PostgreSQL integration passes 7/7, including invite account linkage and coordinator membership.
- Full backend: 48 suites and 146 tests passed; 7 PostgreSQL-gated tests skipped. Full frontend: 22 suites and 116 tests passed. ESLint passed.
- Invitation delivery remains manual. Account recovery/deactivation ownership and final security approval remain open; R2/staging backup, restore, and release gates remain unverified.
