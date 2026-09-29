# Production Database Migration and Recovery Plan

## Current State

`better-sqlite3` is the only backend database dependency. `createDatabase()` executes an ordered array of SQL strings at process startup and records a migration version after each statement. There is no dedicated migration CLI, migration transaction wrapper, PostgreSQL adapter, backup script, restore script, or repository evidence of a restore rehearsal. The runtime default is `:memory:`. Current development seed/bootstrap behavior also creates demo schools and, outside test/production, a development admin.

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

## Migration Improvements Required

- Separate migration execution from web process startup.
- Run each migration transactionally when the engine permits; make changes idempotent and record applied version/checksum.
- Provide `status`, `up`, and recovery/backup verification commands.
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
