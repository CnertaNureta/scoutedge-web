#!/bin/bash
# Daily data fetch + site rebuild cron job
# Fetches from TheSportsDB (free, no key) + API-Football (free tier, 100/day)
# Then rebuilds the static site and restarts the server.
#
# Crontab: 0 6 * * * /Users/clawstack/scoutedge-web/scripts/daily-data-fetch.sh >> /Users/clawstack/scoutedge-web/logs/daily-fetch.log 2>&1

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/clawstack/scoutedge-web
PROJECT_ROOT="$(pwd)"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

load_env_defaults() {
  local env_file="$1"

  if [ ! -f "$env_file" ]; then
    return 0
  fi

  echo "[$(date)] Loading env defaults from $env_file"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*)
        continue
        ;;
    esac

    local key="${line%%=*}"
    local value="${line#*=}"

    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    if [[ "$key" == export\ * ]]; then
      key="${key#export }"
      key="${key#"${key%%[![:space:]]*}"}"
    fi

    if [ -z "$key" ] || [ -n "${!key+x}" ]; then
      continue
    fi

    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$value" == \"* ]]; then
      value="${value#\"}"
      value="${value%%\"*}"
    elif [[ "$value" == \'* ]]; then
      value="${value#\'}"
      value="${value%%\'*}"
    else
      value="$(printf '%s' "$value" | sed -E 's/[[:space:]]+#.*$//')"
      value="${value%"${value##*[![:space:]]}"}"
    fi

    export "$key=$value"
  done < "$env_file"
}

load_env_defaults "$PROJECT_ROOT/.env.local"
load_env_defaults "$PROJECT_ROOT/.env"

echo "=================================================="
echo "[$(date)] Starting daily data fetch..."
echo "=================================================="

# 1. Fetch from TheSportsDB (free, no auth)
echo "[$(date)] Phase 1: TheSportsDB (free)..."
node scripts/fetch-live-data.mjs 2>&1 || echo "WARN: TheSportsDB fetch failed, using cached data"

# 2. Fetch from API-Football (incremental, 100 calls/day)
if [ -n "$API_FOOTBALL_KEY" ]; then
  if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "[$(date)] Phase 2: API-Football fetch + normalize + upsert..."
    npm run ingest:api-football:free-tier 2>&1 || echo "WARN: API-Football ingest failed, using cached data"
  else
    missing_supabase_envs=()
    [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && missing_supabase_envs+=("NEXT_PUBLIC_SUPABASE_URL")
    [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && missing_supabase_envs+=("SUPABASE_SERVICE_ROLE_KEY")

    echo "[$(date)] Phase 2: API-Football fetch + normalize only — missing ${missing_supabase_envs[*]}"
    npm run ingest:api-football:free-tier -- --phase fetch,normalize 2>&1 || echo "WARN: API-Football fetch/normalize failed, using cached data"
  fi
else
  echo "[$(date)] Phase 2: SKIPPED — API_FOOTBALL_KEY not set"
fi

# 3. Precompute triple-layer predictions (Python — scoutedge_intelligence)
# Skipped if the venv or DB is unavailable; failure does not block the site rebuild.
echo "[$(date)] Phase 3a: Precomputing triple-layer predictions..."
SI_DIR="$PROJECT_ROOT/scoutedge_intelligence"
SI_PY="$SI_DIR/.venv/bin/python"
PRECOMPUTE_TIMEOUT_SECONDS="${PRECOMPUTE_TIMEOUT_SECONDS:-900}"
PRECOMPUTE_TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
if [ -x "$SI_PY" ] && [ -n "$DATABASE_URL" ]; then
  if [ -n "$PRECOMPUTE_TIMEOUT_BIN" ]; then
    (cd "$SI_DIR" && "$PRECOMPUTE_TIMEOUT_BIN" "$PRECOMPUTE_TIMEOUT_SECONDS" "$SI_PY" -m scoutedge_intelligence.scripts.precompute_predictions \
      --horizon-hours 168 --limit 64 --concurrency 3 2>&1) \
      || echo "WARN: precompute_predictions failed or timed out, frontend will use cached predictions"
  else
    (cd "$SI_DIR" && "$SI_PY" -c 'import subprocess, sys; timeout = int(sys.argv[1]); cmd = sys.argv[2:];
try:
    completed = subprocess.run(cmd, timeout=timeout)
except subprocess.TimeoutExpired:
    sys.exit(124)
sys.exit(completed.returncode)' "$PRECOMPUTE_TIMEOUT_SECONDS" "$SI_PY" -m scoutedge_intelligence.scripts.precompute_predictions \
      --horizon-hours 168 --limit 64 --concurrency 3 2>&1) \
      || echo "WARN: precompute_predictions failed or timed out, frontend will use cached predictions"
  fi
else
  if [ ! -x "$SI_PY" ]; then
    echo "[$(date)] Phase 3a: SKIPPED — scoutedge_intelligence venv missing ($SI_PY)"
  else
    echo "[$(date)] Phase 3a: SKIPPED — DATABASE_URL not set"
  fi
fi

# 3b. Rebuild static site (also fetches fresh RSS news)
echo "[$(date)] Phase 3b: Building site..."
npm run build 2>&1

# 4. Restart static server
echo "[$(date)] Phase 4: Restarting server..."
pkill -f "serve out" 2>/dev/null || true
sleep 1
nohup npx serve out -p 3847 &>/dev/null &

echo "[$(date)] Daily fetch complete. Server restarted on port 3847."
echo "=================================================="
