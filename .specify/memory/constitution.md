# Smart Agenda Constitution

## Core Principles

### I. Household-First Trust Model
Every feature MUST respect the household-based family model: one family record contains multiple adults and children, and access is scoped to the user’s family or explicitly assigned school administrative scope. No feature may widen access beyond the least-privilege boundary required for the task.

### II. Privacy and Child-Safe Data Handling
Child, family, and contact data MUST be treated as protected information. Personal details must be minimized, access must be role-scoped, and systems must preserve consent, auditability, and deletion or archival requirements where applicable.

### III. Test-First Delivery (NON-NEGOTIABLE)
All feature work MUST be validated with failing tests before implementation is considered complete. The red-to-green workflow is mandatory for user-facing behavior, integration points, and critical business rules such as coverage validation, assignment deduplication, and notification idempotency.

### IV. Traceability from Requirement to Release
Every implemented capability MUST map back to a user story, functional requirement, or architecture decision. No feature may be merged or marked release-ready without traceable evidence for its purpose, acceptance criteria, and validation results.

### V. Operational Safety and Auditability
The application MUST preserve a meaningful audit trail for cancellations, schedule changes, assignment replacements, notification failures, invitation status changes, and privacy-sensitive actions. Business-critical operations must be inspectable and explainable to coordinators and administrators.

### VI. Simple, Explainable Workflow Design
The product MUST favor clear, operationally understandable flows over clever abstractions. If a behavior is difficult to explain to a coordinator or parent, it is not considered production-ready until simplified or documented.

## Additional Constraints

- The default domain model is household-based registration with one family record linking multiple adults and children to the appropriate school context.
- Guest access is restricted to the user’s own family scope and explicitly permitted school/session information; cross-family data access is denied by default.
- Manual rotation overrides require an explicit reason, approver, timestamp, and affected scope. They MUST be tracked as exceptions and MUST NOT silently remove the source schedule logic.
- Notification delivery MUST be abstracted behind a provider interface, and duplicate or retry attempts MUST remain idempotent and auditable.
- Admin invitation lifecycle MUST use time-bounded, single-use tokens with clear states including pending, accepted, expired, and revoked.
- The project MUST not assume hard-coded school-specific rules or a two-group/two-teacher model when a configurable model is required.

## Development Workflow and Quality Gates

1. Requirements and user stories are written before implementation.
2. Architecture, data model, and contracts are reviewed before core feature work begins.
3. Foundational services and domain boundaries are completed before story-level implementation proceeds.
4. Each feature is built with tests first and validated against the stated acceptance scenarios.
5. Release readiness requires passing automated tests, reviewer sign-off, and explicit check of privacy, security, and operational readiness.

## Governance

This constitution supersedes informal or ad hoc development decisions for this project. Any change to the project’s architecture, security profile, access model, or release approval model MUST be captured in project documentation, approved by the responsible project owner or reviewer, and reflected in the relevant spec, plan, and tasks before implementation proceeds.

Teams MUST verify compliance with this constitution during implementation reviews and before approving release readiness. Any deviation must be documented as an exception with an owner, rationale, and mitigation plan.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
