#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFY_SQL="$ROOT_DIR/supabase/verify-core-football-schema.sql"
TARGET_SCHEMA="${TARGET_SCHEMA:-public}"
source "$ROOT_DIR/scripts/lib/resolve-psql.sh"
source "$ROOT_DIR/scripts/lib/resolve-db-url.sh"

if ! PSQL_BIN="$(resolve_psql_bin)"; then
  echo "psql is required to run core football schema verification. Install it or expose it on PATH." >&2
  exit 1
fi

run_verify() {
  if [[ "$TARGET_SCHEMA" == "public" ]]; then
    "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1 -f "$VERIFY_SQL"
  else
    printf 'set search_path to "%s", extensions;\n\\i %s\n' "$TARGET_SCHEMA" "$VERIFY_SQL" \
      | "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1
  fi
}

if [[ $# -gt 0 ]]; then
  run_verify "$@"
  exit $?
fi

if DB_URL="$(resolve_db_url)"; then
  run_verify "$DB_URL"
  exit $?
fi

cat >&2 <<'EOF'
Usage:
  DATABASE_URL=postgres://... bash scripts/verify-core-football-schema.sh
  SUPABASE_DB_URL=postgres://... bash scripts/verify-core-football-schema.sh
  POSTGRES_URL=postgres://... bash scripts/verify-core-football-schema.sh
  bash scripts/verify-core-football-schema.sh "postgres://..."
  bash scripts/verify-core-football-schema.sh -h localhost -U postgres -d app_db

Notes:
  - Set `TARGET_SCHEMA=name` to verify an isolated schema instead of `public`.
  - Also reads `DATABASE_URL`, `SUPABASE_DB_URL`, or `POSTGRES_URL` from `.env.local` / `.env` when present.
EOF

exit 1
