#!/usr/bin/env bash

set -euo pipefail

# Applies the workspace migration chain to a fresh or disposable database.
# Historical migrations in this repo are not guaranteed to be reentrant.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TARGET_SCHEMA="${TARGET_SCHEMA:-public}"
source "$ROOT_DIR/scripts/lib/resolve-psql.sh"
source "$ROOT_DIR/scripts/lib/resolve-db-url.sh"

if ! PSQL_BIN="$(resolve_psql_bin)"; then
  echo "psql is required to apply the core football schema migrations. Install it or expose it on PATH." >&2
  exit 1
fi

migration_files=()
while IFS= read -r sql_file; do
  migration_files+=("$sql_file")
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "No SQL migrations were found under $MIGRATIONS_DIR." >&2
  exit 1
fi

run_sql_file() {
  local sql_file="$1"
  shift

  if [[ "$TARGET_SCHEMA" == "public" ]]; then
    "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1 -f "$sql_file"
  else
    printf 'set search_path to "%s", extensions;\n\\i %s\n' "$TARGET_SCHEMA" "$sql_file" \
      | "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1
  fi
}

if [[ $# -gt 0 ]]; then
  if [[ "$TARGET_SCHEMA" != "public" ]]; then
    "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1 -c "create schema if not exists \"$TARGET_SCHEMA\""
  fi
  for sql_file in "${migration_files[@]}"; do
    run_sql_file "$sql_file" "$@"
  done
  exit 0
fi

if DB_URL="$(resolve_db_url)"; then
  if [[ "$TARGET_SCHEMA" != "public" ]]; then
    "$PSQL_BIN" "$DB_URL" -v ON_ERROR_STOP=1 -c "create schema if not exists \"$TARGET_SCHEMA\""
  fi
  for sql_file in "${migration_files[@]}"; do
    run_sql_file "$sql_file" "$DB_URL"
  done
  exit 0
fi

cat >&2 <<'EOF'
Usage:
  DATABASE_URL=postgres://... bash scripts/apply-core-football-schema.sh
  SUPABASE_DB_URL=postgres://... bash scripts/apply-core-football-schema.sh
  POSTGRES_URL=postgres://... bash scripts/apply-core-football-schema.sh
  bash scripts/apply-core-football-schema.sh "postgres://..."
  bash scripts/apply-core-football-schema.sh -h localhost -U postgres -d app_db

Notes:
  - Intended for a fresh or disposable database.
  - Set `TARGET_SCHEMA=name` to validate inside an isolated schema instead of `public`.
  - Also reads `DATABASE_URL`, `SUPABASE_DB_URL`, or `POSTGRES_URL` from `.env.local` / `.env` when present.
  - Historical workspace migrations are not guaranteed to be safely re-runnable.
EOF

exit 1
