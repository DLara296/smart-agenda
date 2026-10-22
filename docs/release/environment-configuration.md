# Environment and Secrets Configuration

## Environment Isolation

```text
Local development -> CI/test -> staging -> production
```

Each environment must have separate database/storage, URLs/origins, cookie settings, OAuth/service credentials, logs/monitoring, and test accounts. Staging must not contain production family or child data unless explicitly approved and protected.

## Values Observed in the Repository

Backend currently reads:

| Variable | Current behavior | Release action |
|---|---|---|
| `NODE_ENV` | Defaults to development; determines development-admin/demo provisioning and cookie `Secure` flag. | Required explicit value; fail closed for production. |
| `PORT` | Defaults to 3030. | Validate and expose through platform port binding. |
| `DATABASE_URL` | Defaults to `:memory:`; SQLite paths remain supported for local/test use and PostgreSQL URLs select the PostgreSQL tooling. | Require a Render-managed PostgreSQL URL in staging/production secrets; never expose credentials in logs or repository files. |
| `PGSSLMODE` | Defaults to `require` in production and `disable` otherwise. | Set `require` for Render staging/production and `disable` only for trusted local/CI PostgreSQL services. |
| `PG_POOL_MAX` | Defaults to 10 connections. | Set from the managed database connection budget and reserve capacity for migrations and operations. |
| `PG_CONNECTION_TIMEOUT_MS` | Defaults to 5000 ms. | Tune only from staging evidence; readiness must fail when the database is unavailable. |
| `PG_IDLE_TIMEOUT_MS` | Defaults to 10000 ms. | Tune only from staging evidence and provider connection limits. |
| `POSTGRES_TEST_DATABASE_URL` | No default; enables the isolated real-PostgreSQL Jest suite. | CI-only test database URL. Never point it at staging or production. |
| `FRONTEND_ORIGIN` | Empty by default; production requires one canonical HTTPS origin without a path. | Set independently for staging and production; requests from other origins fail closed. |
| `SESSION_SECRET` | Empty outside configured environments; production requires at least 32 characters. | Generate and install independently in each environment's secret manager. |
| `INITIAL_ADMIN_EMAIL` | Empty by default; production requires a valid address. | Supply only for controlled first-run provisioning and retain ownership records. |
| `INITIAL_ADMIN_PASSWORD` | Empty by default; production requires at least 12 characters. | Install through secret management and rotate after controlled bootstrap. |
| `SMARTAGENDA_ADMIN_EMAIL` | Development admin email override only. | Do not use the development bootstrap path in production. Define a controlled initial-admin provisioning workflow. |
| `SMARTAGENDA_ADMIN_PASSWORD` | Development admin password override; current code has a known fallback. | Eliminate production fallback; never put the production value in a repository file or chat. |
| `SESSION_REMINDER_LEAD_HOURS` | Defaults to 24 hours. | Validate range and timezone behavior. |
| `NOTIFICATION_PROVIDER` | Defaults to `sandbox`; loaded but not currently used for adapter selection. | Do not imply it configures production delivery. Replace with validated provider/channel configuration only after provider approval. |
| `GMAIL_SENDER_EMAIL` | Gmail API sender account configured for the approved Email adapter. | Requested sender is `david.lara170385@gmail.com`; verify that sender identity and account policy permit application sends. |
| `GMAIL_OAUTH_CLIENT_ID` | Google Cloud OAuth web/server client ID. | Configure Gmail API and OAuth consent; register the exact redirect used for refresh-token provisioning. |
| `GMAIL_OAUTH_CLIENT_SECRET` | OAuth client secret. | Deployment secret only; rotate/revoke through Google Cloud if exposed. |
| `GMAIL_OAUTH_REFRESH_TOKEN` | Server-side OAuth refresh token granted `https://www.googleapis.com/auth/gmail.send`. | Deployment secret only; provision offline access and verify consent-screen publishing/verification and token-expiry behavior. |
| `NOTIFICATION_WORKER_INTERVAL_MS` | Notification worker polling interval; default 5000 ms. | Tune and monitor after staging load tests; worker starts only when Email configuration is present. |
| `NOTIFICATION_MAX_ATTEMPTS` | Maximum automatic provider attempts; default 5. | Review bounded retry policy against Gmail transient errors and duplicate-send risk. |

Frontend development uses CRA and a proxy to `http://localhost:3030`. Production API routing and public URL variables are not configured in the repository. `docs/adr/.env.example` currently lists `APP_ENV` and `API_BASE_URL`, which do not map to backend runtime config; replace it after configuration schema decisions.

PostgreSQL schema changes are never applied implicitly by the web process. A release operator or CI job must run `db:status`, `db:migrate`, then `db:status` against an isolated target before deploying application code. `db:recover` retries migrations that remain pending after transactional failure; it does not perform destructive rollback.

## Required Configuration Policy

- Validate configuration before listening; reject missing production mode, durable DB, allowed origin, cookie/security settings, and approved service config.
- Use one-origin routing if possible. If origins differ, allow only explicit origins and configure credentialed CORS, CSRF, and cookie policy together.
- Put secrets into the host secret manager; never commit `.env`, `.env.production`, credentials, private keys, provider tokens, OAuth secrets, or database passwords. `.env.example` is placeholder-only; the backend entrypoint loads `.env` for local development through dotenv.
- Keep distinct credentials for each environment and document owner, access, rotation, and revocation steps.
- Do not request secrets in chat. During provider setup, the operator enters them directly into the chosen secret manager.

## Gmail API OAuth Setup Gate

The adapter uses Gmail API `users.messages.send`, not SMTP, and requires the send-only `gmail.send` scope. Enable Gmail API in a Google Cloud project, configure the OAuth consent screen and server/web OAuth client, obtain an offline refresh token for the sender account, and verify that the app is allowed to use this scope for production. External Testing-mode refresh tokens may expire; do not enable production delivery until a real staging send, sender verification, and token refresh/revocation tests pass.

## Local Template

Root `.env.example` documents supported backend variables. It contains no credentials. Copy it to ignored `.env` only for local configuration. Production must use the selected platform's secret manager and must not copy development defaults.

Numeric settings fail startup when malformed or outside their documented ranges. `NODE_ENV` accepts only `development`, `test`, or `production`; `PGSSLMODE` accepts only `require` or `disable`.

Production responses use Helmet security headers. Credentialed CORS allows only `FRONTEND_ORIGIN`, and unsafe browser requests without that origin are rejected as a CSRF defense. Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. The production process handles `SIGTERM`/`SIGINT`, stops worker polling, drains HTTP connections, and closes database resources.

```text
NODE_ENV=production
PORT=<platform-provided-port>
DATABASE_URL=<managed-postgresql-url>
PGSSLMODE=require
PG_POOL_MAX=10
PG_CONNECTION_TIMEOUT_MS=5000
PG_IDLE_TIMEOUT_MS=10000
FRONTEND_ORIGIN=<approved-https-origin>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=<reviewed-policy>
SMARTAGENDA_ADMIN_EMAIL=<provisioned-admin-address>
NOTIFICATION_CHANNELS=<empty-until-approved-and-wired>
```

This is documentation only. Do not copy placeholders into production. The app must first implement and validate each configuration field before this becomes `.env.example`.
