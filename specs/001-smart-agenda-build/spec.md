# Feature Specification: Smart Agenda Build and Delivery Roadmap

**Feature Branch**: `001-smart-agenda-build`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "base in all the .md files inside docs folder analyze and define the tasks, phases in order to build the project"

## Clarifications

### Session 2026-09-22

- Q: Should the MVP support household-based guest registration with one family record containing multiple adults and children, or are guest accounts limited to individual parents? → A: Household account model with one family record and multiple adults/children.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan the school reading program workflow (Priority: P1)

A school coordinator can understand the end-to-end reading program lifecycle from session creation through volunteer coverage, reminder delivery, cancellation handling, and completion tracking.

**Why this priority**: This workflow is the core value of the product and determines whether the application solves the real operational problem.

**Independent Test**: A coordinator can create a session, assign groups, validate coverage, send reminders, and review participation history without needing unrelated features.

**Acceptance Scenarios**:

1. **Given** a school with grades, groups, and teachers configured, **When** a reading session is created, **Then** the system exposes the session in the dashboard and calendar with teacher and group assignments.
2. **Given** a session with at least one group lacking a volunteer, **When** the coordinator reviews coverage, **Then** the missing group is clearly highlighted and the system shows a warning or reminder path.
3. **Given** a volunteer cancels a confirmed assignment, **When** the cancellation is recorded, **Then** the original assignment remains in history and the system supports replacement or escalation.
4. **Given** a configured rotation schedule with a skipped week or a manual one-off assignment override, **When** the coordinator applies the override, **Then** the system records the override reason, approver, timestamp, and affected session or cycle and applies the change only to that exception without rewriting the underlying scheduled rotation pattern.

---

### User Story 2 - Manage school and family data safely (Priority: P1)

An administrator or family representative can create, update, and review the records needed for reading coordination while preserving privacy boundaries and role-based access.

**Why this priority**: The domain depends on correct school, group, teacher, family, and child relationships. Poor data quality or privacy violations would undermine trust and operational accuracy.

**Independent Test**: A person with the correct role can create a school, add grades and groups, register a family with children, and access only the records allowed by policy.

**Acceptance Scenarios**:

1. **Given** a signed-in administrator, **When** a new school and grade structure is created, **Then** the data is associated correctly and available for scheduling.
2. **Given** a family registration with multiple adults and children, **When** the record is accepted, **Then** the household is linked to the appropriate school and group assignments.
3. **Given** a guest account, **When** it tries to access another family’s protected data, **Then** the system denies access and shows a permission error.

---

### User Story 3 - Deliver notifications and reminders reliably (Priority: P1)

A coordinator can schedule and track notifications for volunteer requests, confirmations, cancellations, and missing-volunteer reminders without coupling the business flow to a specific provider.

**Why this priority**: Communication timing is critical to the reading coordination workflow and directly affects volunteer coverage.

**Independent Test**: A coordinator can queue a notification, review status updates, resend if needed, and confirm that duplicate or failed sends are handled safely.

**Acceptance Scenarios**:

1. **Given** a session with volunteer requests scheduled, **When** the reminder time is reached, **Then** the notification is queued and recorded with status.
2. **Given** a provider failure occurs, **When** a notification cannot be delivered, **Then** the system records the failure and supports retries or manual follow-up.
3. **Given** a duplicate send request, **When** it is submitted, **Then** the system prevents duplicate delivery using idempotent handling.
4. **Given** a user selects Email, SMS, or WhatsApp before that channel has an enabled delivery provider, **When** the channel is selected, **Then** an accessible message states that delivery is not implemented yet, no message is sent or queued, and submission is disabled.
5. **Given** an enabled delivery provider accepts a message, **When** the coordinator reviews notification history, **Then** the system distinguishes queued, sent, delivered, failed, retrying, and cancelled states using persisted provider outcomes and attempt history; queue acceptance alone is never shown as delivery.

---

### User Story 4 - Support governance, security, and operational readiness (Priority: P2)

The project team can manage requirements, validation, security, accessibility, privacy, and deployment readiness in a repeatable way.

**Why this priority**: Without these safeguards, the system may work in the short term but fail operationally or create privacy risks.

**Independent Test**: A release candidate can be evaluated against the architecture, testing, privacy, security, and runbook requirements before deployment.

**Acceptance Scenarios**:

1. **Given** the specification and architecture artifacts, **When** implementation begins, **Then** the team can trace features to requirements and acceptance criteria.
2. **Given** a deployment-ready build, **When** operational checks run, **Then** backup, monitoring, and rollback guidance are available.
3. **Given** a missing or risky decision, **When** it is identified, **Then** it is captured as an assumption or open question instead of being silently implemented.

---

### Edge Cases

