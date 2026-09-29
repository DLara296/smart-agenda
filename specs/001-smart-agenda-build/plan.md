# Implementation Plan: Smart Agenda Build and Delivery Roadmap

**Branch**: `001-smart-agenda-build` | **Date**: 2026-09-29 | **Spec**: `specs/001-smart-agenda-build/spec.md`

**Input**: Feature specification from `/specs/001-smart-agenda-build/spec.md`

## Summary

The Smart Agenda MVP delivers a school reading coordination workflow in a modular monolith: a React frontend, an Express/Node backend, and a relational database. This plan update tracks the remaining notification-delivery work: keep unsupported channel choices visibly unavailable and unsendable; later dispatch enabled channels through approved provider adapters with school-scoped authorization, consent checks, durable attempt history, bounded retries, and truthful delivery states. Existing queue persistence is not considered provider delivery.

## Technical Context

**Language/Version**: JavaScript with Node.js 18+ and React 18. JavaScript is the implementation standard for this MVP; any TypeScript migration is deferred to a separately planned feature after the MVP release.

**Primary Dependencies**: React, React Scripts, Express, better-sqlite3, CORS, Morgan, Axios, Jest, Supertest, Testing Library.

**Storage**: Relational database with SQLite for local development and MVP testing, with a PostgreSQL-compatible schema design ready for production scaling.

**Testing**: Jest, React Testing Library, Supertest, and critical-path integration/E2E validation for the school reading workflow.

**Target Platform**: Web application for desktop and tablet-first school operations, with mobile-responsive family-facing flows.

**Project Type**: Web application with a modular monolith backend and a React frontend in a npm workspace monorepo.

**Performance Goals**: With a single-school fixture containing 50 groups, 500 family records, and one academic year of sessions, dashboard load completes within 2 seconds at p95 and assignment and notification API requests complete within 500 milliseconds at p95 under 10 concurrent simulated coordinator requests. Reminder jobs process asynchronously without blocking user actions.

**Constraints**: secure family/school boundaries, minimal contact-data exposure, explicit communication consent rules before real dispatch, deterministic recipient resolution, vendor-independent business logic, bounded/idempotent retries, and no UI or status that confuses queued with sent/delivered. Provider vendors, sender identities, regions, and credentials are deployment/product inputs, not inferred defaults.

**Scale/Scope**: single-school MVP with configurable grades, groups, rotations, and family records; extendable to multi-school or multi-region deployment without redesigning core domain boundaries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This plan passes the constitution’s requirements because it maintains:
- specification-driven scope and traceability from requirements to implementation
- explicit admin/guest access boundaries and least-privilege policies
- testing-first and verification-anchored delivery for critical flows
- modular boundaries without premature microservice complexity
- operational observability, privacy, and deployment-readiness requirements from the outset

Notification-specific gates:
- **PASS**: unsupported channels are designed to show an accessible not-implemented message and must not create queue records.
- **PASS WITH PREREQUISITES**: real dispatch remains blocked until provider/sender selection, credentials, regional feasibility, and channel consent/opt-out policy are approved; tests use fake adapters and no secrets.
- **PASS**: dispatch and history are planned with authenticated school scope, durable attempt records, safe retry state transitions, and explicit queued-versus-delivered semantics.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-agenda-build/
├── plan.md              # Implementation plan
├── research.md          # Technical findings and decision log
├── data-model.md        # Domain schema and relationships
├── quickstart.md        # Local setup and validation steps
├── contracts/           # API contract examples and request/response definitions
├── spec.md              # Approved feature specification
└── tasks.md             # Generated after planning, before implementation
```

### Source Code (repository root)

```text
packages/
├── backend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── middleware/
│   │   │   └── validators/
│   │   ├── domain/
│   │   │   ├── school/
│   │   │   ├── family/
│   │   │   ├── session/
│   │   │   ├── notification/
│   │   │   └── audit/
│   │   ├── config/
│   │   ├── db/
│   │   └── index.js
│   └── __tests__/
│       ├── unit/
│       ├── integration/
│       └── contract/
└── frontend/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── pages/
    │   ├── features/
    │   ├── services/
    │   ├── hooks/
    │   ├── styles/
    │   └── utils/
    └── src/__tests__/
```

**Structure Decision**: Use the existing monorepo layout with a single deployable backend and frontend package, keeping domain boundaries explicit within the backend and feature-based organization in the frontend. This matches the modular monolith architecture and keeps the MVP smaller than a microservices split.

## Notification Delivery Follow-up

- Keep provider integrations behind a channel adapter/dispatcher boundary; begin with the email-first path in ADR-004 after product approval, then enable SMS/WhatsApp only when their provider and sender requirements are approved.
- Add a delivery-attempt record linked to each notification and capture `school_id` on notifications so list, retry, cancel, and dispatch authorization can be enforced by school.
- A worker claims due queue rows and resolves the current canonical contact at dispatch time. It records provider acceptance separately from delivery confirmation, redacts provider errors, and retries only bounded retryable failures with idempotency.
- Recipient consent/suppression rules must be decided and enforced before the worker can dispatch. Store only the minimum consent provenance required by that policy; do not copy contact destinations into attempts.
- For this interim release, all channel options remain visibly selectable for group planning, but a channel without an enabled provider displays “Delivery is not implemented yet. No message was sent.” and blocks send without creating a notification row.
- Product/deployment prerequisite: select provider(s), sender identity, deployment regions, credential ownership/rotation, and channel-specific consent/opt-out policy. Store credentials only in deployment secrets and validate configuration before enabling a channel.

## Production Release Plan

The production-readiness audit and release artifacts are maintained in `docs/release/`. The first P0 code task (guest session-list scoping) is implemented by reusing family-scoped history, with the full backend suite passing (31 suites, 73 tests). The audit, proposed single-instance architecture, environment/database/security checklists, and rollback design are planning artifacts only; no hosting provider was selected and no infrastructure was provisioned. Remaining ordered work is tracked in Phase 10 of `specs/001-smart-agenda-build/tasks.md` and `docs/release/tasks.md`.

## Complexity Tracking

No constitutional violations are anticipated for this feature. The architecture stays within the project’s intended scope and avoids creating additional deployment or service boundaries without a requirement-driven need.
