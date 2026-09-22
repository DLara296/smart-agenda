# Deployment Runbook

## Environment Strategy
- Use separate development, staging, and production environments.
- Store secrets in a secure secret manager.
- Run migrations with explicit approval and rollback plan.

## Deployment Checklist
- Validate environment variables and provider credentials
- Run migrations and integrity checks
- Confirm queue and scheduler health
- Smoke-test login, school setup, and session flow
- Verify backup and restore readiness

## Rollback Strategy
- Keep the last known good deployment tag
- Roll back carefully if an API contract or migration breaks production workflows
- Reprocess or replay notifications only where idempotency allows it

## Monitoring
- Track API errors, scheduler failures, and queue lag
- Capture delivery failures from provider adapters
- Alert on repeated failed sends or critical missing coverage
