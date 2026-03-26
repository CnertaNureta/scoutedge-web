#!/bin/bash
# Refresh Daily Briefing news by rebuilding the static site
# Fetches latest World Cup 2026 news from Google News RSS + BBC Sport at build time

set -e

export PATH="/opt/homebrew/bin:$PATH"

cd /Users/clawstack/scoutedge-web

echo "[$(date)] Starting news refresh build..."

# Fetch real World Cup data from TheSportsDB API
echo "[$(date)] Fetching live data from TheSportsDB..."
node scripts/fetch-live-data.mjs 2>&1 || echo "WARN: Live data fetch failed, using cached data"

# Build (fetches fresh RSS at build time)
npm run build 2>&1

# Restart static server
pkill -f "serve out" 2>/dev/null || true
sleep 1
nohup npx serve out -p 3847 &>/dev/null &

echo "[$(date)] News refresh complete. Server restarted on port 3847."
