# SmartAgenda MVP Release Notes

## Included

- Calendar-first coordinator dashboard with readiness, attention, upcoming sessions, and communication panels.
- Household family registration with guardian and child records.
- Role and family-scope authorization boundaries.
- Session coverage and volunteer assignment idempotency.
- Cancellation audit history and rotation override persistence.
- Invitation lifecycle and sandbox notification provider.
- SQLite migration bootstrap, audit records, health endpoint, linting, and production frontend build.

## Validation

- Frontend tests and production build pass.
- Full backend Jest suite passes under Node.js 24 after upgrading `better-sqlite3` to 13.0.3.
- SC-007 local smoke benchmark passes the API latency threshold.

## Known Release Gates

- Production-sized performance fixture, rollback owner, and formal SC-006 release sign-off remain pending.