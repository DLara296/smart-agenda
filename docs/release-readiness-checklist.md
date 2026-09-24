# SmartAgenda Release Readiness Checklist

Use this checklist for the release candidate. Every item requires recorded evidence before approval.

## Automated Validation

- [ ] Frontend tests pass.
- [ ] Backend foundation, authorization, family, session, and notification suites pass in isolated processes.
- [ ] ESLint passes with no errors or warnings.
- [ ] Frontend production build succeeds.
- [ ] Ten critical-path flows meet the SC-006 threshold of at least 9 of 10 passing.
- [ ] SC-007 performance test meets dashboard p95 <= 2 seconds and assignment/notification API p95 <= 500 milliseconds under 10 concurrent coordinator requests.

## Security and Privacy

- [ ] Guest access is restricted to the own-family scope.
- [ ] Invitation tokens are time-limited, single-use, and auditable.
- [ ] Child and guardian data is minimized and excluded from logs.
- [ ] Audit records exist for critical writes, cancellations, replacements, and notification failures.

## Operations

- [ ] Environment variables and provider configuration are validated.
- [ ] Database migration and backup/restore procedures are documented.
- [ ] Health endpoint and notification provider status are smoke-tested.
- [ ] Rollback owner and last-known-good deployment are recorded.