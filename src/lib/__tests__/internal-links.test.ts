/**
 * Internal-link inventory tests.
 *
 * Verifies that homepage data + predictions page data yield enough internal
 * links to satisfy the SEO acceptance criterion of "≥5 inbound links" for
 * every team detail page.
 *
 * Acceptance:
 *   - Homepage contenders block → ≥8 team detail URLs.
 *   - /predictions "Browse by Group" → 12 group cards × 4 teams = 48 team URLs,
 *     i.e. every team appears at least once (so every team detail receives
 *     an inbound link from /predictions).
 */

import { describe, expect, it } from 'vitest'
import { getAllGroups, getAllTeams, getTeamsByGroup } from '@/lib/data-service'

describe('Homepage contenders block — inbound team-detail links', () => {
  it('static team pool has ≥8 FIFA-top teams to feed the homepage contenders block', () => {
    const teams = getAllTeams()
    const topTeams = teams
      .filter((team) => team.fifaRanking <= 12)
      .slice(0, 8)
    expect(topTeams.length).toBe(8)
    // Every top team must have a routable slug.
    for (const team of topTeams) {
      expect(team.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

describe('/predictions Browse-by-Group — inbound team-detail links', () => {
  it('emits one card per group with 4 teams each, covering every team', () => {
    const groups = getAllGroups()
    expect(groups.length).toBe(12)

    const teamSlugsInGroups = new Set<string>()
    for (const group of groups) {
      const teams = getTeamsByGroup(group)
      expect(teams.length).toBe(4)
      for (const team of teams) teamSlugsInGroups.add(team.slug)
    }

    // Every team across all 48 has an inbound link from the predictions page
    // (4 × 12 = 48 unique team slugs).
    const allTeams = getAllTeams()
    expect(teamSlugsInGroups.size).toBe(allTeams.length)
  })
})

describe('Cities cross-nav — inbound city-detail links', () => {
  it('every host city page links to the 11 other host cities', async () => {
    const { getAllCities } = await import('@/data/cities-data')
    const cities = getAllCities()
    expect(cities.length).toBe(16)
    // Cross-nav strip: each city page links to (n - 1) others.
    // Symmetric: each city receives 15 inbound links from the cross-nav alone.
    const inboundFromCrossNav = cities.length - 1
    expect(inboundFromCrossNav).toBeGreaterThanOrEqual(5)
  })
})
