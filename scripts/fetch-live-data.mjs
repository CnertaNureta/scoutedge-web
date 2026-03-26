#!/usr/bin/env node
/**
 * Fetches real World Cup 2026 data from TheSportsDB API
 * and writes it to src/data/live-cache.json for use at build time.
 *
 * Run: node scripts/fetch-live-data.mjs
 * Also called by the daily cron job before each build.
 */

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const WC_LEAGUE_ID = '4429'
const WC_SEASON = '2026'
const WC_2022_SEASON = '2022'

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../src/data/live-cache.json')

async function fetchJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn(`  WARN: ${url} → ${e.message}`)
    return {}
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log('[live-data] Fetching real World Cup data from TheSportsDB...\n')
  const cache = {
    fetchedAt: new Date().toISOString(),
    source: 'TheSportsDB (thesportsdb.com)',
    apiVersion: 'v1/json/3',
    wcFixtures2026: [],
    wcFixtures2022: [],
    teamDetails: {},
  }

  // 1. Fetch 2026 WC fixtures
  console.log('[1/3] Fetching 2026 World Cup fixtures...')
  const wc2026 = await fetchJSON(
    `${API_BASE}/eventsseason.php?id=${WC_LEAGUE_ID}&s=${WC_SEASON}`
  )
  const events2026 = wc2026.events || []
  cache.wcFixtures2026 = events2026.map((e) => ({
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    date: e.dateEvent,
    time: e.strTime,
    venue: e.strVenue,
    round: e.intRound,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
    thumb: e.strThumb,
  }))
  console.log(`  → ${cache.wcFixtures2026.length} fixtures found`)
  await sleep(1000)

  // 2. Fetch 2022 WC results (for historical reference — real scores)
  console.log('[2/3] Fetching 2022 World Cup results (historical data)...')
  const wc2022 = await fetchJSON(
    `${API_BASE}/eventsseason.php?id=${WC_LEAGUE_ID}&s=${WC_2022_SEASON}`
  )
  const events2022 = wc2022.events || []
  cache.wcFixtures2022 = events2022.map((e) => ({
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    date: e.dateEvent,
    venue: e.strVenue,
    round: e.intRound,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
  }))
  console.log(`  → ${cache.wcFixtures2022.length} results found`)
  await sleep(1000)

  // 3. Fetch team details for key national teams
  console.log('[3/3] Fetching national team details...')
  const keyTeams = [
    'Argentina',
    'Brazil',
    'France',
    'Germany',
    'England',
    'Spain',
    'USA',
    'Mexico',
    'Japan',
    'South Korea',
    'Netherlands',
    'Belgium',
    'Uruguay',
    'Italy',
    'Portugal',
  ]

  for (const name of keyTeams) {
    const data = await fetchJSON(
      `${API_BASE}/searchteams.php?t=${encodeURIComponent(name)}`
    )
    const teams = data.teams || []
    const match = teams.find(
      (t) => t.strSport === 'Soccer' && (t.strLeague || '').includes('World Cup')
    )
    if (match) {
      cache.teamDetails[name] = {
        id: match.idTeam,
        name: match.strTeam,
        badge: match.strBadge,
        jersey: match.strJersey,
        stadium: match.strStadium,
        formedYear: match.intFormedYear,
        description: (match.strDescriptionEN || '').slice(0, 500),
        fanart: match.strFanart1 || match.strFanart2,
      }
      console.log(`  ✓ ${name} (ID: ${match.idTeam})`)
    } else {
      console.log(`  ✗ ${name} — not found in WC context`)
    }
    await sleep(500) // Rate limit respect
  }

  // Write cache
  writeFileSync(OUTPUT, JSON.stringify(cache, null, 2))
  console.log(`\n[live-data] Cache written to ${OUTPUT}`)
  console.log(
    `  2026 fixtures: ${cache.wcFixtures2026.length}`,
    `| 2022 results: ${cache.wcFixtures2022.length}`,
    `| Teams: ${Object.keys(cache.teamDetails).length}`
  )
}

main().catch((e) => {
  console.error('[live-data] Fatal:', e)
  process.exit(1)
})
