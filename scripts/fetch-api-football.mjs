#!/usr/bin/env node
/**
 * Incremental API-Football data fetcher (free tier: 100 calls/day).
 *
 * Tracks progress in src/data/api-football-state.json so it can resume
 * across days. Designed to complete full data scrape in ~9 days.
 *
 * API docs: https://www.api-football.com/documentation-v3
 * Base URL: https://v3.football.api-sports.io/
 * Auth: x-apisports-key header
 *
 * Run: API_FOOTBALL_KEY=xxx node scripts/fetch-api-football.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')
const STATE_FILE = resolve(DATA_DIR, 'api-football-state.json')
const OUTPUT_FILE = resolve(DATA_DIR, 'api-football-cache.json')

const API_KEY = process.env.API_FOOTBALL_KEY
if (!API_KEY) {
  console.error('ERROR: API_FOOTBALL_KEY env var is required.')
  console.error('Get a free key at https://www.api-football.com/')
  process.exit(1)
}

const API_BASE = 'https://v3.football.api-sports.io'
const DAILY_LIMIT = 95 // Stay under 100 to be safe
const WC_LEAGUE_ID = 1 // FIFA World Cup
const WC_SEASON = 2026
const RATE_DELAY_MS = 1200 // ~50 req/min max on free tier

// The 48 World Cup 2026 teams — API-Football team IDs
// We'll discover these dynamically from the fixtures/standings endpoint
const PRIORITY_TEAMS = [
  'Argentina', 'Brazil', 'France', 'Germany', 'England', 'Spain',
  'USA', 'Mexico', 'Netherlands', 'Belgium', 'Portugal', 'Uruguay',
  'Japan', 'South Korea', 'Italy', 'Morocco', 'Senegal', 'Saudi Arabia',
  'Qatar', 'Switzerland', 'Ecuador', 'Iran', 'Algeria', 'Austria',
  'Jordan', 'Haiti', 'Scotland', 'South Africa', 'Ivory Coast',
  'Curacao', 'New Zealand', 'Cape Verde', 'Egypt', 'Australia',
  'Croatia', 'Denmark', 'Poland', 'Cameroon', 'Canada', 'Costa Rica',
  'Ghana', 'Serbia', 'Tunisia', 'Wales', 'Colombia', 'Nigeria',
  'Paraguay', 'Peru'
]

// ── Helpers ──

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY }
  })

  if (!res.ok) {
    console.warn(`  WARN: ${res.status} from ${endpoint}`)
    return null
  }

  const json = await res.json()

  // Log remaining quota
  const remaining = res.headers.get('x-ratelimit-requests-remaining')
  if (remaining != null) {
    console.log(`  [quota remaining: ${remaining}]`)
  }

  return json.response || null
}

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  }
  return {
    startedAt: new Date().toISOString(),
    lastRunAt: null,
    callsToday: 0,
    lastRunDate: null, // YYYY-MM-DD
    completedPhases: [],
    teamIds: {}, // name -> API-Football team ID
    phase: 'init', // init, teams, squads, players, fixtures, injuries, transfers, odds, h2h, done
    playersFetchedCount: 0,
    teamsProcessed: [], // for incremental team-level fetches
  }
}

function saveState(state) {
  state.lastRunAt = new Date().toISOString()
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function loadCache() {
  if (existsSync(OUTPUT_FILE)) {
    return JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
  }
  return {
    fetchedAt: null,
    source: 'API-Football (api-football.com)',
    teams: {},
    squads: {},
    playerStats: {},
    fixtures: [],
    injuries: {},
    transfers: {},
    odds: {},
    h2h: {},
  }
}

function saveCache(cache) {
  cache.fetchedAt = new Date().toISOString()
  writeFileSync(OUTPUT_FILE, JSON.stringify(cache, null, 2))
  console.log(`  Cache saved to ${OUTPUT_FILE}`)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Fetch Phases ──

async function phaseInit(state, cache) {
  console.log('\n=== Phase: INIT — Fetching WC 2026 fixtures to discover team IDs ===')

  const fixtures = await apiFetch('fixtures', { league: WC_LEAGUE_ID, season: WC_SEASON })
  state.callsToday++
  await sleep(RATE_DELAY_MS)

  if (fixtures && fixtures.length > 0) {
    cache.fixtures = fixtures.map(f => ({
      id: f.fixture.id,
      date: f.fixture.date,
      venue: f.fixture.venue?.name || '',
      city: f.fixture.venue?.city || '',
      status: f.fixture.status?.short || 'NS',
      homeTeam: f.teams.home.name,
      homeTeamId: f.teams.home.id,
      homeScore: f.goals.home,
      awayTeam: f.teams.away.name,
      awayTeamId: f.teams.away.id,
      awayScore: f.goals.away,
      round: f.league.round || '',
    }))

    // Extract team IDs from fixtures
    for (const f of fixtures) {
      state.teamIds[f.teams.home.name] = f.teams.home.id
      state.teamIds[f.teams.away.name] = f.teams.away.id
    }
    console.log(`  Found ${fixtures.length} fixtures, ${Object.keys(state.teamIds).length} teams`)
  } else {
    console.log('  No fixtures found yet, trying teams endpoint...')
    // Fallback: search teams by name
    for (const name of PRIORITY_TEAMS.slice(0, 10)) {
      if (state.callsToday >= DAILY_LIMIT) break
      const results = await apiFetch('teams', { search: name })
      state.callsToday++
      await sleep(RATE_DELAY_MS)
      if (results && results.length > 0) {
        // Find the national team (not club)
        const national = results.find(r =>
          r.team.national === true ||
          r.team.name.toLowerCase().includes(name.toLowerCase())
        )
        if (national) {
          state.teamIds[name] = national.team.id
          cache.teams[name] = {
            id: national.team.id,
            name: national.team.name,
            logo: national.team.logo,
            country: national.team.country,
            founded: national.team.founded,
            venue: national.venue,
          }
        }
      }
    }
  }

  state.completedPhases.push('init')
  state.phase = 'teams'
}

async function phaseTeams(state, cache) {
  console.log('\n=== Phase: TEAMS — Fetching team details ===')

  const teamNames = Object.keys(state.teamIds)
  const remaining = teamNames.filter(n => !cache.teams[n])

  for (const name of remaining) {
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached (${state.callsToday}/${DAILY_LIMIT}). Resuming tomorrow.`)
      return
    }

    const teamId = state.teamIds[name]
    const results = await apiFetch('teams', { id: teamId })
    state.callsToday++
    await sleep(RATE_DELAY_MS)

    if (results && results.length > 0) {
      const t = results[0]
      cache.teams[name] = {
        id: t.team.id,
        name: t.team.name,
        logo: t.team.logo,
        country: t.team.country,
        founded: t.team.founded,
        venue: t.venue,
      }
      console.log(`  ✓ ${name} (ID: ${teamId})`)
    }
  }

  if (Object.keys(cache.teams).length >= Object.keys(state.teamIds).length) {
    state.completedPhases.push('teams')
    state.phase = 'squads'
  }
}

async function phaseSquads(state, cache) {
  console.log('\n=== Phase: SQUADS — Fetching squad rosters ===')

  const teamNames = Object.keys(state.teamIds)
  const remaining = teamNames.filter(n => !cache.squads[n])

  for (const name of remaining) {
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached. Resuming tomorrow.`)
      return
    }

    const teamId = state.teamIds[name]
    const results = await apiFetch('players/squads', { team: teamId })
    state.callsToday++
    await sleep(RATE_DELAY_MS)

    if (results && results.length > 0) {
      cache.squads[name] = results[0].players.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        number: p.number,
        position: p.position,
        photo: p.photo,
      }))
      console.log(`  ✓ ${name}: ${cache.squads[name].length} players`)
    }
  }

  if (Object.keys(cache.squads).length >= Object.keys(state.teamIds).length) {
    state.completedPhases.push('squads')
    state.phase = 'players'
  }
}

async function phasePlayers(state, cache) {
  console.log('\n=== Phase: PLAYERS — Fetching key player statistics ===')

  const teamNames = Object.keys(state.teamIds)

  for (const name of teamNames) {
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached. Resuming tomorrow.`)
      return
    }

    if (state.teamsProcessed.includes(`players-${name}`)) continue

    const squad = cache.squads[name]
    if (!squad) continue

    // Fetch top 10 players per team
    const topPlayers = squad.slice(0, 10)
    const playerStats = []

    for (const player of topPlayers) {
      if (state.callsToday >= DAILY_LIMIT) {
        console.log(`  Daily limit reached mid-team. Resuming tomorrow.`)
        saveCache(cache)
        return
      }

      const results = await apiFetch('players', {
        id: player.id,
        season: 2024 // Most recent season with data
      })
      state.callsToday++
      state.playersFetchedCount++
      await sleep(RATE_DELAY_MS)

      if (results && results.length > 0) {
        const p = results[0]
        playerStats.push({
          id: p.player.id,
          name: p.player.name,
          firstname: p.player.firstname,
          lastname: p.player.lastname,
          age: p.player.age,
          nationality: p.player.nationality,
          height: p.player.height,
          weight: p.player.weight,
          photo: p.player.photo,
          statistics: (p.statistics || []).slice(0, 3).map(s => ({
            league: s.league?.name,
            team: s.team?.name,
            games: s.games,
            goals: s.goals,
            assists: s.goals?.assists,
            cards: s.cards,
            rating: s.games?.rating,
          })),
        })
      }
    }

    cache.playerStats[name] = playerStats
    state.teamsProcessed.push(`players-${name}`)
    console.log(`  ✓ ${name}: ${playerStats.length} player stats`)
  }

  const allDone = teamNames.every(n => state.teamsProcessed.includes(`players-${n}`))
  if (allDone) {
    state.completedPhases.push('players')
    state.phase = 'injuries'
  }
}

async function phaseInjuries(state, cache) {
  console.log('\n=== Phase: INJURIES — Fetching injury reports ===')

  const teamNames = Object.keys(state.teamIds)
  const remaining = teamNames.filter(n => !cache.injuries[n])

  for (const name of remaining) {
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached. Resuming tomorrow.`)
      return
    }

    const teamId = state.teamIds[name]
    const results = await apiFetch('injuries', {
      team: teamId,
      season: 2024
    })
    state.callsToday++
    await sleep(RATE_DELAY_MS)

    cache.injuries[name] = (results || []).slice(0, 10).map(i => ({
      player: i.player?.name,
      type: i.player?.type,
      reason: i.player?.reason,
      date: i.fixture?.date,
    }))
    console.log(`  ✓ ${name}: ${cache.injuries[name].length} injuries`)
  }

  if (Object.keys(cache.injuries).length >= teamNames.length) {
    state.completedPhases.push('injuries')
    state.phase = 'transfers'
  }
}

async function phaseTransfers(state, cache) {
  console.log('\n=== Phase: TRANSFERS — Fetching recent transfers ===')

  const teamNames = Object.keys(state.teamIds)
  const remaining = teamNames.filter(n => !cache.transfers[n])

  for (const name of remaining) {
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached. Resuming tomorrow.`)
      return
    }

    const teamId = state.teamIds[name]
    const results = await apiFetch('transfers', { team: teamId })
    state.callsToday++
    await sleep(RATE_DELAY_MS)

    // Get most recent transfers
    cache.transfers[name] = (results || []).slice(0, 10).map(t => ({
      player: t.player?.name,
      date: t.update,
      transfers: (t.transfers || []).slice(0, 3).map(tr => ({
        date: tr.date,
        type: tr.type,
        from: tr.teams?.out?.name,
        to: tr.teams?.in?.name,
      })),
    }))
    console.log(`  ✓ ${name}: ${cache.transfers[name].length} transfer records`)
  }

  if (Object.keys(cache.transfers).length >= teamNames.length) {
    state.completedPhases.push('transfers')
    state.phase = 'h2h'
  }
}

async function phaseH2H(state, cache) {
  console.log('\n=== Phase: H2H — Fetching head-to-head records ===')

  // Key matchups to fetch
  const matchups = [
    ['Argentina', 'Brazil'], ['Argentina', 'France'], ['Brazil', 'Germany'],
    ['England', 'Germany'], ['Spain', 'France'], ['Brazil', 'France'],
    ['Argentina', 'Germany'], ['Netherlands', 'Germany'], ['England', 'France'],
    ['Spain', 'Germany'], ['Brazil', 'Argentina'], ['Portugal', 'Spain'],
    ['USA', 'Mexico'], ['Japan', 'South Korea'], ['Uruguay', 'Brazil'],
    ['Italy', 'Germany'], ['Italy', 'France'], ['England', 'Argentina'],
    ['France', 'Germany'], ['Netherlands', 'Argentina'],
    ['Morocco', 'France'], ['Senegal', 'France'], ['Belgium', 'France'],
    ['England', 'USA'], ['Spain', 'Netherlands'], ['Brazil', 'Uruguay'],
    ['Argentina', 'Uruguay'], ['Germany', 'Netherlands'], ['Portugal', 'France'],
    ['England', 'Spain'],
  ]

  for (const [teamA, teamB] of matchups) {
    const key = `${teamA}-vs-${teamB}`
    if (cache.h2h[key]) continue
    if (state.callsToday >= DAILY_LIMIT) {
      console.log(`  Daily limit reached. Resuming tomorrow.`)
      return
    }

    const idA = state.teamIds[teamA]
    const idB = state.teamIds[teamB]
    if (!idA || !idB) continue

    const results = await apiFetch('fixtures/headtohead', { h2h: `${idA}-${idB}` })
    state.callsToday++
    await sleep(RATE_DELAY_MS)

    cache.h2h[key] = (results || []).slice(0, 10).map(f => ({
      date: f.fixture?.date,
      venue: f.fixture?.venue?.name,
      homeTeam: f.teams?.home?.name,
      awayTeam: f.teams?.away?.name,
      homeScore: f.goals?.home,
      awayScore: f.goals?.away,
      league: f.league?.name,
    }))
    console.log(`  ✓ ${key}: ${cache.h2h[key].length} past meetings`)
  }

  const allH2HDone = matchups.every(([a, b]) => {
    const key = `${a}-vs-${b}`
    return cache.h2h[key] || !state.teamIds[a] || !state.teamIds[b]
  })

  if (allH2HDone) {
    state.completedPhases.push('h2h')
    state.phase = 'done'
  }
}

// ── Main ──

async function main() {
  console.log('=== API-Football Incremental Fetcher ===')
  console.log(`Date: ${todayStr()}`)

  mkdirSync(DATA_DIR, { recursive: true })

  const state = loadState()
  const cache = loadCache()

  // Reset daily counter if new day
  if (state.lastRunDate !== todayStr()) {
    state.callsToday = 0
    state.lastRunDate = todayStr()
    console.log('New day — daily counter reset.')
  } else {
    console.log(`Resuming — ${state.callsToday} calls used today.`)
  }

  if (state.callsToday >= DAILY_LIMIT) {
    console.log(`Daily limit already reached (${state.callsToday}). Try again tomorrow.`)
    saveState(state)
    return
  }

  console.log(`Current phase: ${state.phase}`)
  console.log(`Completed phases: ${state.completedPhases.join(', ') || 'none'}`)
  console.log(`Teams discovered: ${Object.keys(state.teamIds).length}`)
  console.log(`Budget remaining today: ${DAILY_LIMIT - state.callsToday} calls`)

  try {
    // Run phases in order, each respecting the daily limit
    if (state.phase === 'init') {
      await phaseInit(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'teams' && state.callsToday < DAILY_LIMIT) {
      await phaseTeams(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'squads' && state.callsToday < DAILY_LIMIT) {
      await phaseSquads(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'players' && state.callsToday < DAILY_LIMIT) {
      await phasePlayers(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'injuries' && state.callsToday < DAILY_LIMIT) {
      await phaseInjuries(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'transfers' && state.callsToday < DAILY_LIMIT) {
      await phaseTransfers(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'h2h' && state.callsToday < DAILY_LIMIT) {
      await phaseH2H(state, cache)
      saveState(state)
      saveCache(cache)
    }

    if (state.phase === 'done') {
      console.log('\n🏁 ALL PHASES COMPLETE — Full dataset acquired!')
    }

  } catch (err) {
    console.error('Error during fetch:', err.message)
    saveState(state)
    saveCache(cache)
  }

  console.log(`\n=== Summary ===`)
  console.log(`Calls used today: ${state.callsToday}/${DAILY_LIMIT}`)
  console.log(`Current phase: ${state.phase}`)
  console.log(`Players fetched total: ${state.playersFetchedCount}`)
  console.log(`Teams with data: ${Object.keys(cache.teams).length}`)
  console.log(`Squads fetched: ${Object.keys(cache.squads).length}`)
  console.log(`H2H records: ${Object.keys(cache.h2h).length}`)
}

main().catch(console.error)
