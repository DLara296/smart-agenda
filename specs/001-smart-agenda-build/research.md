# Research: Smart Agenda MVP

## Decision Summary

### 1. Architecture choice
The project will remain a modular monolith rather than moving to a microservice architecture for the MVP. This matches the existing repository structure, keeps the first deliverable simpler, and allows explicit domain decomposition without premature deployment complexity.

Key rationale:
- The domain is cohesive and operationally related across schools, families, schedules, and notifications.
- The repo already contains a frontend and backend workspace, so incremental evolution is faster than rebuilding for a service-oriented model.
- Product requirements emphasize stateful workflows, audit history, and provider abstraction, which are easier to reason about within one deployable application.

### 2. Data persistence model
A relational database is the correct default. The domain includes many relationships and constraints that are easier to model with explicit foreign keys than with document storage.

Implementation choice:
- SQLite for local development and automated tests
- PostgreSQL-compatible schema conventions for production
- soft archive or historical retention to preserve assignment and notification history

### 3. Notification strategy
The notification layer will be abstracted behind a provider interface. This prevents the scheduling and reminder logic from depending directly on a vendor API.

The provider contract includes:
- send(message)
- validateConfiguration()
- getStatus(messageId)
- retry(message)

This lets the MVP support safe stubbed or sandbox-based providers without locking the product to one vendor.

### 4. Access model
The household model is the default for family registration. A family record owns one or more guardians and children, and the data is protected by role boundaries.

Rules:
- Admin and coordinator roles can manage school and session data.
- Guests access only their own family data and authorized session information.
- Protected records are filtered by family or school scope, not by raw global lists.

### 5. Status model
Sessions and assignments must use explicit lifecycle states to preserve operational clarity and auditability.

Initial states:
- Session: draft, scheduled, confirmed, cancelled, completed
- Assignment: pending, confirmed, cancelled, replaced, completed
- Notification: queued, sent, delivered, failed, retried, cancelled

This prevents accidental state ambiguity during coverage checks and task replacement.

## Technical Findings

### Frontend stack decisions
- React remains the UI framework because it already exists in the repo and is well suited to dashboard, forms, and list-based workflows.
- Feature-oriented organization should be preferred over flat page folders to keep school, family, session, and notification logic manageable.
- Data fetching should be isolated in API services rather than embedded directly in components.

### Backend stack decisions
- Express is the current platform and remains suitable for the MVP.
- Business logic should live in services rather than route handlers to keep the API thin.
- Repository functions should enforce authorization-aware query behavior for guest access boundaries.

### Validation and testing decisions
- Unit tests cover coverage logic, duplicate assignment prevention, rotation overrides, and notification scheduling.
- Integration tests validate school and family data persistence, auth boundaries, and API logic.
- Critical end-to-end flows should be tested in the order defined by the specification to guard the core revenue path.

## Open Questions and Defaults

### Required defaults for MVP
- Single school first, with configuration that can support multi-school expansion later
- Household account model with family-level ownership and multiple guardians/children
- Admin invite flow and explicit registration gating before broad guest access
- Notification provider abstraction with sandboxed provider implementations for dev/test

### Deferred to later phases
- Automatic WhatsApp reply parsing and human-in-the-loop approval
- Advanced multilingual matching rules beyond language tags and validations
- Heavy analytics or operational dashboard personalization
- Multi-site scheduling and advanced calendar synchronization

## Risk Mitigations

### Risk: Overcomplex domain logic
Mitigation: keep the first release around a single school, single rotation model, and explicit state transitions.

### Risk: Privacy leaks
Mitigation: enforce tenant and family scoping at query boundaries; never return unrelated family records.

### Risk: Duplicate notifications or assignments
Mitigation: use idempotency keys and validation checks before creating assignments or outbound messages.

### Risk: Vendor lock-in
Mitigation: interface-driven notification adapters keep the workflow provider-agnostic.

## Implementation Guidance

The first implementation should focus on the core operational path:
1. school setup
2. family registration
3. session creation
4. volunteer coverage validation
5. notification dispatch
6. cancellation/replacement tracking
7. dashboard visibility and history

This ordering keeps the MVP small while still proving the product’s value.
