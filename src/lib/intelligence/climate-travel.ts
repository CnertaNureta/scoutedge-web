import type { Team, Player, MatchFixture, Venue } from '@/lib/types'

export type ClimateBand =
  | 'hot-humid'
  | 'hot-dry'
  | 'temperate'
  | 'cold'
  | 'altitude'

export interface FixtureClimate {
  fixtureId: string
  venueSlug: string
  venueName: string
  climateBand: ClimateBand
  /** Travel km from the previous fixture's venue (Match Day 1 = 0). */
  travelKm: number
  /** 0..100 — % of the squad whose home club climate matches this venue. */
  squadHomeMatchPct: number
}

export interface ClimateTravelBreakdown {
  fixtures: FixtureClimate[]
  totalTravelKm: number
  worstFixtureId: string | null
  signalCount: number
  sourceCount: number
}

const ALTITUDE_THRESHOLD_M = 1500
const HOT_TEMP_C = 28
const COLD_TEMP_C = 18
const HUMIDITY_HUMID = 60
const EARTH_RADIUS_KM = 6371

/**
 * Classify a venue by a deterministic blend of altitude × temperature × humidity.
 * Reads from existing Venue.climate + altitudeMeters — no fabricated band data on disk.
 */
export function deriveClimateBand(venue: Venue): ClimateBand {
  if (venue.altitudeMeters >= ALTITUDE_THRESHOLD_M) {
    return 'altitude'
  }
  const peakC = Math.max(venue.climate.juneAvgHighC, venue.climate.julyAvgHighC)
  const humid = venue.climate.humidityPercent
  if (peakC >= HOT_TEMP_C && humid >= HUMIDITY_HUMID) return 'hot-humid'
  if (peakC >= HOT_TEMP_C) return 'hot-dry'
  if (peakC < COLD_TEMP_C) return 'cold'
  return 'temperate'
}

/**
 * Per-player "home climate" inferred from club name keywords. Derived at
 * render time — pending a real club→city→climate dataset, the keyword map
 * gives a deterministic, testable signal seeded by data we already have.
 */
export function derivePlayerHomeBand(player: Player): ClimateBand {
  const club = player.club.toLowerCase()

  // Altitude clubs
  const altitudeKeywords = ['nacional', 'tijuana', 'pumas', 'león', 'leon', 'pachuca', 'la paz', 'quito', 'bogotá', 'bogota']
  if (altitudeKeywords.some((k) => club.includes(k))) return 'altitude'

  // Hot-humid clubs (gulf, latin coast, southeast asia, florida)
  const hotHumidKeywords = ['al-', 'al ', 'riyadh', 'jeddah', 'dubai', 'doha', 'flamengo', 'palmeiras', 'corinthians', 'são paulo', 'sao paulo', 'santos', 'rio', 'inter miami', 'miami', 'jakarta', 'bangkok', 'kuala lumpur']
  if (hotHumidKeywords.some((k) => club.includes(k))) return 'hot-humid'

  // Hot-dry clubs (north african, southwest US, central spain summers)
  const hotDryKeywords = ['cairo', 'casablanca', 'tunis', 'sevilla', 'real madrid', 'atlético madrid', 'atletico madrid', 'phoenix', 'las vegas', 'almería', 'almeria']
  if (hotDryKeywords.some((k) => club.includes(k))) return 'hot-dry'

  // Cold clubs (nordic, russian, canadian, scottish)
  const coldKeywords = ['oslo', 'stockholm', 'copenhagen', 'fc københavn', 'fc kobenhavn', 'malmö', 'malmo', 'rosenborg', 'molde', 'helsinki', 'moscow', 'spartak', 'cska', 'zenit', 'toronto', 'montreal', 'celtic', 'rangers', 'reykjavik']
  if (coldKeywords.some((k) => club.includes(k))) return 'cold'

  // Default — most European/Asian top-flight clubs sit in temperate band
  return 'temperate'
}

/** Haversine distance in km between two lat/lng coordinates. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)))
}

function findVenueForFixture(
  fixture: MatchFixture,
  venues: ReadonlyArray<Venue>,
): Venue | undefined {
  return (
    venues.find((v) => v.name === fixture.venue) ||
    venues.find((v) => v.city === fixture.city) ||
    venues.find((v) => v.metro === fixture.city)
  )
}

function fixtureId(team: Team, fixture: MatchFixture): string {
  return `${team.slug}__${fixture.round.replace(/\s+/g, '-').toLowerCase()}__${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}`
}

/**
 * Compute squad-home-match % for a single venue band.
 * Adjacency awarded for the same band; partial credit for soft-adjacent pairs
 * (temperate ↔ hot-dry, temperate ↔ cold) so a cold-country squad in a temperate
 * venue scores higher than that same squad in hot-humid heat.
 */
function squadFitForBand(players: ReadonlyArray<Player>, band: ClimateBand): number {
  if (players.length === 0) return 0
  let weighted = 0
  for (const p of players) {
    const home = derivePlayerHomeBand(p)
    weighted += bandAffinity(home, band)
  }
  const pct = (weighted / players.length) * 100
  return Math.round(Math.max(0, Math.min(100, pct)))
}

function bandAffinity(a: ClimateBand, b: ClimateBand): number {
  if (a === b) return 1
  const softPairs: Record<ClimateBand, ClimateBand[]> = {
    temperate: ['hot-dry', 'cold'],
    'hot-dry': ['temperate', 'hot-humid'],
    'hot-humid': ['hot-dry'],
    cold: ['temperate'],
    altitude: [],
  }
  if (softPairs[a]?.includes(b)) return 0.5
  return 0
}

export function computeClimateTravel(
  team: Team,
  fixtures: ReadonlyArray<MatchFixture>,
  venues: ReadonlyArray<Venue>,
  players: ReadonlyArray<Player>,
): ClimateTravelBreakdown {
  if (fixtures.length === 0 || venues.length === 0) {
    return {
      fixtures: [],
      totalTravelKm: 0,
      worstFixtureId: null,
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const ordered = [...fixtures].sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
  )

  const rows: FixtureClimate[] = []
  let prevCoords: { lat: number; lng: number } | null = null

  for (const fixture of ordered) {
    const venue = findVenueForFixture(fixture, venues)
    if (!venue) continue
    const band = deriveClimateBand(venue)
    const travelKm = prevCoords ? haversineKm(prevCoords, venue.coordinates) : 0
    rows.push({
      fixtureId: fixtureId(team, fixture),
      venueSlug: venue.id,
      venueName: venue.name,
      climateBand: band,
      travelKm,
      squadHomeMatchPct: squadFitForBand(players, band),
    })
    prevCoords = venue.coordinates
  }

  const totalTravelKm = rows.reduce((sum, r) => sum + r.travelKm, 0)

  let worstFixtureId: string | null = null
  let worstPct = 101
  for (const row of rows) {
    if (row.squadHomeMatchPct < worstPct) {
      worstPct = row.squadHomeMatchPct
      worstFixtureId = row.fixtureId
    }
  }

  const venueSet = new Set(rows.map((r) => r.venueSlug))

  return {
    fixtures: rows,
    totalTravelKm,
    worstFixtureId,
    signalCount: rows.length,
    sourceCount: venueSet.size,
  }
}
