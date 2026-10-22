# Architecture

## Architectural Decision
Smart Agenda will use a modular monolith with a TypeScript-first backend and a React + TypeScript frontend in a monorepo. This is the simplest architecture that satisfies the workflow without locking the product into unnecessary service boundaries.

## High-Level Architecture

```text
React + TypeScript Frontend
  ↓
Node.js + TypeScript API
  ↓
Application / Domain Services
  ↓
Repositories / Data Access
  ↓
Relational Database

Background Worker / Scheduler
  ↓
Notification Abstraction
  ├── Email
  ├── SMS
  └── WhatsApp

Object Storage
  └── Avatars and event media
```

## Frontend
- React with TypeScript for responsive UX
- Feature-oriented organization
- API client layer isolated from UI logic
- Authentication-aware route guards and permission-aware data access

## Backend
- Node.js with TypeScript and an HTTP framework
- Thin controllers and routers
- Service-layer business logic for sessions, coverage, notifications, and rotation
- Repository layer for persistence and authorization-aware queries

## Domain Boundaries
- School domain
- Family domain
- Session domain
- Volunteer domain
- Notification domain
- Administration domain
- Audit and history domain

## Persistence
A relational database is preferred because the domain includes many related entities and constraints across schools, groups, students, families, and assignments.

## Background Processing
A scheduler or queue handles notification jobs, retries, and reminder tasks. This keeps user actions responsive while preserving operational reliability.

## Data Storage Strategy
- Primary relational database for core domain data
- Object storage for avatars and optional event images
- Encrypted secret management for credentials and tokens

## Risks and Mitigations
- Risk: Overengineering to a microservice design too early.
- Mitigation: Keep modular boundaries but start as a single deployable application.
- Risk: Vendor coupling in notification logic.
- Mitigation: Use provider interfaces and adapters.
- Risk: Hard-coded school schedule assumptions.
- Mitigation: Explicit rotation and override configuration.

## Future Evolution
If the product grows beyond the MVP, the modular monolith can be decomposed into services by domain without redesigning the entire business model.
