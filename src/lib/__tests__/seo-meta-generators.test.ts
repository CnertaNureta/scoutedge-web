import { describe, expect, it } from 'vitest'
import {
  MAX_META_DESCRIPTION_LENGTH,
  blogExcerptFallback,
  citiesFromCountryDescriptionEn,
  cityDescriptionEn,
  citySubpageDescriptionEn,
  matchDescriptionEn,
  playerDescriptionEn,
  playerStatusDescriptionEn,
  playerTitleEn,
  MAX_TITLE_WITH_BRAND_LENGTH,
  stadiumDescriptionEn,
  teamQualifiedDescriptionEn,
  travelFromCountryDescriptionEn,
  truncateForMeta,
  type PlayerDescriptionInput,
} from '@/data/seo-meta'
import { PLAYERS } from '@/data/players-data'
import { HOST_CITIES } from '@/data/cities-data'
import { ORIGIN_COUNTRIES } from '@/data/travel-data'
import { MATCH_FIXTURES } from '@/data/match-fixtures'

describe('seo-meta generators — length cap', () => {
  it('truncateForMeta never exceeds the cap', () => {
    const long = 'word '.repeat(80)
    const out = truncateForMeta(long)
    expect(out.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
  })

  it('truncateForMeta is a no-op when under the cap', () => {
    const short = 'Short description, well under limit.'
    expect(truncateForMeta(short)).toBe(short)
  })

  it('every player description stays under the cap', () => {
    const tooLong = PLAYERS.filter((p) => {
      const desc = playerDescriptionEn({
        name: p.name,
        position: p.position,
        team: p.teamSlug,
        club: p.club,
        age: p.age,
        caps: p.caps,
        goals: p.goals,
        rating: p.rating,
        slug: p.slug,
      })
      return desc.length > MAX_META_DESCRIPTION_LENGTH
    })
    expect(tooLong.map((p) => p.slug)).toEqual([])
  })

  it('every player title stays within the branded title target', () => {
    const tooLong = PLAYERS.filter((p) => {
      const title = `${playerTitleEn({ name: p.name })} | KickOracle`
      return title.length > MAX_TITLE_WITH_BRAND_LENGTH
    })
    expect(tooLong.map((p) => p.slug)).toEqual([])
  })

  it('every host-city description stays under the cap', () => {
    const tooLong = HOST_CITIES.filter((c) => {
      const desc = cityDescriptionEn(
        { name: c.name, country: c.country, matchCount: 4 },
        c.slug
      )
      return desc.length > MAX_META_DESCRIPTION_LENGTH
    })
    expect(tooLong.map((c) => c.slug)).toEqual([])
  })

  it('city subpage descriptions stay under the cap for every (city, kind)', () => {
    const kinds = [
      'tickets',
      'costs',
      'schedule',
      'transport',
      'hotels',
      'stadium',
      'food',
    ] as const
    const failures: string[] = []
    for (const city of HOST_CITIES) {
      for (const kind of kinds) {
        const desc = citySubpageDescriptionEn(kind, {
          cityName: city.name,
          country: city.country,
          hotelAvgUsd: city.accommodation.avgNightlyUsd,
          airportCode: city.transport.airportCode,
          venueName: city.venueIds[0],
          matchCount: 6,
          foodSpecialty: city.food.localSpecialty,
          tipPercentage: city.food.tipPercentage,
        })
        if (desc.length > MAX_META_DESCRIPTION_LENGTH) {
          failures.push(`${city.slug}/${kind}=${desc.length}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('cities/from + travel/from descriptions stay under the cap', () => {
    const failures: string[] = []
    for (const origin of ORIGIN_COUNTRIES) {
      const fromCities = citiesFromCountryDescriptionEn({
        countryName: origin.name,
        needsUsVisa: origin.needsUsVisa,
        flightHours: origin.flightHours,
        flightCostBudget: origin.flightCostBudget,
        nearestCity: origin.nearestCities[0],
      })
      const travel = travelFromCountryDescriptionEn({
        countryName: origin.name,
        needsUsVisa: origin.needsUsVisa,
        flightHours: origin.flightHours,
        flightCostBudget: origin.flightCostBudget,
        nearestCity: origin.nearestCities[0],
      })
      if (fromCities.length > MAX_META_DESCRIPTION_LENGTH) {
        failures.push(`cities-from:${origin.slug}=${fromCities.length}`)
      }
      if (travel.length > MAX_META_DESCRIPTION_LENGTH) {
        failures.push(`travel-from:${origin.slug}=${travel.length}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('every match description stays under the cap', () => {
    const failures = MATCH_FIXTURES.filter((m) => {
      const desc = matchDescriptionEn({
        homeTeam: m.homeTeamSlug,
        awayTeam: m.awayTeamSlug,
        group: m.group,
        venue: m.venue,
        city: m.city,
        matchKey: `${m.homeTeamSlug}-${m.awayTeamSlug}-${m.group}`,
      })
      return desc.length > MAX_META_DESCRIPTION_LENGTH
    })
    expect(failures.length).toBe(0)
  })

  it('stadium/team-qualified/player-status all respect cap on synthetic inputs', () => {
    expect(
      stadiumDescriptionEn({
        name: 'MetLife Stadium',
        city: 'East Rutherford',
        country: 'United States',
        capacity: 82500,
        matchCount: 8,
      }).length
    ).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)

    expect(
      teamQualifiedDescriptionEn({
        teamName: 'Brazil',
        group: 'C',
        qualLabel: 'Qualified',
        fifaRanking: 5,
      }).length
    ).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)

    expect(
      playerStatusDescriptionEn({
        name: 'Vinicius Junior',
        team: 'Brazil',
        statusLabel: 'Confirmed',
        reason: 'Named in the latest squad list.',
        updatedLabel: 'May 1, 2026',
      }).length
    ).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
  })

  it('blogExcerptFallback strips markup and respects cap', () => {
    const raw =
      '# Heading\n\n<p>Long **bold** body with [links](https://x.example) ' +
      'and lots of <em>emphasis</em>. ' +
      'Padding padding padding padding padding padding padding padding.</p>'
    const out = blogExcerptFallback(raw)
    expect(out).not.toMatch(/[<>#*`]/)
    expect(out.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
  })
})

describe('seo-meta generators — uniqueness', () => {
  it('player description templates produce >=90% unique outputs across 1,103 players', () => {
    const seen = new Set<string>()
    for (const p of PLAYERS) {
      const input: PlayerDescriptionInput = {
        name: p.name,
        position: p.position,
        team: p.teamSlug,
        club: p.club,
        age: p.age,
        caps: p.caps,
        goals: p.goals,
        rating: p.rating,
        slug: p.slug,
      }
      seen.add(playerDescriptionEn(input))
    }
    const uniqueRatio = seen.size / PLAYERS.length
    // Names are unique across the dataset and ratings/ages spread variants
    // across all six phrase templates, so we expect very high uniqueness.
    expect(uniqueRatio).toBeGreaterThanOrEqual(0.9)
  })

  it('player descriptions are deterministic across calls (stable SSR output)', () => {
    const sample = PLAYERS.slice(0, 25)
    for (const p of sample) {
      const input: PlayerDescriptionInput = {
        name: p.name,
        position: p.position,
        team: p.teamSlug,
        slug: p.slug,
      }
      expect(playerDescriptionEn(input)).toBe(playerDescriptionEn(input))
    }
  })
})
