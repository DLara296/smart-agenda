# Implementation Plan

## Phase 0: Discovery and specification
- Finalize product assumptions and open questions
- Confirm MVP scope and document requirement traceability
- Define the glossary and acceptance criteria for critical flows

## Phase 1: Architecture and foundation
- Set up TypeScript monorepo configuration
- Build frontend and backend foundations
- Configure linting, formatting, testing, and CI pipelines
- Establish DB and environment configuration patterns

## Phase 2: Authentication and authorization
- Invite-only admin registration
- Guest and family registration
- RBAC and route protection
- Password recovery and verification hooks if required

## Phase 3: School domain
- School, grade, group, teacher, and assignment management
- Rotation configuration and rotation data model

## Phase 4: Family domain
- Family, guardian, and child records
- School and language preferences
- Explicit privacy boundaries for guest access

## Phase 5: Reading sessions
- Session CRUD and calendar workflows
- Coverage validation and volunteer recording
- Book tracking and state transitions

## Phase 6: Notifications
- Provider abstraction
- Email, SMS, and WhatsApp staging adapters
- Retry, idempotency, and delivery status tracking

## Phase 7: Cancellation and recovery
- Replacements, cancellations, and escalation workflow
- History preservation and dashboard warnings

## Phase 8: Dashboard and history
- Operational dashboard and summary cards
- Historical timeline and notification status visibility

## Phase 9: Hardening
- Security review, accessibility review, and performance tuning
- E2E validation
- Observability and recovery documentation

## Phase 10: Deployment
- Environment configuration and deployment runbook
- Monitoring, backup strategy, and rollback plan
