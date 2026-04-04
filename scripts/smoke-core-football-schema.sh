#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_SQL="$ROOT_DIR/supabase/smoke-core-football-schema.sql"
TARGET_SCHEMA="${TARGET_SCHEMA:-public}"
source "$ROOT_DIR/scripts/lib/resolve-psql.sh"
source "$ROOT_DIR/scripts/lib/resolve-db-url.sh"

if ! PSQL_BIN="$(resolve_psql_bin)"; then
  echo "psql is required to run core football schema smoke validation. Install it or expose it on PATH." >&2
  exit 1
fi

run_smoke() {
  if [[ "$TARGET_SCHEMA" == "public" ]]; then
    "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1 -f "$SMOKE_SQL"
  else
    printf 'set search_path to "%s", extensions;\n\\i %s\n' "$TARGET_SCHEMA" "$SMOKE_SQL" \
      | "$PSQL_BIN" "$@" -v ON_ERROR_STOP=1
  fi
}

if [[ $# -gt 0 ]]; then
  run_smoke "$@"
  exit $?
fi

if DB_URL="$(resolve_db_url)"; then
  run_smoke "$DB_URL"
  exit $?
fi

cat >&2 <<'EOF'
Usage:
  DATABASE_URL=postgres://... bash scripts/smoke-core-football-schema.sh
  SUPABASE_DB_URL=postgres://... bash scripts/smoke-core-football-schema.sh
  POSTGRES_URL=postgres://... bash scripts/smoke-core-football-schema.sh
  bash scripts/smoke-core-football-schema.sh "postgres://..."
  bash scripts/smoke-core-football-schema.sh -h localhost -U postgres -d app_db

Notes:
  - Set `TARGET_SCHEMA=name` to smoke-test an isolated schema instead of `public`.
  - Also reads `DATABASE_URL`, `SUPABASE_DB_URL`, or `POSTGRES_URL` from `.env.local` / `.env` when present.
EOF

exit 1
