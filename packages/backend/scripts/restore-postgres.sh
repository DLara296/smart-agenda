#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -s "$1" ]]; then
  printf '%s\n' 'Usage: restore-postgres.sh <encrypted-backup.dump.age>' >&2
  exit 2
fi
if [[ -z "${RESTORE_DATABASE_URL:-}" ]]; then
  printf '%s\n' 'RESTORE_DATABASE_URL is required.' >&2
  exit 2
fi
if [[ "${RESTORE_TARGET_CONFIRMED:-}" != 'isolated-empty-database' ]]; then
  printf '%s\n' 'Restore requires explicit confirmation of an isolated empty database.' >&2
  exit 2
fi
if [[ -z "${BACKUP_AGE_IDENTITY_FILE:-}" || ! -s "$BACKUP_AGE_IDENTITY_FILE" ]]; then
  printf '%s\n' 'BACKUP_AGE_IDENTITY_FILE must point to a provisioned age identity.' >&2
  exit 2
fi
command -v age >/dev/null || { printf '%s\n' 'age is required.' >&2; exit 2; }
command -v pg_restore >/dev/null || { printf '%s\n' 'pg_restore is required.' >&2; exit 2; }
command -v psql >/dev/null || { printf '%s\n' 'psql is required.' >&2; exit 2; }

target_objects="$(psql --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align \
  --dbname="$RESTORE_DATABASE_URL" \
  --command "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')" \
  | tr -d '[:space:]')"
if [[ "$target_objects" != '0' ]]; then
  printf '%s\n' 'Restore target is not empty; refusing to overwrite user objects.' >&2
  exit 2
fi

umask 077
temporary_dump="$(mktemp "${TMPDIR:-/tmp}/smartagenda-restore.XXXXXX")"
trap 'rm -f "$temporary_dump"' EXIT
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" < "$1" > "$temporary_dump"
test -s "$temporary_dump"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$temporary_dump"
printf '%s\n' 'Encrypted PostgreSQL archive restored to the confirmed isolated target.'