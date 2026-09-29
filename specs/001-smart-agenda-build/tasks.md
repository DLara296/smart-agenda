# Tasks: Smart Agenda Build and Delivery Roadmap

**Input**: Design documents from `/specs/001-smart-agenda-build/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Shared Setup and Foundation

**Purpose**: Establish the workspace, quality tooling, and test runner required before the blocking foundational layer is built.

- [X] T001 Create the final workspace structure for frontend and backend modules in `packages/frontend/src` and `packages/backend/src`
- [X] T002 Configure the root workspace scripts for install, start, and test orchestration
- [X] T003 [P] Add ESLint and Prettier configuration and document the project formatting rules
- [X] T004 [P] Configure Jest and React Testing Library for frontend and backend test execution

**Checkpoint**: Workspace and test tooling are ready; proceed to the blocking foundational layer.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Complete the core infrastructure that must be in place before any user story can safely begin.

**Critical gate**: No user story tasks may start until this phase is complete.

- [X] T071 [P] Write failing integration tests for Express app wiring, JSON validation, error formatting, and health behavior in `packages/backend/__tests__/integration/app-foundation.test.js`
- [X] T072 [P] Write failing integration tests for database bootstrap, migration execution, and required seed-data conventions in `packages/backend/__tests__/integration/database-foundation.test.js`
- [X] T073 [P] Write failing tests for shared repository and service interfaces across school, family, session, assignment, and notification domains in `packages/backend/__tests__/unit/domain-interfaces.test.js`
- [X] T074 [P] Write failing integration tests for audit records and provenance metadata on critical writes in `packages/backend/__tests__/integration/audit-foundation.test.js`
- [X] T075 [P] Write failing tests for required environment configuration and sandbox provider settings in `packages/backend/__tests__/unit/config-foundation.test.js`
- [X] T010 After T071 has failing assertions, create the backend foundation for app wiring, configuration, repositories, and error handling needed by all domain modules
- [X] T011 After T072 has failing assertions, set up the relational database bootstrap, seed data patterns, and migration conventions for schools, families, sessions, and notifications
- [X] T066 [P] Write failing integration tests for admin, coordinator, and guest authorization boundaries in `packages/backend/__tests__/integration/auth-boundary.test.js`; run them before implementing shared auth scaffolding
- [X] T012 Implement shared auth and authorization scaffolding with admin, coordinator, and guest role boundaries only after T066 has failed
- [X] T013 After T073 has failing assertions, create the core service and repository interfaces for school, family, session, assignment, and notification domains
- [X] T014 After T074 has failing assertions, implement the base audit logging model and provenance metadata for every critical write path
- [X] T015 After T075 has failing assertions, add environment configuration and sandbox provider settings for local development and test execution

**Checkpoint**: The foundational layer is ready; it blocks all story implementation until completed and validated.

---

## Phase 3: User Story 1 - Plan the School Reading Program Workflow (Priority: P1)

**Goal**: Support the core operational lifecycle of creating sessions, checking coverage, assigning volunteers, and preserving participation history.

**Independent Test**: A coordinator can create a school structure, schedule a reading session, validate missing coverage, and record a cancellation or replacement without losing history.

### Tests for User Story 1

- [X] T016 [P] [US1] Write contract test for `POST /v1/sessions` in `packages/backend/__tests__/contract/session-contract.test.js`
- [X] T017 [P] [US1] Write integration test for session creation and coverage validation in `packages/backend/__tests__/integration/session-flow.test.js`
- [X] T018 [P] [US1] Write unit test for volunteer assignment validation and duplicate prevention in `packages/backend/src/domain/session/__tests__/assignment-rules.test.js`
- [X] T019 [P] [US1] Write frontend test for dashboard and warning-state rendering in `packages/frontend/src/__tests__/dashboard-flow.test.js`
- [X] T067 [P] [US1] Write failing integration tests for rotation schedules, skipped dates, one-off and recurring overrides, and required override provenance in `packages/backend/__tests__/integration/rotation-override.test.js`

### Implementation for User Story 1

- [X] T020 [US1] After T016-T019 and T067 have failing assertions, implement `School` domain model and repository in `packages/backend/src/domain/school/`
- [X] T021 [US1] After T016-T019 and T067 have failing assertions, implement `Grade` and `Group` models and repository access in `packages/backend/src/domain/school/`
- [X] T022 [US1] After T016-T019 and T067 have failing assertions, implement `Teacher` domain model and assignment support in `packages/backend/src/domain/school/`
- [X] T023 [US1] Implement session creation and school schedule service in `packages/backend/src/domain/session/sessionService.js`
- [X] T024 [US1] Implement coverage validation logic for missing groups and language mismatch checks
- [X] T025 [US1] Implement volunteer assignment service with idempotency and cancellation-safe replacements
- [X] T026 [US1] Implement history/audit persistence for session, assignment, and replacement actions
- [X] T068 [US1] Implement rotation schedule and exception persistence, including skip-week handling, one-off and recurring overrides, and immutable audit fields for override reason, approver, timestamp, and affected scope
- [X] T027 [US1] Add `GET /v1/sessions`, `POST /v1/sessions`, and `PATCH /v1/sessions/{id}` routes and controllers
- [X] T028 [US1] Add `GET /v1/sessions/{id}/volunteers` and `POST /v1/sessions/{id}/volunteers` endpoints
- [X] T029 [US1] Build the dashboard and session summary UI components for upcoming sessions and coverage warnings
- [X] T030 [US1] Add empty/error/loading states for missing volunteer and cancellation alerts in the frontend

**Checkpoint**: User Story 1 should be usable end-to-end without depending on the family or notification stories.

---

## Phase 4: User Story 2 - Manage School and Family Data Safely (Priority: P1)

**Goal**: Enable secure registration and access to school/family records with role-based protections and household data modeling.

**Independent Test**: An authorized administrator can create the school structure and family records, while a guest tries to read another household’s data and is denied.

### Tests for User Story 2

- [X] T031 [P] [US2] Write integration test for family registration and child linkage in `packages/backend/__tests__/integration/family-registration.test.js`
- [X] T032 [P] [US2] Write authorization test for guest access denial in `packages/backend/__tests__/integration/auth-boundary.test.js`
- [X] T033 [P] [US2] Write frontend form validation test for family registration in `packages/frontend/src/__tests__/family-form.test.js`
- [X] T069 [P] [US2] Write failing integration tests for invitation issuance, single-use acceptance, expiry, revocation, assigned role/scope, and invitation audit history in `packages/backend/__tests__/integration/invitation-lifecycle.test.js`

### Implementation for User Story 2

- [X] T034 [US2] After T031-T033 and T069 have failing assertions, implement household `FamilyRecord` and `Guardian` models with privacy-aware repository queries
- [X] T035 [US2] After T031-T033 and T069 have failing assertions, implement `Student` and school linkage service for grades, groups, and family enrollment
- [X] T036 [US2] Implement user role model and access policy logic for admin, coordinator, and guest scopes
- [X] T037 [US2] Implement secure registration and invitation lifecycle for admin/coordinator setup with pending, accepted, expired, and revoked states; time-bounded single-use tokens; exact role and household scope assignment; and auditable issuance, acceptance, rejection, expiry, and revocation actions
- [X] T038 [US2] Add auth middleware for route protection and family-scope filtering
- [X] T039 [US2] Add `POST /v1/families`, `GET /v1/families`, and `GET /v1/families/{id}/children` endpoints
- [X] T040 [US2] Add family and guardian management UI with restricted access patterns for guest views
- [X] T041 [US2] Add data privacy notices and disabled actions when the current user is outside the allowed family scope

**Checkpoint**: User Story 2 should enforce least privilege while preserving valid administrative and family workflows.

---

## Phase 5: User Story 3 - Deliver Notifications and Reminders Reliably (Priority: P1)

**Goal**: Queue reminders, support a provider abstraction, and track delivery state safely without vendor lock-in.

**Independent Test**: A coordinator can schedule a reminder or cancellation notice and review delivery status, retries, and idempotent resends without duplicate work.

### Tests for User Story 3

- [X] T042 [P] [US3] Write notification contract test for resend and cancel behavior in `packages/backend/__tests__/contract/notification-contract.test.js`
- [X] T043 [P] [US3] Write integration test for reminder dispatch and retry behavior in `packages/backend/__tests__/integration/notification-flow.test.js`
- [X] T044 [P] [US3] Write unit test for provider abstraction and idempotent key handling in `packages/backend/src/domain/notification/__tests__/provider-contract.test.js`

### Implementation for User Story 3

- [X] T045 [US3] After T042-T044 have failing assertions, create the provider abstraction and interface definitions for email, SMS, and WhatsApp adapters
- [X] T046 [US3] Implement notification model, queueing service, and scheduling logic for volunteer requests and teacher notices
- [X] T047 [US3] Implement status tracking, retry, and failure handling for provider responses and delivery interruptions
- [X] T048 [US3] Implement idempotent creation rules and duplicate prevention for notification sends
- [X] T049 [US3] Add `GET /v1/notifications`, `POST /v1/notifications/{id}/resend`, and `POST /v1/notifications/{id}/cancel` endpoints
- [X] T050 [US3] Build the notifications screen and status summary cards in the frontend
- [X] T051 [US3] Add a safe provider stub for development and tests that records message status without contacting a third-party service

**Checkpoint**: User Story 3 should allow the coordinator to manage timely reminders and provider-safe recovery without business logic coupling to vendor APIs.

---

## Phase 6: User Story 4 - Support Governance, Security, and Operational Readiness (Priority: P2)

**Goal**: Ensure the release is traceable to the requirements, passes security and privacy gates, and is deployment-ready.

**Independent Test**: A release candidate can be reviewed against the architecture, privacy, testing, and runbook requirements before deployment.

### Tests for User Story 4

- [X] T052 [P] [US4] Write release-readiness checklist validation task against the quality gates in `docs/21-definition-of-done.md`
- [X] T053 [P] [US4] Run automated tests for the ten SC-006 critical flows: school structure setup; session creation; rotation override; coverage and language validation; volunteer assignment, cancellation, and replacement; household registration; cross-family guest denial; invitation lifecycle; notification dispatch and retry; and notification idempotency
- [X] T054 [P] [US4] Validate accessibility and keyboard flow checks on the core dashboard and forms
- [X] T070 [P] [US4] Run the SC-007 performance test with the defined single-school fixture; pass only when dashboard p95 is at most 2 seconds and assignment/notification API p95 is at most 500 milliseconds under 10 concurrent simulated coordinator requests, and record both measurements

### Implementation for User Story 4

- [X] T055 [US4] Review and finalize privacy boundaries for child and family contact data
- [X] T056 [US4] Add observability logging, error summaries, and structured metadata for session and notification activity
- [X] T057 [US4] Add deployment and rollback documentation updates in `docs/16-deployment-runbook.md` and `docs/17-observability-operations.md`
- [X] T058 [US4] Validate release readiness against security, accessibility, and testing quality gates; record the SC-006 result as passed critical flows divided by the ten defined flows and require at least 9 of 10 passing
- [X] T059 [US4] Document open assumptions and deferred features from the roadmap in the project docs

**Checkpoint**: The product is ready for release review, with clear evidence of testing and operational preparedness.

---

## Phase 7: Final QA and Release Validation

**Purpose**: Confirm the MVP meets the concrete success criteria before final sign-off.

- [X] T060 Run the full frontend and backend test suites together
- [X] T061 Run the critical end-to-end happy path from admin setup through completion and guest denial checks
- [X] T062 Verify all API endpoints follow the documented error contract and validation standards
- [X] T063 Confirm dashboard, session, family, and notification views meet accessibility and status-badge expectations
- [X] T064 Ensure audit history retention and cancellation replacement flows are preserved in storage and UI
- [X] T065 Review final deployment readiness and package the release notes / runbook summary

---

## Dependencies and Parallelism

### Dependency order

- Phase 1 must complete before the foundational gate begins.
- Phase 2 must complete before any user story work begins.
- For the foundation and each user story, all implementation tasks MUST wait until every governing test task has failing assertions. The implementation task may proceed only after the red test state is observed; test tasks may run in parallel with each other, but implementation and its governing tests may not run in parallel.
- User Stories 1, 2, and 3 are the primary MVP path and can proceed in parallel once the foundational gate is complete.
- User Story 4 can run in parallel with final validation after the core story work is stable.
- Phase 7 is the final gate after all stories are complete.

---

## Phase 8: Authentication and Registration (Post-MVP Feature)

**Purpose**: Protect the dashboard with authenticated sessions, persist user profiles, and enforce household ownership for guest users.

- [X] T076 [P] Add integration tests for registration, sign-in, duplicate email handling, session restoration, logout, and unauthenticated protected access in `packages/backend/__tests__/integration/authentication.test.js`
- [X] T077 Add SQLite migrations for password-backed users, family ownership, and server-side sessions in `packages/backend/src/db/database.js`
- [X] T078 Implement scrypt password hashing, hashed random session tokens, HttpOnly cookie sessions, current-user lookup, and logout in `packages/backend/src/domain/auth/authService.js`
- [X] T079 Enforce session-backed authorization outside test mode while preserving existing role and family-scope middleware in `packages/backend/src/middleware/auth.js`
- [X] T080 Add local registration, sign-in, current-user, and logout API routes in `packages/backend/src/app.js`
- [X] T081 Add frontend authentication gate, sign-in/register UI, loading/error states, session restoration, and logout behavior in `packages/frontend/src/features/auth/AuthScreen.js` and `packages/frontend/src/App.js`
- [X] T082 Add guest family ownership wiring and regression coverage for cross-family denial in `packages/backend/src/app.js` and `packages/backend/__tests__/integration/authentication.test.js`
- [X] T083 Document session security, essential-cookie handling, OAuth configuration boundary, and development compatibility in `docs/authentication.md`

**Deferred**: Google/Facebook OAuth callback flows, email verification, password recovery, rate limiting, and production provider credentials require a separate credential/configuration task before activation.

### Parallel opportunities

- [P] tasks across the same phase can be implemented in parallel when multiple developers are available.
- Backend schema and service scaffolding can be initialized alongside frontend test scaffolding.
- Family, session, and notification flows are logically independent after foundation setup.

---

## Notes

- This plan preserves the MVP-first approach: the core school reading workflow is built before advanced governance and release polish.
- The product architecture remains modular but intentionally avoids microservice complexity until the domain actually requires it.
- All tasks are scoped to deliver end-to-end business value and maintain traceability to the original feature specification.
- T045-T051 being complete means the provider contract, queue, status mutations, and sandbox stub exist; it does not mean real provider dispatch is implemented or production-ready.

---

## Phase 9: Notification Delivery Readiness (Pending)

**Purpose**: Make unsupported channel choices honest in the UI, then deliver notifications through approved provider adapters with school-scoped authorization, consent enforcement, durable attempts, and safe retry semantics.

**Gate**: T084-T085 (interim channel feedback) may proceed immediately. Real provider adapters and dispatch remain blocked until T088 records approved provider(s), sender identities, deployment regions, credentials ownership, and channel-specific consent/opt-out policy. Credentials must be supplied through deployment secrets, never source control.

### Interim UI: Do Not Imply Delivery

- [X] T084 [P] [US3] Write failing frontend tests for selecting unsupported Email, SMS, and WhatsApp recipients, showing an accessible “Delivery is not implemented yet. No message was sent.” notice, disabling send, and making no `POST /v1/notifications` request in `packages/frontend/src/__tests__/ActionForm.test.js`
- [X] T085 [US3] Implement the closed-by-default interim channel capability state and accessible unavailable-channel feedback for individual and saved-group selections; prevent submit while no delivery provider is enabled in `packages/frontend/src/features/notification/NotificationComposer.js`
- [X] T086 [P] [US3] Write backend integration tests proving unsupported channels are rejected and create no notification rows in `packages/backend/__tests__/integration/notification-groups.test.js` and `packages/backend/__tests__/integration/release-critical-flows.test.js`
- [X] T087 [US3] Enforce backend channel availability before queue creation; with the current empty enabled-channel configuration, return `CHANNEL_UNAVAILABLE` for every channel in `packages/backend/src/app.js` and `packages/backend/src/config/index.js`

### Provider and Delivery Design Gates

- [X] T088 [US3] Obtain product/deployment approval for launch channels, provider vendors, sender identities, target regions, channel consent/opt-out policy, and credential ownership; record decisions in `docs/18-decisions-log.md` and `docs/19-assumptions-open-questions.md`. Email-only V1/Gmail API OAuth2 with `gmail.send`/Mexico initial market/explicit recipient opt-in are approved; Google consent-screen verification, secrets, sender verification, and a real staging send remain release prerequisites.
- [X] T089 [P] [US3] Write fake-provider integration tests for accepted send, retryable and permanent failure, idempotency, duplicate worker claim, cancellation, revocation suppression, and bounded attempts in `packages/backend/__tests__/integration/notification-delivery.test.js` and `packages/backend/src/domain/notification/__tests__/gmail-provider.test.js`

### Schema, Dispatch, and Status

- [X] T090 [US3] Add migrations for notification school scope, append-only `NotificationAttempt` records, and append-only recipient Email consent grants/revocations without copying contact destinations/message bodies in `packages/backend/src/db/database.js`
- [X] T091 [US3] Add Gmail API OAuth2 adapter and Email capability/configuration validation using the least-privilege `gmail.send` scope; keep SMS/WhatsApp disabled and fail closed when config is missing in `packages/backend/src/domain/notification/gmailProvider.js` and `packages/backend/src/config/index.js`
- [X] T092 [US3] Implement asynchronous dispatch polling that atomically claims due rows, resolves the current canonical contact destination, rechecks school membership and consent, calls the Gmail adapter with a stable message identity, and persists accepted/failure attempts in `packages/backend/src/domain/notification/notificationWorker.js`
- [X] T093 [US3] Implement bounded retry/backoff, failed-only resend and queued/failed cancellation state guards, cancellation-race protection, and audit metadata for queue/dispatch/retry/cancel in `packages/backend/src/domain/notification/` and `packages/backend/src/app.js`
- [X] T094 [US3] Complete school-scoped authorization for notification history/dispatch/retry/cancel and define/administer coordinator-to-school membership; current delivery/history actions are admin-only until explicit school assignments exist in `packages/backend/src/app.js`. Implemented persisted coordinator memberships, admin grant/revoke routes, audit records, and school-scoped notification guards.

### Frontend and Release Validation

- [X] T095 [US3] Replace hard-coded sample communication rows with real school-scoped notification history and failed-item retry control without exposing destination values in `packages/frontend/src/features/notification/NotificationsScreen.js` and `packages/frontend/src/App.js`
- [X] T096 [US3] Add integration coverage for consent revocation at send-time, school isolation for history/resend/cancel, duplicate worker claims and accepted-dispatch suppression, stale-claim fail-closed recovery, migration upgrades, and OAuth-disabled capability; validate notification send/retry through SC-006 and fake-provider lifecycle tests
- [X] T097 [US3] Document Gmail API OAuth consent setup, `gmail.send` scope, secret rotation, sender verification, Google app verification/refresh-token expiry, explicit recipient consent, worker operations, unknown-outcome recovery, and production smoke checks in `docs/10-notification-specification.md`, `docs/16-deployment-runbook.md`, and `docs/17-observability-operations.md`
- [X] T098 [US3] Run backend/frontend suites, lint, production build, migration upgrade tests, Gmail adapter unit tests, and fake-provider notification delivery scenarios; record adapter unit tests separately from fake-provider worker tests and do not claim a real Gmail send

**Checkpoint**: Keep T084-T087 complete and all provider channels unavailable until T088-T098 pass for each approved channel. Never mark queued or simulated results as real sent/delivered outcomes.

---

## Phase 10: Production Readiness and Release (Pending)

**Purpose**: Move the verified development application toward a secure, recoverable production release without selecting infrastructure or deploying until scope and architecture approvals are recorded.

**Release documents**: `docs/release/production-readiness-audit.md`, `docs/release/production-release-plan.md`, `docs/release/tasks.md`, and the supporting checklist, architecture, environment, database, security, rollback, and post-release documents.

- [X] T099 [P] [US4] Add a failing guest session-list scope assertion proving `/v1/sessions` cannot expose sessions outside family-linked grades in `packages/backend/__tests__/integration/session-history.test.js`
- [X] T100 [US4] Scope guest `/v1/sessions` results through existing family-history authorization while retaining operational global listing for admins/coordinators in `packages/backend/src/app.js`
- [X] T101 [US4] Run backend release regression after T100; verify 31 suites and 73 tests pass.
- [X] T102 [US4] Complete a dedicated secret scan of current files and Git history; triage results and rotate any real exposed credential before release. Secretlint passed for all tracked files, and a reachable-history scan found no high-confidence credential patterns.
- [X] T103 [US4] Obtain product-owner approval for V1 capabilities, data regions/locales, traffic expectations, guest-account launch, and whether OAuth/calendar/notification delivery are V1 requirements; record the approved matrix in `docs/release/production-readiness-audit.md`. Approved baseline is recorded in the attached release decisions and repository release audit.
- [ ] T104 [US4] Add failing configuration/startup tests for explicit production mode, durable database requirement, disabled development admin/demo seeding, and required security configuration before implementation.
- [ ] T105 [US4] Implement production startup fail-closed behavior and controlled initial-admin provisioning; prove missing or unsafe production configuration prevents listening.
- [ ] T106 [US4] Select hosting/database architecture only after T103; verify persistent disk or implement and test a production database adapter before provisioning.
- [ ] T107 [US4] Implement controlled migration commands, staging migration validation, and migration failure recovery; do not depend on uncontrolled app-start schema mutation.
- [ ] T108 [US4] Define approved backup frequency, retention, encryption, RPO/RTO, and recovery owner; implement backups and rehearse restore on isolated staging storage.
- [ ] T109 [US4] Add validated environment schema and runtime-accurate `.env.example`; configure isolated dev/CI/staging/production secrets without committing credentials.
- [ ] T110 [US4] Implement reviewed CORS, same-origin or credentialed-origin behavior, secure cookies, CSRF protection, security headers, and production process lifecycle.
- [ ] T111 [US4] Complete authorization audit for all list/detail/search/history/export routes; add cross-family and cross-school tests, rate limits, upload checks, and secure invitation acceptance before enabling public production accounts.
- [ ] T112 [US4] Implement DB readiness health, correlation IDs, privacy-safe operational metrics/logs, alert ownership, and backup/database monitoring; test alert delivery.
- [ ] T113 [US4] Create application CI/CD for install, lint, tests, build, migration validation, and secret scanning; add staging deployment and mandatory manual production approval.
- [ ] T114 [US4] Deploy a production-like staging environment with synthetic/sanitized data; validate auth, scope, session uniqueness, calendar, history, storage, migration, backup/restore, responsive UI, and approved integrations.
- [ ] T115 [US4] Rehearse frontend, backend, configuration, migration-failure, and database-restore rollback paths in staging and document host-specific commands.
- [ ] T116 [US4] Complete `docs/release/production-checklist.md` with evidence, resolve every P0, assign/mitigate accepted P1s, and obtain release-owner approval before production deployment.
- [ ] T117 [US4] Deploy the approved release using the selected provider's verified runbook; perform non-destructive production smoke tests, confirm health/backup/monitoring, and complete the post-release review.
