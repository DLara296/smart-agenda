# Production Database Migration and Recovery Plan

## Current State

`better-sqlite3` remains the local/test database dependency and `pg` provides the PostgreSQL adapter. `createDatabase()` still executes an ordered array of SQLite SQL strings at process startup and records a migration version after each statement. The PostgreSQL adapter has contract coverage for pooled query, one, execute, transaction rollback, readiness, and shutdown operations. Versioned PostgreSQL migrations now cover the current application schema and record a SHA-256 checksum for every applied migration. Real PostgreSQL integration, backup/restore automation, and staging rehearsal remain open.

## Production Gate

Do not deploy until the selected database and durable storage are explicit, startup cannot fall back to memory, migrations are tested on a staging backup/copy, and restore is rehearsed.

## SQLite V1 Path (Conditional)

Use SQLite only if the host guarantees a persistent local filesystem, a single writer/API instance, safe database file permissions, and a tested backup mechanism. Treat the DB, WAL, and shared-memory files consistently. Never copy a live database without a SQLite-consistent backup method.

1. Identify the production DB path and enforce it at startup.
2. Stop application writes or use a SQLite online-backup mechanism for snapshots.
3. Encrypt backup artifacts before off-host transfer; restrict access and retention.
4. Validate file integrity and schema version after backup.
5. Restore into an isolated staging instance, run integrity/business checks, and record restore time.
6. Document who can authorize recovery and how to prevent the old instance from continuing writes.
7. Set owner-approved RPO/RTO before launch and alert on missed backup jobs.

## PostgreSQL Alternative

If persistent SQLite volumes, backup guarantees, concurrency, or host availability are insufficient, first implement a database abstraction and PostgreSQL-compatible repositories/migrations. Do not point the current `DATABASE_URL` at PostgreSQL: the code passes it as a SQLite filename and SQL/migration compatibility is unverified.

The web application still fails closed when a PostgreSQL URL is supplied. This prevents a deployment from opening the URL as a SQLite filename until real PostgreSQL route integration and staging validation pass. T106 remains open until the complete backend suite runs against PostgreSQL and staging evidence is attached.

The shared async database contract is available in `src/db/databaseContract.js` with SQLite and PostgreSQL implementations, including query, execute, transaction, readiness, and shutdown behavior. Runtime routes and the notification worker use async operations; legacy synchronous service APIs remain for SQLite compatibility/bootstrap and must be removed before T122/T126 close.

The audit and school-membership paths use async contract methods. The notification worker now performs claims, destination/consent resolution, status transitions, attempt persistence, and audit writes through async contract transactions for both SQLite and PostgreSQL. Remaining legacy direct SQLite service APIs are tracked by T130/T131.

Family list/detail/children and create/update flows now use async database contract methods. Family writes, guardian consent events, and child/guardian deactivation run inside one transaction; guest account linkage and audit writes are awaited through the async route path. Local SQLite integration coverage passes.

Runtime School/Grade/Group/Teacher/Student routes, assignment routes, session CRUD/list/dashboard/history reads, notification routes/reminders, and entity archive/delete-impact routes now use async service methods. The application route layer contains no direct `db.prepare()` calls; remaining synchronous access is limited to legacy service methods still needed by local startup fixtures and migrations pending their complete module removal. T131 adds the CI guard for that boundary.

Invitation issuance and notification-group CRUD/recipient resolution are now also routed through async contract methods. Existing synchronous service methods remain for current SQLite tests and local bootstrap compatibility; PostgreSQL readiness still depends on completing the shared-contract migration for every service used by production startup and routes.

The notification service no longer exposes synchronous SQLite methods. Its direct contract tests use the shared SQLite adapter, and the worker uses async service transitions for SQLite and PostgreSQL. The database-boundary baseline for `notificationService.js` is zero.

Audit, coordinator-school membership, and volunteer assignment services now expose only async database-contract operations. Entity management's synchronous SQLite implementation was removed; its remaining guard count represents async contract transactions. Focused audit/archive/authorization/assignment tests pass on SQLite.

Family-scoped session history now exposes only its async contract API; guest list/history privacy and filter authorization tests pass. Its direct SQLite baseline is zero.

Rotation rule/override persistence now also uses only async contract methods, with override provenance coverage passing against SQLite.

Family service now exposes only async contract methods. Family create/update transactions, consent writes, list/detail reads, and ownership validation all use the shared async contract; its remaining boundary count of two corresponds to `storage.transaction` calls, not direct SQLite APIs.

Invitation issuance, acceptance, and revocation; and notification-group lookup, recipient resolution, save/remove, and listing now expose only async contract methods. Their existing lifecycle and school-scope integration tests pass.

Session create/read/update is now async-only as well; scheduling uniqueness, teacher validation, timezone, guest history, and image-edit tests continue to pass through the contract implementation.

User profile and appearance/notification preference operations are now async-only. `ensureUser` retains a minimal SQLite bootstrap path for local development/test; all request-time user operations use the shared contract.

Authentication registration, sign-in, session creation, token lookup, and revoke APIs now expose only async contract methods. Synchronous auth operations are limited to development and initial-admin bootstrap provisioning; their direct-call baseline is five.

Communication consent persistence is now async-only; app startup no longer instantiates a legacy consent repository, and async school listing fails closed to no consent if its async provider is absent. Its direct SQLite baseline is zero.

School/grade/group/teacher/student service CRUD is async-only. Fixed local demo school/grade/group fixture creation was moved into `src/db/localSchoolSeed.js`, keeping bootstrap persistence inside the database layer and leaving the school service with zero direct SQLite calls.

The backend suite now includes a SQLite API boundary regression test against `src/db/sqlite-call-baseline.json`; new direct `.prepare()`/`.transaction()` call sites outside `src/db/` fail the test unless the baseline is explicitly reviewed. Run it standalone with `npm run check:database-boundary --workspace=backend`.

## Migration Improvements Required

- PostgreSQL migration execution is separate from web process startup. Use `npm run db:status --workspace=backend`, `npm run db:migrate --workspace=backend`, and `npm run db:recover --workspace=backend` with an explicit PostgreSQL `DATABASE_URL`.
- Each pending PostgreSQL migration runs transactionally and records its version, name, SHA-256 checksum, and application timestamp. Checksum drift fails closed.
- `db:recover` retries only migrations that have no successful ledger record; transactional DDL leaves failed migrations pending.
- `.github/workflows/application-release.yml` runs `status`, `migrate`, and `status` against the protected staging database before invoking the Render staging deploy hook. Production migration is available only in the protected `production` environment after the same commit passes staging.
- Test upgrade from a production-like previous schema and test failed migration recovery.
- Enforce session uniqueness and critical foreign-key/authorization constraints in the chosen production engine.
- Require explicit approval and recovery point before migration; prohibit unsafe automatic destructive rollback.

## Release Sequence

1. Provision isolated staging database/storage.
2. Restore a synthetic or sanitized previous-version fixture.
3. Apply migrations using the release migration command.
4. Run integrity checks and the complete backend integration suite.
5. Exercise backup and restore to a fresh isolated target and record RPO/RTO.
6. Approve production migration from evidence; take and verify a pre-migration backup.
7. Apply backward-compatible migration, deploy application, then remove obsolete schema only in a later reviewed release.
