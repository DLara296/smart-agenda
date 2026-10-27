# Render lowest-cost staging deployment

This deployment runs React and the Express API on **one origin** (`https://smart-agenda-staging.onrender.com`). The frontend uses relative `/v1/*` requests and therefore needs no public API base URL or cross-site cookies.

## Review and deploy

1. Review the PR, run the test suite and merge only after approval.
2. In Render, create a **Blueprint** from `render.yaml` in `DLara296/smart-agenda`. Inspect the proposed resources and prices **before** confirming. No services are provisioned by this PR.
3. Enter `INITIAL_ADMIN_EMAIL` and a strong `INITIAL_ADMIN_PASSWORD` in Render's environment-variable prompt. Never commit credentials. Render generates `SESSION_SECRET`.
4. Confirm Render supports the requested free PostgreSQL plan in your account/region; otherwise **stop** and choose an approved alternative rather than accepting a paid plan unexpectedly.
5. The build runs `npm ci && npm run build --workspace=frontend`. The start command applies pending PostgreSQL migrations and starts Express. Check deployment logs for successful migrations and startup.
6. Verify `/health`, `/ready`, `/`, admin sign-in, authenticated refresh, and one non-sensitive create/read workflow. `/ready` must return HTTP 503 when PostgreSQL is unavailable.
7. Keep real student/family data out of this staging database. Free PostgreSQL plans may expire and have no durable recovery guarantee.

## Operational and security notes

- `FRONTEND_ORIGIN` must match the deployed URL exactly, including HTTPS, with no trailing path.
- The API's session cookie is Secure, HttpOnly and SameSite=Lax in production. Single-origin hosting avoids third-party cookie restrictions.
- The initial administrator is provisioned on startup. Rotate the initial password after bootstrapping and review how credentials are retained in the environment.
- `GMAIL_*` credentials are intentionally unset: real email delivery remains disabled.
- `PGSSLMODE=require` is required by app validation. Review PostgreSQL TLS verification policy before production; the existing adapter sets `rejectUnauthorized: false`.
- The startup command runs migrations on each deployment. For production, replace this with an explicitly approved one-off migration step and prevent concurrent migrators.
- The frontend SPA fallback must not intercept `/v1/*`, `/health`, or `/ready`.
- Do not configure backups as complete: Cloudflare R2, age key custody, scheduled backup uploads, restore testing, and RPO/RTO sign-off remain separate release gates.
- Render free services can spin down when idle. Staging uptime is not guaranteed.
- This PR is preparation only: no Render infrastructure, database, R2 bucket or GitHub secrets have been created.
