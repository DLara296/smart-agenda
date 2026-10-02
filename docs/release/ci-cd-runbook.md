# CI/CD and Release Approval Runbook

## Workflows

- `application-ci.yml` runs on pull requests and selected branch pushes. It installs with `npm ci`, scans tracked content for secrets, rejects critical production dependency advisories, lints, enforces the SQLite boundary, runs backend/frontend tests, builds the frontend, validates PostgreSQL migrations/integration against PostgreSQL 16, and uploads a build artifact named `smartagenda-<commit-sha>`.
- `application-release.yml` is manual only. The operator selects `validate`, `staging`, or `production`. Every target first rebuilds and validates the exact selected commit.
- `production` always depends on a successful staging deployment from the same workflow and commit.

## Required GitHub Configuration

Create two GitHub Actions environments:

| Environment | Required protection | Secrets | Variables |
|---|---|---|---|
| `staging` | Deployment branch restricted to the release branch | `DATABASE_URL`, `RENDER_DEPLOY_HOOK_URL` | `API_URL` |
| `production` | Required human reviewer; prevent self-review when available; deployment branch restricted to the release branch | `DATABASE_URL`, `RENDER_DEPLOY_HOOK_URL` | `API_URL` |

Use distinct Render databases, deploy hooks, service URLs, and application secrets for staging and production. Enter secret values directly in GitHub/Render; never place them in workflow inputs, repository files, issue text, or logs.

`API_URL` is non-secret and must be the HTTPS backend origin, for example `https://api-staging.example.org`. The workflow calls `<API_URL>/ready` after deployment.

## Release Sequence

1. Confirm the commit SHA and linked rollback reference.
2. Dispatch `Application Release` with target `staging`.
3. Review the SHA-named artifact, migration status output, Render deployment, and readiness result.
4. Complete staging application, security, backup/restore, and rollback checks outside the workflow.
5. Dispatch target `production` for the same approved commit.
6. The workflow repeats validation and staging. A required reviewer then approves or rejects the `production` environment job.
7. After approval, production migrations run separately from web startup, Render deploys the exact commit, and `/ready` must pass.

## Failure and Rollback

- Validation or migration failure stops deployment automatically.
- Readiness failure stops the workflow and requires operator investigation; it does not automatically reverse migrations.
- Use the rollback authority and procedures in `rollback-plan.md`. Do not approve production without a known-good release SHA, verified backup, and schema-compatibility decision.
- Re-run a failed release only after documenting the cause and confirming that retries cannot duplicate unsafe external actions.

## Evidence Required Before Closing T113/T124

- One pull request run proving required checks block a failing change.
- One successful PostgreSQL CI service run.
- One successful staging release run using synthetic data and an identifiable SHA artifact.
- Screenshot or audit record of the protected `production` environment and required reviewer.
- A rejected or intentionally stopped production approval rehearsal proving deployment does not proceed without approval.
- Confirmation that workflow logs contain no database credentials, OAuth secrets, recipient details, or message bodies.

## Dependency Audit Boundary

Compatible lockfile remediation cleared all critical advisories on 2026-09-30. The audit still reports high/moderate findings in the Create React App development/build dependency chain. The suggested forced fix would replace `react-scripts` with an invalid/breaking version, so it is not automated. Keep the critical gate enabled and track migration from the legacy CRA toolchain as a reviewed follow-up; do not use `npm audit fix --force` without a separate migration plan and complete frontend regression.
