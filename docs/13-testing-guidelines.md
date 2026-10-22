# Testing Guidelines

## Test Strategy
Smart Agenda should validate both domain logic and user-facing workflows with a layered approach: unit, integration, and critical-path end-to-end tests.

## Unit Tests
Validate:
- rotation behavior and overrides
- volunteer eligibility and duplicate booking rules
- coverage and language validation
- notification scheduling logic
- permission checks and authorization boundaries
- cancellation/replacement history integrity

## Integration Tests
Validate:
- API/database behavior for school setup, family enrollments, and sessions
- invitation and registration flows
- repository behavior and transaction boundaries
- notification adapters using sandbox or mock providers
- file metadata handling where media is supported

## End-to-End Critical Path
1. Invite and register admin
2. Create school, grade, groups, and teachers
3. Register family and child records
4. Create reading session
5. Validate rotation rules
6. Record volunteers
7. Detect missing group coverage
8. Confirm session and queue teacher notification
9. Cancel volunteer and assign replacement
10. Complete session and verify history
11. Confirm guest cannot mutate protected data

## Quality Gates
- Formatting
- Linting
- Type checking
- Unit tests
- Integration tests
- E2E critical path execution
- Build validation
- Dependency security review

## Definition of Done for Testing
A feature is not done until its validation is explicit, relevant, and observed. The team must not claim a test passed without actually running it.
