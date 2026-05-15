import { describe, it, expect } from 'vitest'
import {
  computeClimateTravel,
  deriveClimateBand,
  derivePlayerHomeBand,
  haversineKm,
} from '../climate-travel'
import type { Team, Player, MatchFixture, Venue } from '@/lib/types'

function makeTeam(slug: string, overrides: Partial<Team> = {}): Team {
  return {
    slug,
    name: slug,
    flag: '🏳️',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 1,
    coachName: 'Coach',
    chemistry: 70,
    familiarity: 70,
    stability: 70,
    morale: 70,
    archetypeMatch: '',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

function makePlayer(slug: string, club: string): Player {
  return {
    slug,
    name: slug,
    teamSlug: 'testland',
    position: 'MID',
    number: 10,
    age: 25,
    club,
    caps: 10,
    goals: 0,
    assists: 0,
    rating: 75,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 0,
    sentimentLabel: 'neutral',
    seoArticle: '',
  }
}

function makeVenue(
  id: string,
  overrides: Partial<Venue> = {},
  climateOverrides: Partial<Venue['climate']> = {},
): Venue {
  return {
    id,
    name: id,
    city: 'City',
    metro: 'Metro',
    state: 'State',
    country: 'Country',
    countryCode: 'XX',
    capacity: 50000,
    yearOpened: 2000,
    surface: 'Grass',
    roofType: 'Open',
    coordinates: { lat: 0, lng: 0 },
    altitudeMeters: 100,
    timezone: 'UTC',
    utcOffset: 0,
    climate: {
      juneAvgHighC: 22,
      juneAvgLowC: 14,
      julyAvgHighC: 24,
      julyAvgLowC: 16,
      humidityPercent: 55,
      rainyDaysPerMonth: 6,
      description: '',
      ...climateOverrides,
    },
    hostingRounds: [],
    notes: '',
    ...overrides,
  }
}

function makeFixture(
  venueName: string,
  city: string,
  kickoff: string,
  round = 'Match Day 1',
): MatchFixture {
  return {
    homeTeamSlug: 'testland',
    awayTeamSlug: 'rivals',
    round,
    group: 'A',
    venue: venueName,
    city,
    kickoffUtc: kickoff,
    homeWinProb: 0.4,
    drawProb: 0.3,
    awayWinProb: 0.3,
  }
}

describe('deriveClimateBand', () => {
  it('classifies high-altitude venues regardless of temperature', () => {
    const v = makeVenue('azteca', { altitudeMeters: 2200 })
    expect(deriveClimateBand(v)).toBe('altitude')
  })

  it('classifies hot + humid as hot-humid', () => {
    const v = makeVenue('miami', {}, { julyAvgHighC: 32, humidityPercent: 75 })
    expect(deriveClimateBand(v)).toBe('hot-humid')
  })

  it('classifies hot + dry as hot-dry', () => {
    const v = makeVenue('phoenix', {}, { julyAvgHighC: 40, humidityPercent: 25 })
    expect(deriveClimateBand(v)).toBe('hot-dry')
  })

  it('classifies cool venues as cold', () => {
    const v = makeVenue(
      'bcplace',
      {},
      { juneAvgHighC: 16, julyAvgHighC: 17, humidityPercent: 50 },
    )
    expect(deriveClimateBand(v)).toBe('cold')
  })

  it('classifies temperate venues as temperate', () => {
    const v = makeVenue('toronto', {}, { julyAvgHighC: 25, humidityPercent: 55 })
    expect(deriveClimateBand(v)).toBe('temperate')
  })

  it('is deterministic — same input yields same band', () => {
    const v = makeVenue('x', { altitudeMeters: 2200 })
    expect(deriveClimateBand(v)).toBe(deriveClimateBand(v))
  })
})

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm({ lat: 10, lng: 10 }, { lat: 10, lng: 10 })).toBe(0)
  })

  it('returns ~111km for one degree latitude', () => {
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(km).toBeGreaterThan(105)
    expect(km).toBeLessThan(115)
  })
})

describe('derivePlayerHomeBand', () => {
  it('detects altitude clubs', () => {
    expect(derivePlayerHomeBand(makePlayer('p1', 'Pumas UNAM'))).toBe('altitude')
  })

  it('detects hot-humid Brazilian clubs', () => {
    expect(derivePlayerHomeBand(makePlayer('p2', 'Flamengo'))).toBe('hot-humid')
  })

  it('detects Nordic cold clubs', () => {
    expect(derivePlayerHomeBand(makePlayer('p3', 'Malmö FF'))).toBe('cold')
  })

  it('defaults to temperate for unknown clubs', () => {
    expect(derivePlayerHomeBand(makePlayer('p4', 'FC Genericville'))).toBe('temperate')
  })
})

