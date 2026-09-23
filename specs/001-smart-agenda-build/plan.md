# Implementation Plan: Smart Agenda Build and Delivery Roadmap

**Branch**: `001-smart-agenda-build` | **Date**: 2026-09-23 | **Spec**: `specs/001-smart-agenda-build/spec.md`

**Input**: Feature specification from `/specs/001-smart-agenda-build/spec.md`

## Summary

The Smart Agenda MVP will deliver a school reading coordination workflow in a modular monolith: a React frontend for coordinators and family users, an Express/Node backend for domain logic, and a relational database for schools, schedules, guardian records, sessions, volunteers, and notifications. The implementation is driven by the product requirements around household-based family registration, role-based access, missing-volunteer coverage checks, notification abstraction, and audit-preserving cancellation/replacement workflows.

## Technical Context

**Language/Version**: JavaScript with Node.js 18+ and React 18. JavaScript is the implementation standard for this MVP; any TypeScript migration is deferred to a separately planned feature after the MVP release.

**Primary Dependencies**: React, React Scripts, Express, better-sqlite3, CORS, Morgan, Axios, Jest, Supertest, Testing Library.

**Storage**: Relational database with SQLite for local development and MVP testing, with a PostgreSQL-compatible schema design ready for production scaling.

**Testing**: Jest, React Testing Library, Supertest, and critical-path integration/E2E validation for the school reading workflow.

**Target Platform**: Web application for desktop and tablet-first school operations, with mobile-responsive family-facing flows.

**Project Type**: Web application with a modular monolith backend and a React frontend in a npm workspace monorepo.

**Performance Goals**: With a single-school fixture containing 50 groups, 500 family records, and one academic year of sessions, dashboard load completes within 2 seconds at p95 and assignment and notification API requests complete within 500 milliseconds at p95 under 10 concurrent simulated coordinator requests. Reminder jobs process asynchronously without blocking user actions.

**Constraints**: secure guest access boundaries, explicit privacy rules for family data, deterministic coverage checks, provider abstraction for notifications, and zero hidden manual steps in operational history tracking.

**Scale/Scope**: single-school MVP with configurable grades, groups, rotations, and family records; extendable to multi-school or multi-region deployment without redesigning core domain boundaries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This plan passes the constitution’s requirements because it maintains:
- specification-driven scope and traceability from requirements to implementation
- explicit admin/guest access boundaries and least-privilege policies
- testing-first and verification-anchored delivery for critical flows
- modular boundaries without premature microservice complexity
- operational observability, privacy, and deployment-readiness requirements from the outset

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

## Complexity Tracking

No constitutional violations are anticipated for this feature. The architecture stays within the project’s intended scope and avoids creating additional deployment or service boundaries without a requirement-driven need.
