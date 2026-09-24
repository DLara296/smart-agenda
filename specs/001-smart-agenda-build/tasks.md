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
- [ ] T058 [US4] Validate release readiness against security, accessibility, and testing quality gates; record the SC-006 result as passed critical flows divided by the ten defined flows and require at least 9 of 10 passing
- [X] T059 [US4] Document open assumptions and deferred features from the roadmap in the project docs

**Checkpoint**: The product is ready for release review, with clear evidence of testing and operational preparedness.

---

## Phase 7: Final QA and Release Validation

**Purpose**: Confirm the MVP meets the concrete success criteria before final sign-off.

- [ ] T060 Run the full frontend and backend test suites together
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

### Parallel opportunities

- [P] tasks across the same phase can be implemented in parallel when multiple developers are available.
- Backend schema and service scaffolding can be initialized alongside frontend test scaffolding.
- Family, session, and notification flows are logically independent after foundation setup.

---

## Notes

- This plan preserves the MVP-first approach: the core school reading workflow is built before advanced governance and release polish.
- The product architecture remains modular but intentionally avoids microservice complexity until the domain actually requires it.
- All tasks are scoped to deliver end-to-end business value and maintain traceability to the original feature specification.