describe('computeClimateTravel', () => {
  it('returns empty result when fixtures are missing', () => {
    const team = makeTeam('testland')
    const result = computeClimateTravel(team, [], [makeVenue('v1')], [])
    expect(result.fixtures).toEqual([])
    expect(result.totalTravelKm).toBe(0)
    expect(result.worstFixtureId).toBeNull()
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })

  it('returns empty result when venues are missing', () => {
    const team = makeTeam('testland')
    const fx = makeFixture('Stadium A', 'CityA', '2026-06-11T18:00:00Z')
    const result = computeClimateTravel(team, [fx], [], [])
    expect(result.fixtures).toEqual([])
    expect(result.totalTravelKm).toBe(0)
    expect(result.worstFixtureId).toBeNull()
  })

  it('totalTravelKm equals the sum of per-fixture travel km', () => {
    const team = makeTeam('testland')
    const venues = [
      makeVenue('a', { name: 'Stadium A', coordinates: { lat: 0, lng: 0 } }),
      makeVenue('b', { name: 'Stadium B', coordinates: { lat: 1, lng: 0 } }),
      makeVenue('c', { name: 'Stadium C', coordinates: { lat: 2, lng: 0 } }),
    ]
    const fixtures = [
      makeFixture('Stadium A', 'CityA', '2026-06-11T18:00:00Z', 'Match Day 1'),
      makeFixture('Stadium B', 'CityB', '2026-06-15T18:00:00Z', 'Match Day 2'),
      makeFixture('Stadium C', 'CityC', '2026-06-23T18:00:00Z', 'Match Day 3'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, [])
    expect(result.fixtures).toHaveLength(3)
    const sum = result.fixtures.reduce((acc, f) => acc + f.travelKm, 0)
    expect(result.totalTravelKm).toBe(sum)
    expect(result.fixtures[0].travelKm).toBe(0)
    expect(result.fixtures[1].travelKm).toBeGreaterThan(0)
  })

  it('picks the fixture with the lowest squadHomeMatchPct as worst', () => {
    const team = makeTeam('testland')
    // Cold-country squad — Nordic clubs everywhere
    const players = [
      makePlayer('p1', 'Malmö FF'),
      makePlayer('p2', 'Rosenborg'),
      makePlayer('p3', 'Helsinki HJK'),
    ]
    const venues = [
      makeVenue(
        'temperate',
        { name: 'Temperate Stadium', coordinates: { lat: 45, lng: -75 } },
        { juneAvgHighC: 22, julyAvgHighC: 25, humidityPercent: 55 },
      ),
      makeVenue(
        'hot-humid',
        { name: 'Hot Humid Stadium', coordinates: { lat: 25, lng: -80 } },
        { juneAvgHighC: 32, julyAvgHighC: 33, humidityPercent: 78 },
      ),
    ]
    const fixtures = [
      makeFixture('Temperate Stadium', 'Toronto', '2026-06-11T18:00:00Z', 'Match Day 1'),
      makeFixture('Hot Humid Stadium', 'Miami', '2026-06-15T18:00:00Z', 'Match Day 2'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, players)
    const hotHumidRow = result.fixtures.find((f) => f.venueSlug === 'hot-humid')!
    expect(result.worstFixtureId).toBe(hotHumidRow.fixtureId)
    expect(hotHumidRow.squadHomeMatchPct).toBeLessThan(
      result.fixtures.find((f) => f.venueSlug === 'temperate')!.squadHomeMatchPct,
    )
  })

  it('keeps squadHomeMatchPct in the [0, 100] range', () => {
    const team = makeTeam('testland')
    const players = Array.from({ length: 23 }, (_, i) =>
      makePlayer(`p${i}`, i % 2 === 0 ? 'Flamengo' : 'Malmö FF'),
    )
    const venues = [makeVenue('v1', { name: 'V1', altitudeMeters: 2400 })]
    const fixtures = [
      makeFixture('V1', 'CityA', '2026-06-11T18:00:00Z', 'Match Day 1'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, players)
    for (const row of result.fixtures) {
      expect(row.squadHomeMatchPct).toBeGreaterThanOrEqual(0)
      expect(row.squadHomeMatchPct).toBeLessThanOrEqual(100)
    }
  })

  it('gives a hot venue + cold-country squad a low fit %', () => {
    const team = makeTeam('iceland')
    const players = [
      makePlayer('p1', 'Malmö FF'),
      makePlayer('p2', 'Rosenborg'),
      makePlayer('p3', 'FC Kobenhavn'),
      makePlayer('p4', 'Helsinki HJK'),
    ]
    const venues = [
      makeVenue(
        'hothumid',
        { name: 'Hot Humid Stadium' },
        { juneAvgHighC: 32, julyAvgHighC: 34, humidityPercent: 80 },
      ),
    ]
    const fixtures = [
      makeFixture('Hot Humid Stadium', 'Miami', '2026-06-11T18:00:00Z'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, players)
    expect(result.fixtures[0].squadHomeMatchPct).toBeLessThanOrEqual(20)
  })

  it('counts each distinct venue toward sourceCount', () => {
    const team = makeTeam('testland')
    const venues = [
      makeVenue('a', { name: 'Stadium A', coordinates: { lat: 0, lng: 0 } }),
      makeVenue('b', { name: 'Stadium B', coordinates: { lat: 1, lng: 1 } }),
    ]
    const fixtures = [
      makeFixture('Stadium A', 'CityA', '2026-06-11T18:00:00Z', 'Match Day 1'),
      makeFixture('Stadium A', 'CityA', '2026-06-15T18:00:00Z', 'Match Day 2'),
      makeFixture('Stadium B', 'CityB', '2026-06-23T18:00:00Z', 'Match Day 3'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, [])
    expect(result.signalCount).toBe(3)
    expect(result.sourceCount).toBe(2)
  })

  it('orders fixtures by kickoff and applies zero travel to first match', () => {
    const team = makeTeam('testland')
    const venues = [
      makeVenue('a', { name: 'A', coordinates: { lat: 10, lng: 10 } }),
      makeVenue('b', { name: 'B', coordinates: { lat: 20, lng: 20 } }),
    ]
    const fixtures = [
      // Intentionally out of order
      makeFixture('B', 'CityB', '2026-06-15T18:00:00Z', 'Match Day 2'),
      makeFixture('A', 'CityA', '2026-06-11T18:00:00Z', 'Match Day 1'),
    ]
    const result = computeClimateTravel(team, fixtures, venues, [])
    expect(result.fixtures[0].venueSlug).toBe('a')
    expect(result.fixtures[0].travelKm).toBe(0)
    expect(result.fixtures[1].venueSlug).toBe('b')
    expect(result.fixtures[1].travelKm).toBeGreaterThan(0)
  })
})
