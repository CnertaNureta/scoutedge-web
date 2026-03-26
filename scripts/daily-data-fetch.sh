#!/bin/bash
# Daily data fetch + site rebuild cron job
# Fetches from TheSportsDB (free, no key) + API-Football (free tier, 100/day)
# Then rebuilds the static site and restarts the server.
#
# Crontab: 0 6 * * * /Users/clawstack/scoutedge-web/scripts/daily-data-fetch.sh >> /Users/clawstack/scoutedge-web/logs/daily-fetch.log 2>&1

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/clawstack/scoutedge-web

# Create logs directory
mkdir -p logs

echo "=================================================="
echo "[$(date)] Starting daily data fetch..."
echo "=================================================="

# 1. Fetch from TheSportsDB (free, no auth)
echo "[$(date)] Phase 1: TheSportsDB (free)..."
node scripts/fetch-live-data.mjs 2>&1 || echo "WARN: TheSportsDB fetch failed, using cached data"

# 2. Fetch from API-Football (incremental, 100 calls/day)
if [ -n "$API_FOOTBALL_KEY" ]; then
  echo "[$(date)] Phase 2: API-Football (incremental)..."
  node scripts/fetch-api-football.mjs 2>&1 || echo "WARN: API-Football fetch failed, using cached data"
else
  echo "[$(date)] Phase 2: SKIPPED — API_FOOTBALL_KEY not set"
fi

# 3. Rebuild static site (also fetches fresh RSS news)
echo "[$(date)] Phase 3: Building site..."
npm run build 2>&1

# 4. Restart static server
echo "[$(date)] Phase 4: Restarting server..."
pkill -f "serve out" 2>/dev/null || true
sleep 1
nohup npx serve out -p 3847 &>/dev/null &

echo "[$(date)] Daily fetch complete. Server restarted on port 3847."
echo "=================================================="
