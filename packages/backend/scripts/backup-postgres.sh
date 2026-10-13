#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  printf '%s\n' 'DATABASE_URL is required.' >&2
  exit 2
fi
if [[ -z "${BACKUP_AGE_RECIPIENT:-}" ]]; then
  printf '%s\n' 'BACKUP_AGE_RECIPIENT is required.' >&2
  exit 2
fi
command -v pg_dump >/dev/null || { printf '%s\n' 'pg_dump is required.' >&2; exit 2; }
command -v age >/dev/null || { printf '%s\n' 'age is required.' >&2; exit 2; }

umask 077
output_directory="${BACKUP_OUTPUT_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/smartagenda-backups}"
mkdir -p "$output_directory"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_path="$output_directory/smartagenda-${timestamp}.dump.age"
temporary_path="${output_path}.tmp.$$"
trap 'rm -f "$temporary_path"' EXIT

pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" > "$temporary_path"
test -s "$temporary_path"
mv "$temporary_path" "$output_path"
trap - EXIT
printf '%s\n' "$output_path"