- What happens when no volunteers are available for a required group?
- How does the system behave when a volunteer’s language does not match the assignment?
- What happens when a cancellation occurs after teacher notification has already been sent?
- How does the system handle holiday weeks, skipped weeks, or manual rotation overrides?
- What happens when duplicate assignments or duplicate notifications are created?
- How does the system preserve history while allowing replacements and escalation?
- What happens when a guest attempts to mutate protected data or view family records outside their own scope?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support the creation and maintenance of schools, grades, groups, and teacher assignments for reading sessions.
- **FR-002**: System MUST allow administrators to create and manage school schedules, session metadata, and reading event assignments.
- **FR-003**: System MUST support a household-based family registration flow with one family record containing multiple adults and children linked to the appropriate school and group context.
- **FR-004**: System MUST support role-based access for administrators, coordinators, and guest users with least-privilege protections.
- **FR-005**: System MUST validate volunteer coverage for each required group and flag missing or mismatched language assignments.
- **FR-006**: System MUST preserve participation history and cancellation records without deleting the original assignment history.
- **FR-007**: System MUST support configurable session rotation logic, skip-week handling, and manual overrides without hard-coded two-group or two-teacher assumptions. Rotation rules MUST be stored as explicit schedule data, MUST allow a school or coordinator to exempt specific dates or weeks, and MUST require a reason, approver, and timestamp for any manual override. Manual overrides MUST apply only to the affected session or cycle and MUST NOT silently replace the baseline rotation pattern for future sessions unless the override is explicitly marked as a recurring rule.
- **FR-008**: System MUST support volunteer requests, reminder flows, and teacher notifications through an abstraction that supports different communication providers.
- **FR-009**: System MUST allow the coordinator to record a replacement or escalation path when a volunteer cancels or is unavailable.
- **FR-010**: System MUST provide a dashboard that highlights upcoming sessions, missing volunteers, cancellations, and items requiring attention.
- **FR-011**: System MUST support the collection and review of operational history, audit information, and participation outcomes.
- **FR-012**: System MUST support secure, time-limited admin invitation flows and registration controls for initial deployment. Invitation records MUST include status (pending, accepted, expired, revoked), issuer, target email or identifier, expiration timestamp, single-use enforcement, and an audit trail of acceptance or rejection actions. Expired or revoked invitations MUST block onboarding, and accepted invitations MUST create the exact user role and household access scope granted by the invite.
- **FR-013**: System MUST support a clear state model for sessions and volunteer assignments, including draft, scheduled, confirmed, cancelled, replaced, and completed states.
- **FR-014**: System MUST support idempotent notification and assignment actions to avoid duplicate processing across retries or resubmission.
- **FR-015**: System MUST provide explicit privacy and consent-aware handling for child data, family contact information, and media where relevant.
- **FR-016**: The notification composer MUST identify channels without an enabled delivery provider as not implemented, show an accessible explanation when selected, and prevent their notification from being queued or represented as sent.
- **FR-017**: Enabled notification delivery MUST resolve the current canonical recipient destination at dispatch time, enforce reviewed channel consent and school authorization, and persist each provider attempt and outcome.
- **FR-018**: Notification retries MUST be bounded, auditable, and idempotent at both the application and provider boundary; a queued status MUST NOT be presented as sent or delivered.

### Key Entities *(include if feature involves data)*

- **School**: An educational organization that hosts grades, groups, teachers, and reading sessions.
- **Grade**: A school-level academic grouping that contains relevant reading cohorts.
- **Group**: A cohort within a grade that participates in a given reading session or rotation cycle.
- **Teacher**: A person assigned to reading sessions and group/language responsibilities.
- **Family**: A household record that can include multiple adults and multiple children.
- **Parent or Guardian**: A family member with contact information, language preferences, and communication settings.
- **Student**: A child or learner associated with a family, grade, and group.
- **Reading Session**: A scheduled reading activity with timing, groups, teacher assignments, and status.
- **Volunteer Assignment**: A specific person-to-session assignment that records status, language, and replacement or cancellation events.
- **Notification**: A communication event tied to the session or assignment workflow and tracking state, retry, and delivery metadata.
- **Audit Record**: A historical record of meaningful changes, cancellations, replacements, and completion events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A coordinator can complete the core session workflow from creation to confirmation and completion in a single working cycle without manual duplicate tracking.
- **SC-002**: 100% of required coverage checks for session groups are visible to the user before teacher notification is sent.
- **SC-003**: The system prevents duplicate volunteer assignments and warns about mismatched language or missing coverage in normal operating conditions.
- **SC-004**: The dashboard surfaces next-session, missing-volunteer, cancellation, and notification-status information for the current day within the primary operational workflow.
- **SC-005**: The project meets the required quality gates for security, accessibility, testing, and documentation before production release.
- **SC-006**: At least 90% of the ten defined critical-path flows are successfully validated by automated tests before release readiness: school structure setup; session creation; rotation override; coverage and language validation; volunteer assignment, cancellation, and replacement; household registration; cross-family guest denial; invitation lifecycle; notification dispatch and retry; and notification idempotency. Release readiness requires at least 9 of these 10 flows to pass.
- **SC-007**: With a single-school fixture containing 50 groups, 500 family records, and one academic year of sessions, the dashboard load completes within 2 seconds at p95 and assignment and notification API requests complete within 500 milliseconds at p95 under 10 concurrent simulated coordinator requests.
- **SC-008**: Until a channel has an approved, configured, and validated delivery adapter, selecting it produces an accessible not-implemented notice and creates zero notification queue records.
- **SC-009**: For enabled channels, every dispatch result and retry is represented by a persisted attempt record; acceptance tests distinguish provider acceptance from delivery confirmation and reject cross-school or consent-suppressed recipients.

## Assumptions

- The initial release prioritizes a single school structure with configurable rotation and assignment logic rather than hard-coded school-specific assumptions.
- Family registration uses a household account model with one family record containing multiple adults and children, and it is treated as a protected workflow that can require administrator approval for MVP unless the product owner explicitly chooses a different default.
- Guest access is limited to the user’s family record and explicitly authorized session information, not to all child or family contacts.
- One volunteer is treated as covering one group per session unless the product owner approves broader coverage within the domain rules.
- Notification providers are abstracted behind a provider interface, and production integrations are enabled only once provider feasibility and credentials are confirmed.
- Provider and sender selection, regional requirements, and channel-specific consent/opt-out policy are deployment/product prerequisites. No provider is inferred from a sample environment file; credentials are supplied only through deployment secrets.
- The project will keep operational history intact even when a session, volunteer assignment, or notification is cancelled or replaced.
- The work will be delivered in clearly defined phases so the team can validate and ship from the core workflows before advanced wishlist features are attempted.
