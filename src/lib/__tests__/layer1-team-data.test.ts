import { describe, expect, it } from 'vitest'

import {
  buildLayer1Dataset,
  createFixtureLayer1SourceBundle,
  parseEloRatings,
  parseFbrefTeamStats,
  parseFbrefTemplateRows,
  serializeFbrefTemplateRowsCsv,
  serializeFbrefTeamStatsCsv,
} from '../layer1/team-data'

describe('layer1 team data', () => {
  it('parses fixture-backed FBref team stats for alias-heavy teams', { timeout: 15000 }, () => {
    const sourceBundle = createFixtureLayer1SourceBundle()
    const rows = parseFbrefTeamStats(sourceBundle)
    const usa = rows.find((row) => row.teamSlug === 'usa')
    const ivoryCoast = rows.find((row) => row.teamSlug === 'ivory-coast')

    expect(rows.length).toBe(46)
    expect(usa?.teamName).toBe('USA')
    expect(usa?.xg).not.toBeNull()
    expect(ivoryCoast?.raw.shooting_team_name).toBe('Côte d\'Ivoire')
  })

  it('parses fixture-backed ELO ratings and keeps canonical slugs', { timeout: 15000 }, () => {
    const sourceBundle = createFixtureLayer1SourceBundle()
    const rows = parseEloRatings(sourceBundle)
    const southKorea = rows.find((row) => row.teamSlug === 'south-korea')

    expect(rows.length).toBe(46)
    expect(southKorea?.teamName).toBe('South Korea')
    expect(typeof southKorea?.ratingValue).toBe('number')
  })

  it('builds a join-ready dataset with full fixture coverage', { timeout: 15000 }, () => {
    const result = buildLayer1Dataset(createFixtureLayer1SourceBundle())

    expect(result.teamRows.length).toBe(48)
    expect(result.matchRows.length).toBe(72)
    expect(result.teamStats.length).toBe(46)
    expect(result.ratings.length).toBe(46)
    expect(result.coverage.eligibleTeams).toBe(46)
    expect(result.coverage.statsCovered).toBe(46)
    expect(result.coverage.ratingsCovered).toBe(46)
    expect(result.coverage.missingStats).toEqual([])
    expect(result.coverage.missingRatings).toEqual([])
    expect(result.coverage.excludedTeams).toEqual(['tbd-playoff-i', 'tbd-playoff-k'])
  })

  it('serializes parsed FBref team stats into the CSV template shape', { timeout: 15000 }, () => {
    const rows = parseFbrefTeamStats(createFixtureLayer1SourceBundle())
    const csv = serializeFbrefTeamStatsCsv(rows)
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('Squad,90s,Poss,Cmp,Att,Cmp%,xG,xGA,UpdatedAt,Source URL')
    expect(lines.length).toBe(47)
    expect(csv).toContain('United States,3,')
    expect(csv).toContain("Côte d'Ivoire")
  })

  it('prefers anchor text when live FBref team cells include flag codes', () => {
    const sourceBundle = {
      competition: 'UEFA Euro 2024',
      season: '2024',
      fbref: {
        shooting: {
          html: `
            <html><body>
              <table id="stats_squads_shooting_for">
                <tbody>
                  <tr>
                    <th data-stat="team"><span>at</span> <a href="/teams/austria">Austria</a></th>
                    <td data-stat="minutes_90s">4.0</td>
                    <td data-stat="xg">5.1</td>
                  </tr>
                </tbody>
              </table>
            </body></html>
          `,
          sourceUrl: 'https://fbref.com/en/comps/676/shooting/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
        passing: {
          html: '<html><body></body></html>',
          sourceUrl: 'https://fbref.com/en/comps/676/passing/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
        possession: {
          html: '<html><body></body></html>',
          sourceUrl: 'https://fbref.com/en/comps/676/possession/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
      },
      elo: {
        html: '<html><body></body></html>',
        sourceUrl: 'https://eloratings.net/',
        fetchedAt: '2026-04-04T00:00:00Z',
      },
    }

    const rows = parseFbrefTeamStats(sourceBundle)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.teamSlug).toBe('austria')
    expect(rows[0]?.raw.shooting_team_name).toBe('Austria')
  })

  it('builds template rows without dropping teams that are outside the local catalog', () => {
    const sourceBundle = {
      competition: 'UEFA Euro 2024',
      season: '2024',
      fbref: {
        shooting: {
          html: `
            <html><body>
              <table id="stats_squads_shooting_for">
                <tbody>
                  <tr>
                    <th data-stat="team"><a href="/teams/albania">Albania</a></th>
                    <td data-stat="minutes_90s">3.0</td>
                    <td data-stat="xg">2.8</td>
                  </tr>
                </tbody>
              </table>
            </body></html>
          `,
          sourceUrl: 'https://fbref.com/en/comps/676/shooting/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
        passing: {
          html: `
            <html><body>
              <table id="stats_squads_passing_for">
                <tbody>
                  <tr>
                    <th data-stat="team"><a href="/teams/albania">Albania</a></th>
                    <td data-stat="passes_completed">841</td>
                    <td data-stat="passes">1012</td>
                    <td data-stat="passes_pct">83.1</td>
                  </tr>
                </tbody>
              </table>
            </body></html>
          `,
          sourceUrl: 'https://fbref.com/en/comps/676/passing/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
        possession: {
          html: `
            <html><body>
              <table id="stats_squads_possession_for">
                <tbody>
                  <tr>
                    <th data-stat="team"><a href="/teams/albania">Albania</a></th>
                    <td data-stat="possession">35.7</td>
                  </tr>
                </tbody>
              </table>
            </body></html>
          `,
          sourceUrl: 'https://fbref.com/en/comps/676/possession/UEFA-Euro-Stats',
          fetchedAt: '2026-04-04T00:00:00Z',
        },
      },
      elo: {
        html: '<html><body></body></html>',
        sourceUrl: 'https://eloratings.net/',
        fetchedAt: '2026-04-04T00:00:00Z',
      },
    }

    const rows = parseFbrefTemplateRows(sourceBundle)
    const csv = serializeFbrefTemplateRowsCsv(rows)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.sourceTeamName).toBe('Albania')
    expect(rows[0]?.matchesPlayed).toBe(3)
    expect(rows[0]?.passesCompleted).toBe(841)
    expect(csv).toContain('Albania,3,35.7,841,1012,83.1,2.8,')
  })
})
