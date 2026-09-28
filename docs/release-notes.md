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

- Production-sized performance fixture and staging backup/restore verification remain required before production deployment. The local MVP release gate has a conditional pass with rollback owner David Lara and last-known-good commit `1464c32`.