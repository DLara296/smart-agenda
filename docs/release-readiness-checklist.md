# SmartAgenda Release Readiness Checklist

Use this checklist for the release candidate. Every item requires recorded evidence before approval.

## Automated Validation

- [x] Frontend tests pass.
- [x] Backend foundation, authorization, family, session, and notification suites pass in isolated processes.
- [x] ESLint passes with no errors or warnings.
- [x] Frontend production build succeeds.
- [x] SC-006 evidence matrix covers all 10 defined critical flows: school setup, session creation, rotation override, coverage/language validation, assignment/cancellation/replacement, household registration, guest denial, invitation lifecycle, notification dispatch/retry, and notification idempotency.
- [x] SC-007 local smoke benchmark meets the API threshold under 10 concurrent coordinator requests; production-sized fixture validation remains a production-release follow-up.

## Security and Privacy

- [x] Guest access is restricted to the own-family scope.
- [x] Invitation tokens are time-limited, single-use, and auditable.
- [x] Child and guardian data is minimized and excluded from logs.
- [x] Audit records exist for critical writes, cancellations, replacements, and notification failures.

## Operations

- [x] Environment variables and provider configuration are validated.
- [x] Database migration and backup/restore procedures are documented.
- [x] Health endpoint and notification provider status are smoke-tested.
- [x] Rollback owner: David Lara. Last-known-good deployment: commit `1464c32` (`phase 4 complete`).

## Release Decision

**Conditional MVP readiness.** The local MVP passes the automated security, accessibility smoke, critical-flow, and API validation gates. Production deployment remains blocked until the production-sized SC-007 fixture benchmark is run and staging backup/restore is verified.