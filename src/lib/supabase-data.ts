/**
 * API-Football Data Layer — reads real data from the local JSON cache
 * (`src/data/api-football-cache.json`) produced by the ingestion pipeline.
 *
 * Returns enrichments to merge with static team/player data.
 * When no cached data exists for a team/player, returns null so the
 * caller falls back to static mock data.
 */

import { TEAMS } from '@/data/teams-meta'
import type { Team } from './types'
import cacheData from '@/data/api-football-cache.json'

// ─── Types for the cache JSON structure ─────────────────────────

interface CachedVenue {
  id: number
  name: string
  address: string | null
  city: string
  capacity: number
  surface: string
  image: string
}

interface CachedTeam {
  id: number
  name: string
  logo: string
  country: string
  founded: number
  venue: CachedVenue
}

interface ApiFootballCache {
  fetchedAt: string
  source: string
  teams: Record<string, CachedTeam>
  squads: Record<string, unknown>
  playerStats: Record<string, unknown>
}

const cache = cacheData as unknown as ApiFootballCache

// ─── Name→Slug mapping ──────────────────────────────────────────

const teamNameToSlug = new Map<string, string>(
  TEAMS.map((t) => [t.name.toLowerCase(), t.slug])
)

function resolveTeamSlug(name: string): string | undefined {
  return teamNameToSlug.get(name.toLowerCase())
}

// ─── Team Enrichments ───────────────────────────────────────────

export type TeamEnrichment = Partial<Team> & {
  logoUrl?: string
  venueImage?: string
  venueName?: string
  venueCity?: string
  venueCapacity?: number
  founded?: number
}

let _teamEnrichments: Map<string, TeamEnrichment> | null = null

function buildTeamEnrichments(): Map<string, TeamEnrichment> | null {
  if (!cache.teams || Object.keys(cache.teams).length === 0) return null

  const result = new Map<string, TeamEnrichment>()

  for (const [cacheKey, team] of Object.entries(cache.teams)) {
    // Match cache key (e.g. "South Africa") to frontend slug (e.g. "south-africa")
    const slug = resolveTeamSlug(cacheKey)
    if (!slug) continue

    const enrichment: TeamEnrichment = {}

    if (team.logo) enrichment.logoUrl = team.logo
    if (team.founded) enrichment.founded = team.founded

    if (team.venue) {
      if (team.venue.name) enrichment.venueName = team.venue.name
      if (team.venue.city) enrichment.venueCity = team.venue.city
      if (team.venue.capacity) enrichment.venueCapacity = team.venue.capacity
      if (team.venue.image) enrichment.venueImage = team.venue.image
    }

    if (Object.keys(enrichment).length > 0) {
      result.set(slug, enrichment)
    }
  }

  return result.size > 0 ? result : null
}

/**
 * Get team enrichments from the API-Football cache.
 * Returns a Map of slug → TeamEnrichment, or null if no cached data.
 * Computed once and cached in memory.
 */
export function getTeamEnrichments(): Map<string, TeamEnrichment> | null {
  if (_teamEnrichments === undefined || _teamEnrichments === null) {
    _teamEnrichments = buildTeamEnrichments()
  }
  return _teamEnrichments
}

/**
 * Player enrichments — not yet available (pipeline still collecting squads).
 * Returns null; callers fall back to static player data.
 */
export function getPlayerEnrichments(): null {
  // squads and playerStats are empty in the cache for now.
  // When the pipeline populates them, this function will be
  // updated to parse and return player enrichments.
  return null
}
