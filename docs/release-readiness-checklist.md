# SmartAgenda Release Readiness Checklist

Use this checklist for the release candidate. Every item requires recorded evidence before approval.

## Automated Validation

- [x] Frontend tests pass.
- [x] Backend foundation, authorization, family, session, and notification suites pass in isolated processes.
- [x] ESLint passes with no errors or warnings.
- [x] Frontend production build succeeds.
- [x] Critical-flow smoke coverage passes; formal SC-006 denominator sign-off remains pending.
- [x] SC-007 local smoke benchmark meets the API threshold under 10 concurrent coordinator requests; production-sized fixture benchmark remains pending.

## Security and Privacy

- [x] Guest access is restricted to the own-family scope.
- [x] Invitation tokens are time-limited, single-use, and auditable.
- [x] Child and guardian data is minimized and excluded from logs.
- [x] Audit records exist for critical writes, cancellations, replacements, and notification failures.

## Operations

- [x] Environment variables and provider configuration are validated.
- [x] Database migration and backup/restore procedures are documented.
- [x] Health endpoint and notification provider status are smoke-tested.
- [ ] Rollback owner and last-known-good deployment are recorded.