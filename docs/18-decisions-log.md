# Decisions Log

## ADR-001: Monolith over microservices for MVP
Decision: Use a modular monolith for the initial product.
Rationale: The domain is complex but still manageable within a single deployable system, and premature service decomposition would increase operational overhead without clear benefit.

## ADR-002: Relational database as source of truth
Decision: Use a relational database for core domain records.
Rationale: The system needs explicit relationships across schools, grades, groups, teachers, students, families, and assignments.

## ADR-003: Notification abstraction
Decision: Business logic must interact with a notification abstraction instead of direct vendor APIs.
Rationale: This prevents business rules from becoming tightly coupled to vendor-specific delivery mechanics and better supports retries, status tracking, and future provider changes.

## ADR-004: Provider-first SMS and WhatsApp strategy
Decision: Support email-first launch with provider abstraction for SMS and WhatsApp, using mocks or sandboxes until production credentials and feasibility are confirmed.
Rationale: This avoids pretending production delivery works before provider approval and implementation review.

## ADR-005: Privacy-first guest access
Decision: Guests and family accounts default to least privilege and explicit authorization boundaries.
Rationale: Child and family data are sensitive and the product needs to minimize exposure by default.
