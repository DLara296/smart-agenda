# SmartAgenda Production Readiness Audit

**Audit date:** 2026-09-29
**Scope:** Repository inspection plus the test, lint, and frontend-build commands recorded below. No infrastructure was provisioned, no deployment was attempted, and no external credentials were used.
**Verdict:** Not production-ready. Do not deploy real user data until P0 blockers are resolved and staging/recovery checks pass.

## Verification Performed

- Backend tests: `npm test --workspace=backend -- --runInBand` — 31 suites, 73 tests passed.
- Frontend tests: `npm test --workspace=frontend -- --runInBand` — 21 suites, 110 tests passed.
- Lint: `npm run lint` — passed.
- Frontend build: `npm run build --workspace=frontend` — passed; Browserslist freshness warning remains.
- Secretlint with the recommended preset passed across all tracked current files. A reachable Git-history scan for high-confidence private-key and live-token patterns also returned no matches. No credential was found to rotate. This does not replace provider-specific secret-manager review before deployment.
- No Docker/container or hosting manifests were found. Existing `.github/workflows/` are Spec Kit bootcamp workflows, not application CI/CD.

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

These decisions authorize implementation and provisioning work; they do not constitute evidence that external resources have been provisioned or that production is approved.

## Findings by Priority

### P0 — Production blockers

1. **Guest session list scope — remediated in current worktree, verify before release.** `GET /v1/sessions` previously returned global sessions to `guest`. It now reuses the family-scoped history service for guests; admins/coordinators retain the global operational list. The new regression assertion passes in `session-history.test.js` (6 tests). The fix is uncommitted and needs a full backend regression and code review before this P0 is closed for release. Evidence: `packages/backend/src/app.js`, `packages/backend/__tests__/integration/session-history.test.js`, `packages/backend/src/domain/session/historyService.js`.
2. **Unsafe startup fallback can create a known admin.** When `NODE_ENV` is not exactly `production`, development admin setup uses `admin@smartagenda.local` and `SmartAgendaAdmin2026!` unless overridden. A missing/typoed environment setting can therefore enable a known credential. Fail closed on production startup; do not create development accounts outside explicit local development. Evidence: `packages/backend/src/app.js`, `packages/backend/src/config/index.js`.
3. **Default persistence is ephemeral.** Backend config and startup default to SQLite `:memory:`. Restarts lose records. Production startup must require explicit durable storage and verify writability/connection before accepting traffic. Evidence: `packages/backend/src/config/index.js`, `packages/backend/src/index.js`.
4. **No verified backup/restore path.** Documentation mentions backups, but no repository-supported backup job, retention policy, restore runbook, or restore test was found. Do not onboard real family/child data until backup and restore are configured and verified.

### P1 — Required for release scope or operations

1. **No real notification dispatch.** All Email/SMS/WhatsApp channels are currently unavailable; direct send returns `503 CHANNEL_UNAVAILABLE`. The sandbox provider is not wired into the app and is not production delivery. If communications are required for V1, delivery is a release blocker; otherwise keep channels visibly unavailable and exclude delivery from approved V1 scope. Evidence: `packages/backend/src/config/index.js`, `packages/backend/src/app.js`, `packages/backend/src/domain/notification/sandboxProvider.js`.
2. **Production migration discipline is missing.** SQLite migrations execute during app startup, one statement at a time; no dedicated migration command, atomic migration strategy, production engine adapter, or tested rollback procedure exists. `DATABASE_URL` is treated as a SQLite filename, not a general SQL connection URL. Evidence: `packages/backend/src/db/database.js`, `packages/backend/src/index.js`.
3. **Invitation onboarding is incomplete.** Invitation issue exists, but no acceptance HTTP flow links the invite to account creation; token generation uses `Math.random` plus a timestamp rather than a cryptographic random source. Evidence: `packages/backend/src/app.js`, `packages/backend/src/domain/family/invitationService.js`.
4. **No reproducible production deploy pipeline.** There is no app CI/CD, deployment manifest, Dockerfile, domain/TLS setup, migration gate, or smoke-test job. The frontend can build; backend start script uses nodemon, suitable for development rather than a production process manager. Evidence: root and workspace package manifests; `.github/workflows/`.
5. **No operational recovery implementation.** `/health` returns a static `ok` without a database readiness check. No metrics, alert routing, correlation IDs, job/queue monitoring, or error-reporting integration was found. Structured HTTP request logging exists but must be reviewed for privacy and operational sufficiency.
6. **Notification recipient consent policy is undefined.** Existing reminder preferences are per signed-in account; they are not consent records for each guardian/teacher recipient. No channel-specific opt-in, opt-out, or suppression enforcement exists. This must be approved and implemented before real sends.

### P2 — Recommended before broad rollout

1. **Cross-origin production auth configuration is absent.** CORS currently uses defaults and does not configure credentialed origins, while the frontend uses cookie credentials. Prefer a same-origin reverse proxy for V1 or explicitly configure allowed origins and credentials. Cookie `SameSite`, `Secure`, and CSRF strategy need a production deployment review.
2. **Abuse controls are incomplete.** No rate limiting was found for public registration or sign-in. Email verification and account recovery are absent. Decide whether those are V1 requirements and provide abuse mitigations before public exposure.
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
