# Non-Functional Requirements

## Security
- Authentication must be required for administrator and guest-facing protected actions.
- Role-based access control must enforce least privilege for schools, families, and history records.
- Invitation tokens must be single-use, expiring, and revocable.
- User input validation must protect against injection, malformed identifiers, and oversize uploads.
- Secret management must rely on environment variables or a managed secret store.
- File uploads must use content-type validation, safe storage, and optional scanning.

## Privacy
- Minimize collection of child and family data to fields required by the reading program.
- Restrict guest access to explicitly shared records and not all family contact information.
- Log only minimal operational data; avoid storing raw PII in general application logs.
- Require explicit consent for photos and communication metadata where local law may require it.
- Provide a deletion or archive strategy to handle historical record retention without deleting audit logs.

## Reliability
- Jobs must be idempotent and retry-safe.
- Notification sending must support queueing, retry metadata, and dead-letter fallback.
- Data migrations must be versioned and reversible where feasible.
- Backups and restore steps must be documented for production operation.

## Performance
- Dashboard views should load within acceptable thresholds for common school sizes.
- API responses should be paginated for listing large collections.
- Search and filters should be indexed on common access paths.
- Large media uploads should be processed asynchronously when file size or storage constraints justify it.

## Observability
- Structured logs must capture key lifecycle events for session creation, volunteer assignment, cancellation, and notifications.
- Error tracking must include correlation IDs for request and job tracing.
- Alerting must distinguish execution failures from user-level validation errors.
- A scheduled-job monitor must track queue health, retries, and failed delivery.

## Measurable Targets
- Secure endpoints reject unauthorized requests with no data disclosure.
- Notification jobs must support retry and duplicate protection at the provider boundary.
- Critical path E2E tests must pass for admin invite, school setup, session creation, coverage validation, and completion.
- Dashboard and session views must remain functional on mobile, tablet, and desktop breakpoints.
