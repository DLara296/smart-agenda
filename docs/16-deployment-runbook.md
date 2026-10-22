# Deployment Runbook

## Production Release Planning
- Production readiness audit and severity findings: `docs/release/production-readiness-audit.md`.
- Ordered release workflow and proposed architecture: `docs/release/production-release-plan.md` and `docs/release/deployment-architecture.md`.
- Environment, database recovery, security, rollback, and post-release checks: see the remaining documents under `docs/release/`.
- CI validation, staging dispatch, production environment approval, and required GitHub/Render settings: `docs/release/ci-cd-runbook.md`.
- Do not deploy production until P0 items in the audit are resolved, V1 scope/architecture are approved, and the production checklist is supported by verification evidence.

## Environment Strategy
- Use separate development, staging, and production environments.
- Store secrets in a secure secret manager; do not pass OAuth secrets or refresh tokens through chat, request payloads, or committed files.
- Run migrations with explicit approval and a rollback plan.
- Development uses SQLite through `DATABASE_URL`; notification delivery remains disabled unless a test provider is explicitly injected.
- The backend listens on `PORT` (default `3030`) and the frontend is served on port `3000`.
- See `docs/release/environment-configuration.md` for the complete environment-variable inventory and release gates.

## Gmail OAuth Setup
1. Create/select the Google Cloud project and enable Gmail API.
2. Configure the OAuth consent screen, publisher/testing status, and a server/web OAuth client. Register the exact redirect URI used by the operator's offline-token provisioning procedure; this repository does not provide a public OAuth callback route.
3. Authorize the approved sender account, `david.lara170385@gmail.com`, with only `https://www.googleapis.com/auth/gmail.send` and offline access. Store the resulting client ID, client secret, and refresh token in the environment's secret manager under `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN`; set `GMAIL_SENDER_EMAIL` separately.
4. Verify the account is permitted to send as the configured identity, the OAuth app is in an approved publishing/verification state for the intended audience, and refresh-token expiry/revocation procedures are understood. Testing-mode refresh tokens can expire.
5. In isolated staging, check `GET /v1/notification-capabilities` reports Email enabled, send only to a dedicated opted-in test recipient, confirm a provider-accepted history entry and provider message ID, then verify the recipient inbox independently. API acceptance alone is not proof of inbox delivery.
6. Rotate or revoke credentials in Google Cloud, update the secret manager, restart/reload the backend, and verify readiness before re-enabling delivery. Never copy live values into `.env.example` or logs.

Email dispatch requires explicit, current opt-in for each guardian or teacher. Revocation is checked again by the worker immediately before sending. Coordinators currently cannot manage notification dispatch/history; keep this admin-only until coordinator-to-school assignment authorization is implemented and tested. SMS and WhatsApp remain disabled.

## Deployment Checklist
- Validate environment variables and provider credentials without printing values
- Run migrations and integrity checks
- Confirm queue and scheduler health
- Smoke-test login, school setup, and session flow
- Verify backup and restore readiness
- Confirm `GET /health` returns `{ "status": "ok" }`.
- Run `npm run lint`, `npm run test:frontend`, and the isolated backend suites.
- Confirm guest requests cannot cross family scope and invitation tokens are single-use.
- Confirm notification history is scoped to the selected school and omits destination/message data.
- Record Gmail API acceptance as `sent`; do not claim `delivered` absent a separate confirmation mechanism.
- Run `Application Release` against the exact approved commit. Staging must pass first; production must remain blocked on the protected GitHub `production` environment reviewer.

## Rollback Strategy
- Keep the last known good deployment tag
- Roll back carefully if an API contract or migration breaks production workflows
- Reprocess or replay notifications only where idempotency allows it

## Monitoring
- Track API errors, scheduler failures, and queue lag
- Capture delivery failures from provider adapters
- Alert on repeated failed sends or critical missing coverage
- Track p95 dashboard/API latency against SC-007 before production approval.
