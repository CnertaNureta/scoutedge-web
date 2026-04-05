import { getCanonicalTeamName, resolveTeamSlug, teamSlugToCommonName } from '@/lib/team-aliases'

/**
 * Live Data Service — fetches real World Cup 2026 data from TheSportsDB API.
 *
 * TheSportsDB (https://www.thesportsdb.com/) provides free access to:
 * - Real match fixtures with dates, venues, and results
 * - Team information and badges
 * - Past match results
 *
 * API: https://www.thesportsdb.com/api/v1/json/3/ (free tier, key=3)
 * Rate limit: ~15 requests/minute on free tier
 * World Cup league ID: 4429
 */

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const WC_LEAGUE_ID = '4429'
const WC_SEASON = '2026'

export interface LiveMatch {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  venue: string
  round: string
  homeScore: number | null
  awayScore: number | null
  status: 'scheduled' | 'completed' | 'live'
}

export interface LiveTeamResult {
  date: string
  event: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  league: string
}

async function fetchJSON(url: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    return await res.json()
  } catch {
    console.warn(`[live-data] Failed to fetch ${url}`)
    return {}
  }
}

/**
 * Fetch real World Cup 2026 fixtures from TheSportsDB.
 * These are actual confirmed matches with real dates and venues.
 */
export async function fetchLiveWCFixtures(): Promise<LiveMatch[]> {
  const data = await fetchJSON(
    `${API_BASE}/eventsseason.php?id=${WC_LEAGUE_ID}&s=${WC_SEASON}`
  )
  const events = (data.events as Record<string, string>[]) || []

  return events.map((e) => ({
    id: e.idEvent || '',
    homeTeam: e.strHomeTeam || '',
    awayTeam: e.strAwayTeam || '',
    date: e.dateEvent || '',
    time: e.strTime || '',
    venue: e.strVenue || '',
    round: `Round ${e.intRound || '?'}`,
    homeScore: e.intHomeScore != null ? parseInt(e.intHomeScore) : null,
    awayScore: e.intAwayScore != null ? parseInt(e.intAwayScore) : null,
    status: e.intHomeScore != null ? 'completed' : 'scheduled',
  }))
}

/**
 * Search for a national team by name and get their TheSportsDB ID.
 */
export async function searchTeam(name: string): Promise<string | null> {
  const data = await fetchJSON(
    `${API_BASE}/searchteams.php?t=${encodeURIComponent(name)}`
  )
  const teams = (data.teams as Record<string, string>[]) || []
  const match = teams.find(
    (t) => t.strSport === 'Soccer' && t.strLeague?.includes('World Cup')
  )
  return match?.idTeam || null
}

/**
 * Fetch recent match results for a team by their TheSportsDB ID.
 */
export async function fetchTeamRecentResults(
  teamId: string
): Promise<LiveTeamResult[]> {
  const data = await fetchJSON(`${API_BASE}/eventslast.php?id=${teamId}`)
  const results = (data.results as Record<string, string>[]) || []

  return results.map((e) => ({
    date: e.dateEvent || '',
    event: e.strEvent || '',
    homeTeam: e.strHomeTeam || '',
    awayTeam: e.strAwayTeam || '',
    homeScore: parseInt(e.intHomeScore || '0'),
    awayScore: parseInt(e.intAwayScore || '0'),
    league: e.strLeague || '',
  }))
}

/** Cached team details from build-time fetch */
import liveCache from '@/data/live-cache.json'

export interface LiveTeamDetails {
  id: string
  name: string
  badge: string
  stadium: string
  formedYear: string
  description: string
  fanart: string | null
}

/** Get real team details from the cached live data */
export function getLiveTeamDetails(teamName: string): LiveTeamDetails | null {
  const teamDetails = liveCache.teamDetails as Record<string, LiveTeamDetails>
  const slug = resolveTeamSlug(teamName)
  const candidates = slug
    ? [teamName, teamSlugToCommonName(slug), getCanonicalTeamName(slug)]
    : [teamName]

  for (const candidate of candidates) {
    const details = teamDetails[candidate]
    if (details) return details
  }

  return null
}

/** Convert our team slug to display name for API matching */
export function slugToApiName(slug: string): string {
  return teamSlugToCommonName(slug)
}
