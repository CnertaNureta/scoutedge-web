#!/usr/bin/env bash

set -euo pipefail

# Applies migrations, then runs verify and smoke against a fresh or disposable database.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPLY_SCRIPT="$ROOT_DIR/scripts/apply-core-football-schema.sh"
VERIFY_SCRIPT="$ROOT_DIR/scripts/verify-core-football-schema.sh"
SMOKE_SCRIPT="$ROOT_DIR/scripts/smoke-core-football-schema.sh"
TARGET_SCHEMA="${TARGET_SCHEMA:-public}"
source "$ROOT_DIR/scripts/lib/resolve-db-url.sh"

if [[ $# -gt 0 ]]; then
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$APPLY_SCRIPT" "$@"
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$VERIFY_SCRIPT" "$@"
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$SMOKE_SCRIPT" "$@"
  exit 0
fi

if resolve_db_url >/dev/null; then
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$APPLY_SCRIPT"
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$VERIFY_SCRIPT"
  TARGET_SCHEMA="$TARGET_SCHEMA" bash "$SMOKE_SCRIPT"
  exit 0
fi

cat >&2 <<'EOF'
Usage:
  DATABASE_URL=postgres://... bash scripts/validate-core-football-schema.sh
  SUPABASE_DB_URL=postgres://... bash scripts/validate-core-football-schema.sh
  POSTGRES_URL=postgres://... bash scripts/validate-core-football-schema.sh
  bash scripts/validate-core-football-schema.sh "postgres://..."
  bash scripts/validate-core-football-schema.sh -h localhost -U postgres -d app_db

Notes:
  - Intended for a fresh or disposable database.
  - Set `TARGET_SCHEMA=name` to run the full validation flow in an isolated schema instead of `public`.
  - Also reads `DATABASE_URL`, `SUPABASE_DB_URL`, or `POSTGRES_URL` from `.env.local` / `.env` when present.
  - Reuses the full workspace migration chain before structural and smoke checks.
EOF

exit 1
