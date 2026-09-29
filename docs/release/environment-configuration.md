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
| `DATABASE_URL` | Defaults to `:memory:` and is passed as a `better-sqlite3` filename. | Require explicit durable path for SQLite; do not interpret as PostgreSQL URL without implementing an adapter. |
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

```text
NODE_ENV=production
PORT=<platform-provided-port>
DATABASE_URL=<durable-sqlite-file-path-or-adapter-specific-url>
FRONTEND_ORIGIN=<approved-https-origin>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=<reviewed-policy>
SMARTAGENDA_ADMIN_EMAIL=<provisioned-admin-address>
NOTIFICATION_CHANNELS=<empty-until-approved-and-wired>
```

This is documentation only. Do not copy placeholders into production. The app must first implement and validate each configuration field before this becomes `.env.example`.
