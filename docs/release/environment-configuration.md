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

Frontend development uses CRA and a proxy to `http://localhost:3030`. Production API routing and public URL variables are not configured in the repository. `docs/adr/.env.example` currently lists `APP_ENV` and `API_BASE_URL`, which do not map to backend runtime config; replace it after configuration schema decisions.

## Required Configuration Policy

- Validate configuration before listening; reject missing production mode, durable DB, allowed origin, cookie/security settings, and approved service config.
- Use one-origin routing if possible. If origins differ, allow only explicit origins and configure credentialed CORS, CSRF, and cookie policy together.
- Put secrets into the host secret manager; never commit `.env.production`, credentials, private keys, provider tokens, OAuth secrets, or database passwords.
- Keep distinct credentials for each environment and document owner, access, rotation, and revocation steps.
- Do not request secrets in chat. During provider setup, the operator enters them directly into the chosen secret manager.

## Proposed Example Shape (Not a Ready-to-Use File)

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
