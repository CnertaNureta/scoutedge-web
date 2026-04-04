#!/usr/bin/env bash

set -euo pipefail

# Checks whether the current shell can complete the schema publish/runtime path.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0
source "$ROOT_DIR/scripts/lib/resolve-psql.sh"
source "$ROOT_DIR/scripts/lib/resolve-db-url.sh"

pass() {
  printf 'PASS %s\n' "$1"
}

warn() {
  printf 'WARN %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

if command -v git >/dev/null 2>&1; then
  pass "git is installed"
else
  fail "git is not installed"
fi

if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_DIR="$(git -C "$ROOT_DIR" rev-parse --git-dir)"

  if [[ -e "$ROOT_DIR/$GIT_DIR/FETCH_HEAD" ]]; then
    if [[ -w "$ROOT_DIR/$GIT_DIR/FETCH_HEAD" ]]; then
      pass ".git/FETCH_HEAD is writable"
    else
      fail ".git/FETCH_HEAD is not writable"
    fi
  elif [[ -w "$ROOT_DIR/$GIT_DIR" ]]; then
    pass ".git directory is writable"
  else
    fail ".git directory is not writable"
  fi
else
  fail "workspace is not inside a git worktree"
fi

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/tmp/zon-6-gh-auth-status.txt 2>&1; then
    pass "GitHub CLI auth is valid"
  else
    GH_AUTH_SUMMARY="$(head -n 3 /tmp/zon-6-gh-auth-status.txt | tr '\n' ' ' | sed 's/  */ /g')"
    fail "GitHub CLI auth is not ready: ${GH_AUTH_SUMMARY}"
  fi
else
  fail "GitHub CLI is not installed"
fi

if PSQL_BIN="$(resolve_psql_bin)"; then
  pass "psql is available at $PSQL_BIN"
else
  fail "psql is not installed or discoverable in common locations"
fi

if DB_URL="$(resolve_db_url)"; then
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pass "DATABASE_URL is set in the current shell"
  elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    pass "SUPABASE_DB_URL is set in the current shell"
  elif [[ -n "${POSTGRES_URL:-}" ]]; then
    pass "POSTGRES_URL is set in the current shell"
  elif [[ -f "$ROOT_DIR/.env.local" ]]; then
    pass "database URL was discovered in .env.local"
  else
    pass "database URL was discovered in .env"
  fi

  if [[ "$DB_URL" == *"db."*"supabase.co"* ]]; then
    warn "database URL uses Supabase direct host; if validation fails from an IPv4-only environment, switch to the Supabase session/transaction pooler URL"
  fi
else
  fail "no database URL was found in DATABASE_URL, SUPABASE_DB_URL, POSTGRES_URL, .env.local, or .env"
fi

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  pass ".env.local exists"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  pass ".env exists"
elif [[ -f "$ROOT_DIR/.env.local.example" ]]; then
  fail "only .env.local.example exists; no checked-in local runtime env file is available"
else
  fail "no local env file is present"
fi

if [[ -f "$ROOT_DIR/supabase/migrations/20260331000000_create_core_football_schema.sql" ]]; then
  pass "core football migration file is present"
else
  fail "core football migration file is missing"
fi

if [[ -f "$ROOT_DIR/scripts/validate-core-football-schema.sh" ]]; then
  pass "schema validate wrapper script is present"
else
  fail "schema validate wrapper script is missing"
fi

if [[ "$FAILURES" -gt 0 ]]; then
  printf '\nSchema doctor found %s blocking prerequisite(s).\n' "$FAILURES" >&2
  exit 1
fi

printf '\nSchema doctor found no blocking prerequisites.\n'
