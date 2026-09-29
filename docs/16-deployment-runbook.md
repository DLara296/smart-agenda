# Deployment Runbook

## Production Release Planning
- Production readiness audit and severity findings: `docs/release/production-readiness-audit.md`.
- Ordered release workflow and proposed architecture: `docs/release/production-release-plan.md` and `docs/release/deployment-architecture.md`.
- Environment, database recovery, security, rollback, and post-release checks: see the remaining documents under `docs/release/`.
- Do not deploy production until P0 items in the audit are resolved, V1 scope/architecture are approved, and the production checklist is supported by verification evidence.

## Environment Strategy
- Use separate development, staging, and production environments.
- Store secrets in a secure secret manager.
- Run migrations with explicit approval and rollback plan.
- Development uses SQLite through `DATABASE_URL` and the sandbox notification provider.
- The backend listens on `PORT` (default `3030`) and the frontend is served on port `3000`.

## Deployment Checklist
- Validate environment variables and provider credentials
- Run migrations and integrity checks
- Confirm queue and scheduler health
- Smoke-test login, school setup, and session flow
- Verify backup and restore readiness
- Confirm `GET /health` returns `{ "status": "ok" }`.
- Run `npm run lint`, `npm run test:frontend`, and the isolated backend suites.
- Confirm guest requests cannot cross family scope and invitation tokens are single-use.

## Rollback Strategy
- Keep the last known good deployment tag
- Roll back carefully if an API contract or migration breaks production workflows
- Reprocess or replay notifications only where idempotency allows it

## Monitoring
- Track API errors, scheduler failures, and queue lag
- Capture delivery failures from provider adapters
- Alert on repeated failed sends or critical missing coverage
- Track p95 dashboard/API latency against SC-007 before production approval.
