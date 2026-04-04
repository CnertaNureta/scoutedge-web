import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  createApiFootballClient,
  createSupabaseSink,
  generateIngestVerificationReport,
  loadProjectEnv,
  normalizeMatchesPayload,
  normalizeSquadsPayload,
  normalizeStandingsPayload,
  normalizeTeamsPayload,
  parseCliArgs,
  resolveArtifactRootPath,
  runApiFootballIngest,
  upsertNormalizedSource,
} from '../../../scripts/lib/api-football-ingest.mjs'

function createFakeSink() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>()
  const matchesFilter = (
    row: Record<string, unknown>,
    filters: { column: string; value?: unknown; values?: unknown[]; operator?: string }[] = []
  ) =>
    filters.every((filter) => {
      if (filter.operator === 'in') {
        return (filter.values || []).includes(row[filter.column])
      }
      return row[filter.column] === filter.value
    })

  return {
    async upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
      const keys = onConflict.split(',').map((value) => value.trim())
      const tableMap = tables.get(table) || new Map<string, Record<string, unknown>>()

      for (const row of rows) {
        const identity = keys.map((key) => JSON.stringify(row[key])).join('::')
        tableMap.set(identity, {
          ...(tableMap.get(identity) || {}),
          ...row,
        })
      }

      tables.set(table, tableMap)
      return rows.length
    },
    async count(
      table: string,
      filters: { column: string; value?: unknown; values?: unknown[]; operator?: string }[] = []
    ) {
      const tableMap = tables.get(table) || new Map<string, Record<string, unknown>>()
      const rows = [...tableMap.values()]
      return rows.filter((row) => matchesFilter(row, filters)).length
    },
    async selectRows(
      table: string,
      columns: string[] | string,
      filters: { column: string; value?: unknown; values?: unknown[]; operator?: string }[] = []
    ) {
      const tableMap = tables.get(table) || new Map<string, Record<string, unknown>>()
      const selectedColumns = Array.isArray(columns) ? columns : columns.split(',').map((value) => value.trim())
      return [...tableMap.values()]
        .filter((row) => matchesFilter(row, filters))
        .map((row) =>
          selectedColumns.reduce<Record<string, unknown>>((acc, column) => {
            acc[column] = row[column]
            return acc
          }, {})
        )
    },
    async deleteMany(table: string, rows: Record<string, unknown>[], keyColumns: string[]) {
      const tableMap = tables.get(table) || new Map<string, Record<string, unknown>>()
      for (const row of rows) {
        const identity = keyColumns.map((key) => JSON.stringify(row[key])).join('::')
        tableMap.delete(identity)
      }
      tables.set(table, tableMap)
      return rows.length
    },
  }
}

function createPagedSupabaseMock({
  totalRows = 1505,
  pageCap = 1000,
  unstableWithoutOrder = false,
}: {
  totalRows?: number
  pageCap?: number
  unstableWithoutOrder?: boolean
} = {}) {
  const rows = Array.from({ length: totalRows }, (_, index) => ({ player_id: index + 1 }))
  const calls: Array<Record<string, unknown>> = []

  function createQuery({ ordered = false } = {}) {
    return {
      eq(column: string, value: unknown) {
        calls.push({ type: 'eq', column, value })
        return createQuery({ ordered })
      },
      in(column: string, values: unknown[]) {
        calls.push({ type: 'in', column, values })
        return createQuery({ ordered })
      },
      order(column: string, options: Record<string, unknown>) {
        calls.push({ type: 'order', column, options })
        return createQuery({ ordered: true })
      },
      range(from: number, to: number) {
        calls.push({ type: 'range', from, to })

        if (unstableWithoutOrder && !ordered) {
          if (from === 0) {
            return Promise.resolve({
              data: rows.slice(0, pageCap),
              error: null,
            })
          }

          return Promise.resolve({
            data: rows.slice(495, 1000),
            error: null,
          })
        }

        const cappedTo = Math.min(to + 1, totalRows, from + pageCap)
        return Promise.resolve({
          data: rows.slice(from, cappedTo),
          error: null,
        })
      },
    }
  }

  return {
    calls,
    from() {
      return {
        select() {
          calls.push({ type: 'select' })
          return createQuery()
        },
      }
    },
  }
}

function createSupabaseRequestCapture() {
  const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = []
  const supabase = createClient('https://example.test', 'service-role-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          body: String(init?.body ?? ''),
        })
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  })

  return { supabase, calls }
}

describe('api-football ingest cli parsing', () => {
  it('normalizes aliases and numeric filters', () => {
    const parsed = parseCliArgs([
      '--source',
      'fixtures,players',
      '--phase',
      'fetch,upsert',
      '--league',
      '1',
      '--season',
      '2026',
      '--team-id',
      '33,34',
      '--max-requests',
      '90',
      '--dry-run',
    ])

    expect(parsed.sources).toEqual(['matches', 'squads'])
    expect(parsed.phases).toEqual(['fetch', 'upsert'])
    expect(parsed.teamIds).toEqual([33, 34])
    expect(parsed.maxRequests).toBe(90)
    expect(parsed.leagueId).toBe(1)
    expect(parsed.season).toBe(2026)
    expect(parsed.dryRun).toBe(true)
  })

  it('resolves relative artifact roots from the provided project root', () => {
    const parsed = parseCliArgs(['--artifact-root', 'logs/custom'], {
      artifactRootCwd: '/repo-root',
    })

    expect(parsed.artifactRoot).toBe('/repo-root/logs/custom')
    expect(resolveArtifactRootPath('logs/custom', '/repo-root')).toBe('/repo-root/logs/custom')
    expect(resolveArtifactRootPath('/tmp/already-absolute', '/repo-root')).toBe('/tmp/already-absolute')
  })

  it('rejects garbage-suffixed numeric flags', () => {
    expect(() => parseCliArgs(['--season', '2026foo'])).toThrow('season must be a positive integer')
    expect(() => parseCliArgs(['--league', '1bar'])).toThrow('league must be a positive integer')
    expect(() => parseCliArgs(['--team-id', '33x,34'])).toThrow('team-id must be a positive integer')
  })

  it('report cli rejects garbage-suffixed numeric flags before env checks', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts', 'report-api-football-ingest.mjs'), '--season', '2026foo'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('season must be a positive integer')
  })
})

describe('api-football supabase sink', () => {
  it('orders paginated selectRows so large scopes stay stable', async () => {
    const supabase = createPagedSupabaseMock({ unstableWithoutOrder: true })
    const sink = createSupabaseSink({ supabase })

    const rows = await sink.selectRows('football_players', ['player_id'], [
      { operator: 'in', column: 'player_id', values: [1, 2, 3] },
    ])

    expect(rows).toHaveLength(1505)
    expect(new Set(rows.map((row) => row.player_id))).toHaveLength(1505)
    expect(supabase.calls.filter((call) => call.type === 'order')).toEqual([
      { type: 'order', column: 'player_id', options: { ascending: true } },
      { type: 'order', column: 'player_id', options: { ascending: true } },
    ])
    expect(supabase.calls.filter((call) => call.type === 'range')).toEqual([
      { type: 'range', from: 0, to: 999 },
      { type: 'range', from: 1000, to: 1999 },
    ])
  })

  it('upserts sparse team stubs one row at a time so PostgREST columns stay row-scoped', async () => {
    const { supabase, calls } = createSupabaseRequestCapture()
    const baseSink = createSupabaseSink({ supabase })
    const sink = {
      ...baseSink,
      async count() {
        return 0
      },
      async selectRows() {
        return []
      },
      async deleteMany() {
        return 0
      },
    }

    await upsertNormalizedSource({
      source: 'matches',
      normalized: {
        source: 'matches',
        normalizedAt: '2026-03-31T00:00:00.000Z',
        teamRows: [
          {
            team_id: 33,
            source: 'api-football',
            name: 'France',
            logo_url: 'france.png',
            last_fetched_at: '2026-03-31T00:00:00.000Z',
          },
          {
            team_id: 44,
            source: 'api-football',
            name: 'Argentina',
            last_fetched_at: '2026-03-31T00:00:00.000Z',
          },
        ],
        matchRows: [],
        stats: { teamCount: 2, matchCount: 0 },
      },
      sink,
      options: { leagueId: 1, season: 2026 },
      logger: { info() {}, warn() {}, error() {}, debug() {} },
    })

    const teamCalls = calls.filter((call) => call.url.includes('/football_teams?'))
    expect(teamCalls).toHaveLength(2)
    expect(new URL(teamCalls[0].url).searchParams.get('columns')).toBe(
      '"team_id","source","name","logo_url","last_fetched_at"'
    )
    expect(new URL(teamCalls[1].url).searchParams.get('columns')).toBe(
      '"team_id","source","name","last_fetched_at"'
    )
    expect(JSON.parse(teamCalls[0].body)).toEqual([
      {
        team_id: 33,
        source: 'api-football',
        name: 'France',
        logo_url: 'france.png',
        last_fetched_at: '2026-03-31T00:00:00.000Z',
      },
    ])
    expect(JSON.parse(teamCalls[1].body)).toEqual([
      {
        team_id: 44,
        source: 'api-football',
        name: 'Argentina',
        last_fetched_at: '2026-03-31T00:00:00.000Z',
      },
    ])
  })
})

describe('api-football normalization', () => {
  it('derives teams from multiple raw sources and deduplicates by team id', () => {
    const normalized = normalizeTeamsPayload({
      rawTeams: {
        response: [
          {
            team: {
              id: 33,
              name: 'France',
              code: 'FRA',
              country: 'France',
              national: true,
              logo: 'https://img/france.png',
            },
            venue: {
              name: 'Stade de France',
              city: 'Paris',
            },
          },
        ],
      },
      rawMatches: {
        response: [
          {
            teams: {
              home: { id: 33, name: 'France', logo: 'https://img/france.png' },
              away: { id: 44, name: 'Argentina', logo: 'https://img/argentina.png' },
            },
          },
        ],
      },
      rawStandings: {
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 1,
                    team: { id: 44, name: 'Argentina', logo: 'https://img/argentina.png' },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    expect(normalized.stats.teamCount).toBe(2)
    expect(normalized.rows.find((row: Record<string, unknown>) => row.team_id === 33)).toMatchObject({
      name: 'France',
      venue_name: 'Stade de France',
    })
    expect(normalized.rows.find((row: Record<string, unknown>) => row.team_id === 44)).toMatchObject({
      name: 'Argentina',
    })
  })

  it('normalizes squads, matches, and standings into table-shaped rows', () => {
    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            response: [
              {
                team: { id: 33, name: 'France', logo: 'https://img/france.png' },
                players: [
                  { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker', photo: 'mbappe.png' },
                  { id: 102, name: 'Mike Maignan', age: 31, number: 1, position: 'Goalkeeper', photo: 'maignan.png' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const standings = normalizeStandingsPayload({
      rawStandings: {
        response: [
          {
            league: {
              id: 1,
              season: 2026,
              standings: [
                [
                  {
                    rank: 1,
                    points: 3,
                    goalsDiff: 2,
                    group: 'Group A',
                    form: 'W',
                    description: 'Promotion',
                    team: { id: 33, name: 'France' },
                    all: {
                      played: 1,
                      win: 1,
                      draw: 0,
                      lose: 0,
                      goals: { for: 2, against: 0 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    expect(squads.stats.playerCount).toBe(2)
    expect(squads.stats.squadCount).toBe(2)
    expect(matches.stats.matchCount).toBe(1)
    expect(standings.stats.standingCount).toBe(1)
    expect(squads.playerRows[0]).toMatchObject({ player_id: 101, name: 'Kylian Mbappe' })
    expect(matches.matchRows[0]).toMatchObject({ fixture_id: 9001, home_team_id: 33, away_team_id: 44 })
    expect(standings.standingRows[0]).toMatchObject({ league_id: 1, team_id: 33, standing_group: 'Group A' })
  })

  it('preserves squad scope ids without materializing invalid team rows from team-id-only seeds', () => {
    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            team: { teamId: 33, name: null },
            response: [],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
    })

    expect(squads.scopeTeamIds).toEqual([33])
    expect(squads.teamRows).toEqual([])
    expect(squads.playerRows).toEqual([])
    expect(squads.squadRows).toEqual([])
  })

  it('drops malformed rows before they can violate required database constraints', () => {
    const fetchedAt = '2026-03-31T00:00:00.000Z'

    const teams = normalizeTeamsPayload({
      rawTeams: {
        response: [
          { team: { id: 33, name: 'France', logo: 'france.png' }, venue: {} },
          { team: { id: 44, name: null, logo: 'broken.png' }, venue: {} },
        ],
      },
      rawMatches: {
        response: [
          {
            fixture: { id: 9001 },
            teams: {
              home: { id: 33, name: 'France' },
              away: { id: 55, name: null },
            },
          },
        ],
      },
      rawStandings: {
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 1,
                    group: 'Group A',
                    team: { id: null, name: 'Ghost Team' },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 55, name: null, winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt,
    })

    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            response: [
              {
                team: { id: 33, name: 'France', logo: 'france.png' },
                players: [
                  { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker' },
                  { id: 102, name: null, age: 31, number: 1, position: 'Goalkeeper' },
                  { id: null, name: 'No Id', age: 22, number: 99, position: 'Midfielder' },
                ],
              },
            ],
          },
          44: {
            response: [
              {
                team: { id: 44, name: null, logo: 'broken.png' },
                players: [
                  { id: 201, name: 'Should Skip With Team', age: 24, number: 7, position: 'Forward' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt,
      season: 2026,
    })

    const standings = normalizeStandingsPayload({
      rawStandings: {
        response: [
          {
            league: {
              id: 1,
              season: 2026,
              standings: [
                [
                  {
                    rank: 1,
                    points: 3,
                    goalsDiff: 2,
                    group: 'Group A',
                    team: { id: 33, name: 'France' },
                    all: {
                      played: 1,
                      win: 1,
                      draw: 0,
                      lose: 0,
                      goals: { for: 2, against: 0 },
                    },
                  },
                  {
                    rank: 2,
                    points: 0,
                    goalsDiff: -2,
                    group: 'Group A',
                    team: { id: 44, name: null },
                    all: {
                      played: 1,
                      win: 0,
                      draw: 0,
                      lose: 1,
                      goals: { for: 0, against: 2 },
                    },
                  },
                  {
                    rank: 3,
                    points: 0,
                    goalsDiff: -3,
                    group: 'Group A',
                    team: { id: null, name: 'Ghost Team' },
                    all: {
                      played: 1,
                      win: 0,
                      draw: 0,
                      lose: 1,
                      goals: { for: 0, against: 3 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt,
    })

    expect(teams.rows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33])
    expect(teams.stats).toMatchObject({
      teamCount: 1,
      skippedTeamCount: 3,
    })

    expect(matches.teamRows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33])
    expect(matches.matchRows).toEqual([])
    expect(matches.stats).toMatchObject({
      teamCount: 1,
      matchCount: 0,
      skippedTeamCount: 1,
      skippedMatchCount: 1,
    })

    expect(squads.teamRows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33])
    expect(squads.playerRows.map((row: Record<string, unknown>) => row.player_id)).toEqual([101, 201])
    expect(squads.squadRows).toHaveLength(1)
    expect(squads.squadRows[0]).toMatchObject({ team_id: 33, player_id: 101, season: 2026 })
    expect(squads.stats).toMatchObject({
      teamCount: 1,
      playerCount: 2,
      squadCount: 1,
      skippedPlayerCount: 2,
      skippedSquadCount: 3,
    })

    expect(standings.teamRows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33])
    expect(standings.standingRows).toHaveLength(1)
    expect(standings.standingRows[0]).toMatchObject({
      league_id: 1,
      season: 2026,
      team_id: 33,
      standing_group: 'Group A',
    })
    expect(standings.stats).toMatchObject({
      teamCount: 1,
      standingCount: 1,
      skippedTeamCount: 2,
      skippedStandingCount: 2,
    })
  })

  it('treats zero-valued ids as invalid across team, player, squad, match, and standing rows', () => {
    const fetchedAt = '2026-03-31T00:00:00.000Z'

    const teams = normalizeTeamsPayload({
      rawTeams: {
        response: [
          { team: { id: 0, name: 'Zero Team', logo: 'zero.png' }, venue: {} },
        ],
      },
      fetchedAt,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 0,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt,
    })

    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          0: {
            response: [
              {
                team: { id: 0, name: 'Zero Team', logo: 'zero.png' },
                players: [
                  { id: 0, name: 'Zero Player', age: 20, number: 9, position: 'Attacker' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt,
      season: 2026,
    })

    const standings = normalizeStandingsPayload({
      rawStandings: {
        response: [
          {
            league: {
              id: 1,
              season: 2026,
              standings: [
                [
                  {
                    rank: 1,
                    points: 3,
                    goalsDiff: 2,
                    group: 'Group A',
                    team: { id: 0, name: 'Zero Team' },
                    all: {
                      played: 1,
                      win: 1,
                      draw: 0,
                      lose: 0,
                      goals: { for: 2, against: 0 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt,
    })

    expect(teams.rows).toEqual([])
    expect(teams.stats).toMatchObject({
      teamCount: 0,
      skippedTeamCount: 1,
    })

    expect(matches.teamRows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33, 44])
    expect(matches.matchRows).toEqual([])
    expect(matches.stats).toMatchObject({
      teamCount: 2,
      matchCount: 0,
      skippedMatchCount: 1,
    })

    expect(squads.scopeTeamIds).toEqual([])
    expect(squads.teamRows).toEqual([])
    expect(squads.playerRows).toEqual([])
    expect(squads.squadRows).toEqual([])
    expect(squads.stats).toMatchObject({
      teamCount: 0,
      playerCount: 0,
      squadCount: 0,
      skippedPlayerCount: 1,
      skippedSquadCount: 1,
    })

    expect(standings.teamRows).toEqual([])
    expect(standings.standingRows).toEqual([])
    expect(standings.stats).toMatchObject({
      teamCount: 0,
      standingCount: 0,
      skippedTeamCount: 1,
      skippedStandingCount: 1,
    })
  })

  it('drops malformed match rows when league or season scope is missing', () => {
    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: null, name: 'Broken League', season: null, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    expect(matches.teamRows.map((row: Record<string, unknown>) => row.team_id)).toEqual([33, 44])
    expect(matches.matchRows).toEqual([])
    expect(matches.stats).toMatchObject({
      teamCount: 2,
      matchCount: 0,
      skippedTeamCount: 0,
      skippedMatchCount: 1,
    })
  })
})

describe('api-football client', () => {
  it('loads project env files without overwriting already-exported variables', () => {
    const originalApiKey = process.env.API_FOOTBALL_KEY
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    delete process.env.API_FOOTBALL_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const loaded = loadProjectEnv({
      cwd: '/repo',
      fsModule: {
        existsSync(filePath: string) {
          return filePath === '/repo/.env.local' || filePath === '/repo/.env'
        },
        readFileSync(filePath: string) {
          if (filePath === '/repo/.env.local') {
            return 'API_FOOTBALL_KEY=from-local\n'
          }
          return 'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\n'
        },
      } as unknown as typeof import('fs'),
    })

    expect(loaded).toEqual(['/repo/.env.local', '/repo/.env'])
    expect(process.env.API_FOOTBALL_KEY).toBe('from-local')
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')

    process.env.API_FOOTBALL_KEY = 'already-set'
    loadProjectEnv({
      cwd: '/repo',
      fsModule: {
        existsSync() {
          return true
        },
        readFileSync() {
          return 'API_FOOTBALL_KEY=should-not-win\n'
        },
      } as unknown as typeof import('fs'),
    })

    expect(process.env.API_FOOTBALL_KEY).toBe('already-set')

    if (originalApiKey == null) {
      delete process.env.API_FOOTBALL_KEY
    } else {
      process.env.API_FOOTBALL_KEY = originalApiKey
    }

    if (originalSupabaseUrl == null) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    }
  })

  it('accepts dotenv lines prefixed with export', () => {
    const originalApiKey = process.env.API_FOOTBALL_KEY
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    delete process.env.API_FOOTBALL_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const loaded = loadProjectEnv({
      cwd: '/repo',
      fsModule: {
        existsSync(filePath: string) {
          return filePath === '/repo/.env.local' || filePath === '/repo/.env'
        },
        readFileSync(filePath: string) {
          if (filePath === '/repo/.env.local') {
            return 'export API_FOOTBALL_KEY=from-exported-local\n'
          }
          return 'export NEXT_PUBLIC_SUPABASE_URL=https://exported.example.supabase.co\n'
        },
      } as unknown as typeof import('fs'),
    })

    expect(loaded).toEqual(['/repo/.env.local', '/repo/.env'])
    expect(process.env.API_FOOTBALL_KEY).toBe('from-exported-local')
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://exported.example.supabase.co')

    if (originalApiKey == null) {
      delete process.env.API_FOOTBALL_KEY
    } else {
      process.env.API_FOOTBALL_KEY = originalApiKey
    }

    if (originalSupabaseUrl == null) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    }
  })

  it('strips inline comments from unquoted dotenv values while preserving quoted hashes', () => {
    const originalApiKey = process.env.API_FOOTBALL_KEY
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    delete process.env.API_FOOTBALL_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const loaded = loadProjectEnv({
      cwd: '/repo',
      fsModule: {
        existsSync(filePath: string) {
          return filePath === '/repo/.env.local' || filePath === '/repo/.env'
        },
        readFileSync(filePath: string) {
          if (filePath === '/repo/.env.local') {
            return 'API_FOOTBALL_KEY=test-key # inline comment\n'
          }
          return 'NEXT_PUBLIC_SUPABASE_URL=\"https://example.supabase.co/#fragment\" # keep quoted hash\n'
        },
      } as unknown as typeof import('fs'),
    })

    expect(loaded).toEqual(['/repo/.env.local', '/repo/.env'])
    expect(process.env.API_FOOTBALL_KEY).toBe('test-key')
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co/#fragment')

    if (originalApiKey == null) {
      delete process.env.API_FOOTBALL_KEY
    } else {
      process.env.API_FOOTBALL_KEY = originalApiKey
    }

    if (originalSupabaseUrl == null) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    }
  })

  it('collects paginated responses for multi-page endpoints', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ fixture: { id: 1 } }],
          paging: { current: 1, total: 2 },
          results: 1,
          errors: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ fixture: { id: 2 } }],
          paging: { current: 2, total: 2 },
          results: 1,
          errors: [],
        }),
      })

    const client = createApiFootballClient({
      apiKey: 'test-key',
      fetchImpl,
      logger: { info() {}, warn() {}, error() {}, debug() {} },
      maxRequests: 10,
      rateDelayMs: 0,
    })

    const payload = await client.requestAllPages('fixtures', { league: 1, season: 2026 })

    expect(payload.response).toHaveLength(2)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(new URL(fetchImpl.mock.calls[1][0]).searchParams.get('page')).toBe('2')
  })

  it('fails when API-Football returns logical errors in a 200 response', async () => {
    const client = createApiFootballClient({
      apiKey: 'test-key',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [],
          paging: { current: 1, total: 1 },
          results: 0,
          errors: { token: 'Invalid key' },
        }),
      }),
      logger: { info() {}, warn() {}, error() {}, debug() {} },
      maxRequests: 10,
      rateDelayMs: 0,
    })

    await expect(client.request('fixtures', { league: 1, season: 2026 })).rejects.toThrow(
      'API-Football reported errors for fixtures'
    )
  })

  it('adds a free-tier fallback hint when the key cannot access season 2026', async () => {
    const client = createApiFootballClient({
      apiKey: 'test-key',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [],
          paging: { current: 1, total: 1 },
          results: 0,
          errors: {
            season: 'Free plans do not have access to this season, try from 2022 to 2024.',
          },
        }),
      }),
      logger: { info() {}, warn() {}, error() {}, debug() {} },
      maxRequests: 10,
      rateDelayMs: 0,
    })

    await expect(client.request('teams', { league: 1, season: 2026 })).rejects.toThrow(
      'Free-tier fallback: rerun with --league 1 --season 2022, or use npm run ingest:api-football:free-tier.'
    )
  })

  it('retries logical rate-limit errors returned in a 200 response', async () => {
    vi.useFakeTimers()

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [],
          paging: { current: 1, total: 1 },
          results: 0,
          errors: {
            rateLimit: 'Too many requests. Your rate limit is 10 requests per minute.',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ team: { id: 33 } }],
          paging: { current: 1, total: 1 },
          results: 1,
          errors: [],
        }),
      })

    const client = createApiFootballClient({
      apiKey: 'test-key',
      fetchImpl,
      logger: { info() {}, warn() {}, error() {}, debug() {} },
      maxRequests: 10,
      rateDelayMs: 0,
    })

    try {
      const payloadPromise = client.request('teams', { league: 1, season: 2022 })
      await vi.advanceTimersByTimeAsync(60_000)
      const payload = await payloadPromise

      expect(payload.response).toEqual([{ team: { id: 33 } }])
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('api-football upsert idempotency', () => {
  it('keeps table counts stable across repeat upserts', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    const teams = normalizeTeamsPayload({
      rawTeams: {
        response: [
          { team: { id: 33, name: 'France', logo: 'france.png' }, venue: {} },
          { team: { id: 44, name: 'Argentina', logo: 'argentina.png' }, venue: {} },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            response: [
              {
                team: { id: 33, name: 'France', logo: 'france.png' },
                players: [
                  { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker', photo: 'mbappe.png' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const standings = normalizeStandingsPayload({
      rawStandings: {
        response: [
          {
            league: {
              id: 1,
              season: 2026,
              standings: [
                [
                  {
                    rank: 1,
                    points: 3,
                    goalsDiff: 2,
                    group: 'Group A',
                    team: { id: 33, name: 'France' },
                    all: {
                      played: 1,
                      win: 1,
                      draw: 0,
                      lose: 0,
                      goals: { for: 2, against: 0 },
                    },
                  },
                ],
                [
                  {
                    rank: 2,
                    points: 0,
                    goalsDiff: -2,
                    group: 'Group A',
                    team: { id: 44, name: 'Argentina' },
                    all: {
                      played: 1,
                      win: 0,
                      draw: 0,
                      lose: 1,
                      goals: { for: 0, against: 2 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    for (let repeat = 0; repeat < 2; repeat++) {
      await upsertNormalizedSource({ source: 'teams', normalized: teams, sink, options, logger })
      await upsertNormalizedSource({ source: 'squads', normalized: squads, sink, options, logger })
      await upsertNormalizedSource({ source: 'matches', normalized: matches, sink, options, logger })
      await upsertNormalizedSource({ source: 'standings', normalized: standings, sink, options, logger })
    }

    await expect(sink.count('football_teams')).resolves.toBe(2)
    await expect(sink.count('football_players')).resolves.toBe(1)
    await expect(sink.count('football_team_squads', [{ column: 'season', value: 2026 }])).resolves.toBe(1)
    await expect(sink.count('football_matches', [{ column: 'season', value: 2026 }])).resolves.toBe(1)
    await expect(
      sink.count('football_standings', [
        { column: 'season', value: 2026 },
        { column: 'league_id', value: 1 },
      ])
    ).resolves.toBe(2)
  })

  it('reconciles stale snapshot rows inside the upsert scope', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    await sink.upsert(
      'football_team_squads',
      [
        { team_id: 33, player_id: 101, season: 2026 },
        { team_id: 33, player_id: 999, season: 2026 },
      ],
      'team_id,player_id,season'
    )

    const normalized = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            response: [
              {
                team: { id: 33, name: 'France', logo: 'france.png' },
                players: [
                  { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker', photo: 'mbappe.png' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
    })

    const summary = await upsertNormalizedSource({
      source: 'squads',
      normalized,
      sink,
      options,
      logger,
    })

    const squadTableSummary = (summary.tables as Record<string, unknown>).football_team_squads as Record<string, unknown>

    expect(squadTableSummary).toMatchObject({
      attempted: 1,
      deleted: 1,
      staleCount: 1,
      totalAfterUpsert: 1,
    })
    await expect(
      sink.count('football_team_squads', [
        { operator: 'eq', column: 'season', value: 2026 },
        { operator: 'in', column: 'team_id', values: [33] },
      ])
    ).resolves.toBe(1)
  })

  it('keeps match summary counts scoped to the active league and season', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    await sink.upsert(
      'football_matches',
      [
        { fixture_id: 9001, league_id: 1, season: 2026, home_team_id: 33, away_team_id: 44 },
        { fixture_id: 9901, league_id: 2, season: 2026, home_team_id: 55, away_team_id: 66 },
      ],
      'fixture_id'
    )

    const normalized = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const summary = await upsertNormalizedSource({
      source: 'matches',
      normalized,
      sink,
      options,
      logger,
    })

    const matchTableSummary = (summary.tables as Record<string, unknown>).football_matches as Record<string, unknown>

    expect(matchTableSummary).toMatchObject({
      attempted: 1,
      totalAfterUpsert: 1,
    })
    await expect(
      sink.count('football_matches', [
        { operator: 'eq', column: 'season', value: 2026 },
        { operator: 'eq', column: 'league_id', value: 1 },
      ])
    ).resolves.toBe(1)
    await expect(
      sink.count('football_matches', [
        { operator: 'eq', column: 'season', value: 2026 },
      ])
    ).resolves.toBe(2)
  })

  it('does not upsert malformed match rows outside the active league/season scope', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    const normalized = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: null, name: 'Broken League', season: null, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const summary = await upsertNormalizedSource({
      source: 'matches',
      normalized,
      sink,
      options,
      logger,
    })

    expect(summary.tables).toMatchObject({
      football_teams: {
        attempted: 2,
        totalAfterUpsert: 2,
      },
      football_matches: {
        attempted: 0,
        totalAfterUpsert: 0,
      },
    })
    await expect(sink.count('football_matches')).resolves.toBe(0)
  })

  it('keeps empty team/player/squad summaries scoped to zero instead of counting unrelated existing rows', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    await sink.upsert(
      'football_teams',
      [
        { team_id: 999, name: 'Existing Team', source: 'api-football' },
      ],
      'team_id'
    )
    await sink.upsert(
      'football_players',
      [
        { player_id: 555, name: 'Existing Player', source: 'api-football' },
      ],
      'player_id'
    )
    await sink.upsert(
      'football_team_squads',
      [
        { team_id: 999, player_id: 555, season: 2026 },
      ],
      'team_id,player_id,season'
    )

    const summary = await upsertNormalizedSource({
      source: 'squads',
      normalized: {
        source: 'squads',
        teamRows: [],
        playerRows: [],
        squadRows: [],
        scopeTeamIds: [],
        stats: {},
      },
      sink,
      options,
      logger,
    })

    expect(summary.tables).toMatchObject({
      football_teams: {
        attempted: 0,
        totalAfterUpsert: 0,
      },
      football_players: {
        attempted: 0,
        totalAfterUpsert: 0,
      },
      football_team_squads: {
        attempted: 0,
        totalAfterUpsert: 0,
      },
    })
  })
})

describe('api-football ingest end-to-end', () => {
  it('marks the active source and phase as failed in state.json when a run errors', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    try {
      await expect(
        runApiFootballIngest({
          apiKey: '',
          artifactRoot,
          sources: ['teams'],
          phases: ['fetch'],
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow('API_FOOTBALL_KEY is required for fetch phase.')

      const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'state.json'), 'utf8'))

      expect(state.sources.teams.fetch).toMatchObject({
        status: 'failed',
        error: {
          name: 'Error',
          message: 'API_FOOTBALL_KEY is required for fetch phase.',
        },
      })
      expect(state.lastRun).toMatchObject({
        status: 'failed',
        error: {
          name: 'Error',
          message: 'API_FOOTBALL_KEY is required for fetch phase.',
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('clears stale phase errors from state.json after a later successful rerun', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    try {
      await expect(
        runApiFootballIngest({
          apiKey: '',
          artifactRoot,
          sources: ['teams'],
          phases: ['fetch'],
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow('API_FOOTBALL_KEY is required for fetch phase.')

      await runApiFootballIngest({
        apiKey: 'test-key',
        artifactRoot,
        sources: ['teams'],
        phases: ['fetch'],
        rateDelayMs: 0,
        maxRequests: 5,
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            response: [{ team: { id: 33, name: 'France' }, venue: {} }],
            paging: { current: 1, total: 1 },
            results: 1,
            errors: [],
          }),
        }),
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'state.json'), 'utf8'))

      expect(state.sources.teams.fetch).toMatchObject({
        status: 'completed',
        itemCount: 1,
      })
      expect(state.sources.teams.fetch.error).toBeUndefined()
      expect(state.sources.teams.fetch.failedAt).toBeUndefined()
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('treats empty standings snapshots as valid and reconciles stale rows away', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    await sink.upsert(
      'football_standings',
      [
        {
          league_id: 1,
          season: 2026,
          team_id: 33,
          standing_group: 'Group A',
          rank: 1,
        },
      ],
      'league_id,season,team_id,standing_group'
    )

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'standings.json'),
      `${JSON.stringify(
        {
          source: 'standings',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          response: [],
          meta: { results: 0, paging: { current: 1, total: 1 }, requestsUsed: 1 },
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        sink,
        artifactRoot,
        sources: ['standings'],
        phases: ['normalize', 'upsert'],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const normalizeSummary = ((run.phases as Record<string, unknown>).normalize as Record<
        string,
        { standingCount: number }
      >).standings
      const upsertSummary = ((run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; deleted?: number; staleCount?: number; totalAfterUpsert: number }>
      >).standings

      expect(run.status).toBe('completed')
      expect(normalizeSummary).toMatchObject({ standingCount: 0 })
      expect(upsertSummary.football_standings).toMatchObject({
        attempted: 0,
        deleted: 1,
        staleCount: 1,
        totalAfterUpsert: 0,
      })

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      const standingsReport = (report.tables as Record<string, unknown>).football_standings as Record<string, unknown>

      expect(standingsReport).toMatchObject({
        expectedCount: 0,
        actualCount: 0,
        missingCount: 0,
        unexpectedCount: 0,
        matches: true,
      })
      await expect(
        sink.count('football_standings', [
          { operator: 'eq', column: 'season', value: 2026 },
          { operator: 'eq', column: 'league_id', value: 1 },
        ])
      ).resolves.toBe(0)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('treats empty squad snapshots as valid and reconciles stale squad memberships away', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    await sink.upsert(
      'football_team_squads',
      [
        {
          team_id: 33,
          player_id: 101,
          season: 2026,
          jersey_number: 10,
        },
      ],
      'team_id,player_id,season'
    )

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'complete',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              response: [],
              fetchedAt: '2026-03-31T00:00:00.000Z',
            },
          },
          errors: {},
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        sink,
        artifactRoot,
        sources: ['squads'],
        phases: ['normalize', 'upsert'],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const normalizeSummary = ((run.phases as Record<string, unknown>).normalize as Record<
        string,
        { teamCount: number; playerCount: number; squadCount: number }
      >).squads
      const upsertSummary = ((run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; deleted?: number; staleCount?: number; totalAfterUpsert: number }>
      >).squads

      expect(run.status).toBe('completed')
      expect(normalizeSummary).toMatchObject({
        teamCount: 1,
        playerCount: 0,
        squadCount: 0,
      })
      expect(upsertSummary.football_team_squads).toMatchObject({
        attempted: 0,
        deleted: 1,
        staleCount: 1,
        totalAfterUpsert: 0,
      })

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_team_squads: {
          expectedCount: 0,
          actualCount: 0,
          missingCount: 0,
          unexpectedCount: 0,
          matches: true,
        },
      })
      await expect(
        sink.count('football_team_squads', [
          { operator: 'eq', column: 'season', value: 2026 },
          { operator: 'eq', column: 'team_id', value: 33 },
        ])
      ).resolves.toBe(0)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('reports zero-count team/player scopes for empty squad artifacts instead of omitting them', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    await sink.upsert(
      'football_teams',
      [
        { team_id: 999, name: 'Existing Team', source: 'api-football' },
      ],
      'team_id'
    )
    await sink.upsert(
      'football_players',
      [
        { player_id: 555, name: 'Existing Player', source: 'api-football' },
      ],
      'player_id'
    )

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'normalized'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'normalized', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          normalizedAt: '2026-03-31T00:00:00.000Z',
          scopeTeamIds: [],
          teamRows: [],
          playerRows: [],
          squadRows: [],
          stats: {
            teamCount: 0,
            playerCount: 0,
            squadCount: 0,
          },
        },
        null,
        2
      )}\n`
    )

    try {
      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_teams: {
          expectedCount: 0,
          actualCount: 0,
          missingCount: 0,
          unexpectedCount: 0,
          matches: true,
        },
        football_players: {
          expectedCount: 0,
          actualCount: 0,
          missingCount: 0,
          unexpectedCount: 0,
          matches: true,
        },
        football_team_squads: {
          expectedCount: 0,
          actualCount: 0,
          missingCount: 0,
          unexpectedCount: 0,
          matches: true,
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('does not warn about an empty snapshot when squads normalization still materializes team scope rows', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const warnings: Array<{ message: string; meta?: Record<string, unknown> }> = []
    const logger = {
      info() {},
      error() {},
      debug() {},
      warn(message: string, meta?: Record<string, unknown>) {
        warnings.push({ message, meta })
      },
    }

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'complete',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              response: [],
              fetchedAt: '2026-03-31T00:00:00.000Z',
            },
          },
          errors: {},
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['squads'],
        phases: ['normalize'],
        logger,
      })

      expect(run.status).toBe('completed')
      expect(warnings.some((warning) => warning.message === 'Normalization produced an empty snapshot.')).toBe(false)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('drops malformed squad rows during normalize+upsert so the run can still complete', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'complete',
          teams: {
            33: {
              team: { id: 33, name: 'France' },
              response: [
                {
                  team: { id: 33, name: 'France' },
                  players: [
                    { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker' },
                    { id: 102, name: null, age: 31, number: 1, position: 'Goalkeeper' },
                  ],
                },
              ],
              fetchedAt: '2026-03-31T00:00:00.000Z',
            },
            44: {
              team: { id: 44, name: null },
              response: [
                {
                  team: { id: 44, name: null },
                  players: [
                    { id: 201, name: 'Missing Team Name', age: 24, number: 7, position: 'Forward' },
                  ],
                },
              ],
              fetchedAt: '2026-03-31T00:00:00.000Z',
            },
          },
          errors: {},
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        sink,
        artifactRoot,
        sources: ['squads'],
        phases: ['normalize', 'upsert'],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const normalizeSummary = ((run.phases as Record<string, unknown>).normalize as Record<
        string,
        {
          teamCount: number
          playerCount: number
          squadCount: number
          skippedPlayerCount: number
          skippedSquadCount: number
        }
      >).squads
      const upsertSummary = ((run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >).squads

      expect(run.status).toBe('completed')
      expect(normalizeSummary).toMatchObject({
        teamCount: 1,
        playerCount: 2,
        squadCount: 1,
        skippedPlayerCount: 1,
        skippedSquadCount: 2,
      })
      expect(upsertSummary.football_teams).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })
      expect(upsertSummary.football_players).toMatchObject({
        attempted: 2,
        totalAfterUpsert: 2,
      })
      expect(upsertSummary.football_team_squads).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })

      await expect(sink.count('football_teams')).resolves.toBe(1)
      await expect(sink.count('football_players')).resolves.toBe(2)
      await expect(
        sink.count('football_team_squads', [
          { operator: 'eq', column: 'season', value: 2026 },
        ])
      ).resolves.toBe(1)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('scopes squad upsert-only runs to the requested team ids', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'normalized'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'normalized', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          normalizedAt: '2026-03-31T00:00:00.000Z',
          scopeTeamIds: [33, 44],
          teamRows: [
            { team_id: 33, source: 'api-football', name: 'France' },
            { team_id: 44, source: 'api-football', name: 'Argentina' },
          ],
          playerRows: [
            { player_id: 101, source: 'api-football', name: 'Kylian Mbappe' },
            { player_id: 202, source: 'api-football', name: 'Lionel Messi' },
          ],
          squadRows: [
            { team_id: 33, player_id: 101, season: 2026 },
            { team_id: 44, player_id: 202, season: 2026 },
          ],
          stats: {
            teamCount: 2,
            playerCount: 2,
            squadCount: 2,
          },
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        sink,
        artifactRoot,
        sources: ['squads'],
        phases: ['upsert'],
        teamIds: [33],
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const upsertSummary = ((run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >).squads

      expect(run.status).toBe('completed')
      expect(upsertSummary).toMatchObject({
        football_teams: {
          attempted: 1,
          totalAfterUpsert: 1,
        },
        football_players: {
          attempted: 1,
          totalAfterUpsert: 1,
        },
        football_team_squads: {
          attempted: 1,
          totalAfterUpsert: 1,
        },
      })

      await expect(sink.count('football_teams')).resolves.toBe(1)
      await expect(sink.count('football_players')).resolves.toBe(1)
      await expect(
        sink.count('football_team_squads', [
          { operator: 'eq', column: 'season', value: 2026 },
        ])
      ).resolves.toBe(1)
      await expect(
        sink.count('football_team_squads', [
          { operator: 'eq', column: 'season', value: 2026 },
          { operator: 'eq', column: 'team_id', value: 44 },
        ])
      ).resolves.toBe(0)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('derives squad scope team ids from squad rows when legacy artifacts omit teamRows and scopeTeamIds', async () => {
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    await sink.upsert(
      'football_teams',
      [
        { team_id: 33, source: 'api-football', name: 'France' },
      ],
      'team_id'
    )
    await sink.upsert(
      'football_players',
      [
        { player_id: 101, source: 'api-football', name: 'Kylian Mbappe' },
        { player_id: 202, source: 'api-football', name: 'Stale Player' },
      ],
      'player_id'
    )
    await sink.upsert(
      'football_team_squads',
      [
        { team_id: 33, player_id: 202, season: 2026, position: 'Forward' },
      ],
      'team_id,player_id,season'
    )

    const normalized = {
      source: 'squads',
      normalizedAt: '2026-03-31T00:00:00.000Z',
      teamRows: [],
      playerRows: [
        { player_id: 101, source: 'api-football', name: 'Kylian Mbappe' },
      ],
      squadRows: [
        { team_id: 33, player_id: 101, season: 2026, position: 'Attacker' },
      ],
      stats: {
        teamCount: 0,
        playerCount: 1,
        squadCount: 1,
      },
    }

    const summary = await upsertNormalizedSource({
      source: 'squads',
      normalized,
      sink,
      options,
      logger,
    })
    const tableSummary = summary.tables as Record<
      string,
      { attempted: number; deleted?: number; staleCount?: number; totalAfterUpsert: number }
    >

    expect(tableSummary.football_team_squads).toMatchObject({
      attempted: 1,
      deleted: 1,
      staleCount: 1,
      totalAfterUpsert: 1,
    })
    await expect(
      sink.count('football_team_squads', [
        { operator: 'eq', column: 'season', value: 2026 },
        { operator: 'eq', column: 'team_id', value: 33 },
      ])
    ).resolves.toBe(1)
    await expect(
      sink.selectRows('football_team_squads', ['team_id', 'player_id', 'season'], [
        { operator: 'eq', column: 'season', value: 2026 },
        { operator: 'eq', column: 'team_id', value: 33 },
      ])
    ).resolves.toEqual([
      { team_id: 33, player_id: 101, season: 2026 },
    ])
  })

  it('can bootstrap a squads-only run from explicit team ids without preexisting artifacts', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const sink = createFakeSink()

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        response: [
          {
            team: { id: 33, name: 'France', logo: 'https://img/france.png' },
            players: [
              {
                id: 101,
                name: 'Kylian Mbappe',
                age: 27,
                number: 10,
                position: 'Attacker',
                photo: 'mbappe.png',
              },
            ],
          },
        ],
        paging: { current: 1, total: 1 },
        results: 1,
        errors: [],
      }),
    })

    try {
      const firstRun = await runApiFootballIngest({
        apiKey: 'test-key',
        fetchImpl,
        sink,
        artifactRoot,
        sources: ['squads'],
        phases: ['fetch', 'normalize', 'upsert'],
        teamIds: [33],
        rateDelayMs: 0,
        maxRequests: 5,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const secondRun = await runApiFootballIngest({
        apiKey: 'test-key',
        fetchImpl,
        sink,
        artifactRoot,
        sources: ['squads'],
        phases: ['fetch', 'normalize', 'upsert'],
        teamIds: [33],
        rateDelayMs: 0,
        maxRequests: 5,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const firstFetchSummary = ((firstRun.phases as Record<string, unknown>).fetch as Record<
        string,
        { requestsUsed: number }
      >).squads
      const firstNormalizeSummary = ((firstRun.phases as Record<string, unknown>).normalize as Record<
        string,
        { teamCount: number; playerCount: number; squadCount: number }
      >).squads
      const firstUpsertSummary = ((firstRun.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >).squads

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(firstRun.status).toBe('completed')
      expect(secondRun.status).toBe('completed')
      expect(firstFetchSummary.requestsUsed).toBe(1)
      expect(firstNormalizeSummary).toMatchObject({
        teamCount: 1,
        playerCount: 1,
        squadCount: 1,
      })
      expect(firstUpsertSummary).toMatchObject({
        football_teams: { attempted: 1, totalAfterUpsert: 1 },
        football_players: { attempted: 1, totalAfterUpsert: 1 },
        football_team_squads: { attempted: 1, totalAfterUpsert: 1 },
      })
      await expect(sink.count('football_teams')).resolves.toBe(1)
      await expect(sink.count('football_players')).resolves.toBe(1)
      await expect(sink.count('football_team_squads', [{ column: 'season', value: 2026 }])).resolves.toBe(1)

      const squadsArtifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'raw', 'squads.json'), 'utf8'))
      expect(squadsArtifact.teams['33'].team).toMatchObject({ teamId: 33 })

      const runSummary = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'last-run.json'), 'utf8'))
      expect(runSummary.status).toBe('completed')
      expect(runSummary.phases.upsert.squads.football_team_squads.totalAfterUpsert).toBe(1)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('can dry-run normalize and upsert without Supabase credentials', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-dry-run-'))
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    try {
      const rawDir = path.join(artifactRoot, '1-2026', 'raw')
      fs.mkdirSync(rawDir, { recursive: true })

      fs.writeFileSync(
        path.join(rawDir, 'teams.json'),
        `${JSON.stringify(
          {
            source: 'teams',
            fetchedAt: '2026-03-31T00:00:00.000Z',
            leagueId: 1,
            season: 2026,
            response: [
              {
                team: { id: 33, name: 'France', code: 'FRA', country: 'France', national: true, logo: 'france.png' },
                venue: { name: 'Stade de France', city: 'Paris' },
              },
              {
                team: {
                  id: 44,
                  name: 'Argentina',
                  code: 'ARG',
                  country: 'Argentina',
                  national: true,
                  logo: 'argentina.png',
                },
                venue: { name: 'Monumental', city: 'Buenos Aires' },
              },
            ],
            meta: { results: 2, paging: { current: 1, total: 1 }, requestsUsed: 1 },
          },
          null,
          2
        )}\n`
      )

      fs.writeFileSync(
        path.join(rawDir, 'matches.json'),
        `${JSON.stringify(
          {
            source: 'matches',
            fetchedAt: '2026-03-31T00:00:00.000Z',
            leagueId: 1,
            season: 2026,
            response: [
              {
                fixture: {
                  id: 9001,
                  date: '2026-06-11T18:00:00Z',
                  timezone: 'UTC',
                  venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
                  status: { short: 'NS', long: 'Not Started', elapsed: null },
                },
                league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
                teams: {
                  home: { id: 33, name: 'France', winner: null },
                  away: { id: 44, name: 'Argentina', winner: null },
                },
                goals: { home: null, away: null },
              },
            ],
            meta: { results: 1, paging: { current: 1, total: 1 }, requestsUsed: 1 },
          },
          null,
          2
        )}\n`
      )

      fs.writeFileSync(
        path.join(rawDir, 'standings.json'),
        `${JSON.stringify(
          {
            source: 'standings',
            fetchedAt: '2026-03-31T00:00:00.000Z',
            leagueId: 1,
            season: 2026,
            response: [
              {
                league: {
                  id: 1,
                  season: 2026,
                  standings: [
                    [
                      {
                        rank: 1,
                        points: 3,
                        goalsDiff: 2,
                        group: 'Group A',
                        team: { id: 33, name: 'France' },
                        all: {
                          played: 1,
                          win: 1,
                          draw: 0,
                          lose: 0,
                          goals: { for: 2, against: 0 },
                        },
                      },
                      {
                        rank: 2,
                        points: 0,
                        goalsDiff: -2,
                        group: 'Group A',
                        team: { id: 44, name: 'Argentina' },
                        all: {
                          played: 1,
                          win: 0,
                          draw: 0,
                          lose: 1,
                          goals: { for: 0, against: 2 },
                        },
                      },
                    ],
                  ],
                },
              },
            ],
            meta: { results: 1, paging: { current: 1, total: 1 }, requestsUsed: 1 },
          },
          null,
          2
        )}\n`
      )

      fs.writeFileSync(
        path.join(rawDir, 'squads.json'),
        `${JSON.stringify(
          {
            source: 'squads',
            fetchedAt: '2026-03-31T00:00:00.000Z',
            leagueId: 1,
            season: 2026,
            status: 'complete',
            teams: {
              33: {
                team: { teamId: 33, name: 'France' },
                fetchedAt: '2026-03-31T00:00:00.000Z',
                response: [
                  {
                    team: { id: 33, name: 'France', logo: 'france.png' },
                    players: [
                      {
                        id: 101,
                        name: 'Kylian Mbappe',
                        age: 27,
                        number: 10,
                        position: 'Attacker',
                        photo: 'mbappe.png',
                      },
                    ],
                  },
                ],
              },
            },
            errors: {},
          },
          null,
          2
        )}\n`
      )

      const run = await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['teams', 'matches', 'standings', 'squads'],
        phases: ['normalize', 'upsert'],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const upsertSummary = (run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >

      expect(run.status).toBe('completed')
      expect(run.options).toMatchObject({ dryRun: true })
      expect(upsertSummary.teams.football_teams).toMatchObject({
        attempted: 2,
        totalAfterUpsert: 2,
      })
      expect(upsertSummary.matches.football_matches).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })
      expect(upsertSummary.standings.football_standings).toMatchObject({
        attempted: 2,
        totalAfterUpsert: 2,
      })
      expect(upsertSummary.squads.football_players).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })
      expect(upsertSummary.squads.football_team_squads).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })
    } finally {
      if (originalSupabaseUrl == null) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
      }

      if (originalSupabaseKey == null) {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY
      } else {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey
      }

      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('allows scoped squad retries to complete even when old out-of-scope errors remain in the artifact', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        response: [
          {
            team: { id: 33, name: 'France', logo: 'https://img/france.png' },
            players: [
              {
                id: 101,
                name: 'Kylian Mbappe',
                age: 27,
                number: 10,
                position: 'Attacker',
                photo: 'mbappe.png',
              },
            ],
          },
        ],
        paging: { current: 1, total: 1 },
        results: 1,
        errors: [],
      }),
    })

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'partial',
          teams: {},
          errors: {
            44: {
              teamName: 'Argentina',
              message: 'Previous failure',
              failedAt: '2026-03-31T00:00:00.000Z',
            },
          },
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        apiKey: 'test-key',
        artifactRoot,
        sources: ['squads'],
        phases: ['fetch'],
        teamIds: [33],
        rateDelayMs: 0,
        maxRequests: 5,
        fetchImpl,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const fetchSummary = (run.phases as Record<string, unknown>).fetch as Record<string, Record<string, number>>

      expect(run.status).toBe('completed')
      expect(fetchSummary.squads).toMatchObject({
        requestsUsed: 1,
        totalRequestsUsed: 1,
        failedTeams: 0,
        unresolvedFailedTeams: 1,
      })

      const squadsArtifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'raw', 'squads.json'), 'utf8'))
      const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'state.json'), 'utf8'))

      expect(squadsArtifact.teams['33'].team).toMatchObject({ teamId: 33 })
      expect(squadsArtifact.errors['44']).toMatchObject({ teamName: 'Argentina' })
      expect(state.sources.squads.fetch).toMatchObject({
        status: 'partial',
        failedTeams: 0,
        unresolvedFailedTeams: 1,
      })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('fails full-scope squad normalize when the raw artifact still has unresolved errors', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'partial',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 33, name: 'France', logo: 'france.png' },
                  players: [
                    {
                      id: 101,
                      name: 'Kylian Mbappe',
                      age: 27,
                      number: 10,
                      position: 'Attacker',
                      photo: 'mbappe.png',
                    },
                  ],
                },
              ],
            },
          },
          errors: {
            44: {
              teamName: 'Argentina',
              message: 'Previous failure',
              failedAt: '2026-03-31T00:00:00.000Z',
            },
          },
        },
        null,
        2
      )}\n`
    )

    try {
      await expect(
        runApiFootballIngest({
          artifactRoot,
          dryRun: true,
          sources: ['squads'],
          phases: ['normalize'],
          leagueId: 1,
          season: 2026,
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow('Squad raw artifact is incomplete.')
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('surfaces the artifact path when squad normalize reads corrupted raw JSON', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(path.join(artifactRoot, '1-2026', 'raw', 'squads.json'), '{bad json\n')

    try {
      await expect(
        runApiFootballIngest({
          artifactRoot,
          dryRun: true,
          sources: ['squads'],
          phases: ['normalize'],
          leagueId: 1,
          season: 2026,
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow(`Failed to parse JSON artifact at ${path.join(artifactRoot, '1-2026', 'raw', 'squads.json')}`)
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('scopes squad normalize and upsert to requested team ids when reusing a multi-team raw artifact', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'partial',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 33, name: 'France', logo: 'france.png' },
                  players: [
                    {
                      id: 101,
                      name: 'Kylian Mbappe',
                      age: 27,
                      number: 10,
                      position: 'Attacker',
                      photo: 'mbappe.png',
                    },
                  ],
                },
              ],
            },
            44: {
              team: { teamId: 44, name: 'Argentina' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 44, name: 'Argentina', logo: 'argentina.png' },
                  players: [
                    {
                      id: 202,
                      name: 'Lionel Messi',
                      age: 39,
                      number: 10,
                      position: 'Attacker',
                      photo: 'messi.png',
                    },
                  ],
                },
              ],
            },
          },
          errors: {
            55: {
              teamName: 'Out Of Scope',
              message: 'Previous failure',
              failedAt: '2026-03-31T00:00:00.000Z',
            },
          },
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['squads'],
        phases: ['normalize', 'upsert'],
        teamIds: [33],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const normalizeSummary = ((run.phases as Record<string, unknown>).normalize as Record<
        string,
        { teamCount: number; playerCount: number; squadCount: number }
      >).squads
      const upsertSummary = ((run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >).squads
      const normalized = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'normalized', 'squads.json'), 'utf8'))

      expect(run.status).toBe('completed')
      expect(normalizeSummary).toMatchObject({
        teamCount: 1,
        playerCount: 1,
        squadCount: 1,
      })
      expect(normalized.scopeTeamIds).toEqual([33])
      expect(normalized.teamRows).toHaveLength(1)
      expect(normalized.playerRows).toHaveLength(1)
      expect(normalized.squadRows).toHaveLength(1)
      expect(normalized.teamRows[0].team_id).toBe(33)
      expect(normalized.playerRows[0].player_id).toBe(101)
      expect(normalized.squadRows[0]).toMatchObject({ team_id: 33, player_id: 101, season: 2026 })
      expect(upsertSummary).toMatchObject({
        football_teams: { attempted: 1, totalAfterUpsert: 1 },
        football_players: { attempted: 1, totalAfterUpsert: 1 },
        football_team_squads: { attempted: 1, totalAfterUpsert: 1 },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('rejects unscoped squad upsert when the normalized artifact was created for explicit team ids', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'complete',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 33, name: 'France', logo: 'france.png' },
                  players: [{ id: 101, name: 'Kylian Mbappe', number: 10, position: 'Attacker' }],
                },
              ],
            },
            44: {
              team: { teamId: 44, name: 'Argentina' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 44, name: 'Argentina', logo: 'argentina.png' },
                  players: [{ id: 202, name: 'Lionel Messi', number: 10, position: 'Attacker' }],
                },
              ],
            },
          },
        },
        null,
        2
      )}\n`
    )

    try {
      await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['squads'],
        phases: ['normalize'],
        teamIds: [33],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const normalized = JSON.parse(
        fs.readFileSync(path.join(artifactRoot, '1-2026', 'normalized', 'squads.json'), 'utf8')
      )

      expect(normalized.requestedTeamIds).toEqual([33])

      await expect(
        runApiFootballIngest({
          artifactRoot,
          dryRun: true,
          sources: ['squads'],
          phases: ['upsert'],
          leagueId: 1,
          season: 2026,
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow(
        'Normalized squads artifact is scoped to team ids: 33. Run normalize for squads again without --team-id before unscoped upsert/report, or rerun with a matching --team-id scope.'
      )
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('rejects squad upsert when requested team ids fall outside the normalized artifact scope', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'squads.json'),
      `${JSON.stringify(
        {
          source: 'squads',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          status: 'complete',
          teams: {
            33: {
              team: { teamId: 33, name: 'France' },
              fetchedAt: '2026-03-31T00:00:00.000Z',
              response: [
                {
                  team: { id: 33, name: 'France', logo: 'france.png' },
                  players: [{ id: 101, name: 'Kylian Mbappe', number: 10, position: 'Attacker' }],
                },
              ],
            },
          },
        },
        null,
        2
      )}\n`
    )

    try {
      await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['squads'],
        phases: ['normalize'],
        teamIds: [33],
        leagueId: 1,
        season: 2026,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      await expect(
        runApiFootballIngest({
          artifactRoot,
          dryRun: true,
          sources: ['squads'],
          phases: ['upsert'],
          teamIds: [44],
          leagueId: 1,
          season: 2026,
          logger: { info() {}, warn() {}, error() {}, debug() {} },
        })
      ).rejects.toThrow(
        'Normalized squads artifact is scoped to team ids: 33. It does not cover requested team ids: 44. Run normalize for squads again with a compatible --team-id scope first.'
      )
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('supports dry-run upserts across multiple sources in one run', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'raw'), { recursive: true })
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'teams.json'),
      `${JSON.stringify(
        {
          source: 'teams',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          response: [
            { team: { id: 33, name: 'France', logo: 'france.png' }, venue: {} },
          ],
        },
        null,
        2
      )}\n`
    )
    fs.writeFileSync(
      path.join(artifactRoot, '1-2026', 'raw', 'matches.json'),
      `${JSON.stringify(
        {
          source: 'matches',
          fetchedAt: '2026-03-31T00:00:00.000Z',
          leagueId: 1,
          season: 2026,
          response: [
            {
              fixture: {
                id: 9001,
                date: '2026-06-11T18:00:00Z',
                timezone: 'UTC',
                venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
                status: { short: 'NS', long: 'Not Started', elapsed: null },
              },
              league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
              teams: {
                home: { id: 33, name: 'France', winner: null },
                away: { id: 44, name: 'Argentina', winner: null },
              },
              goals: { home: null, away: null },
            },
          ],
        },
        null,
        2
      )}\n`
    )

    try {
      const run = await runApiFootballIngest({
        artifactRoot,
        dryRun: true,
        sources: ['teams', 'matches'],
        phases: ['normalize', 'upsert'],
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const upsertSummary = (run.phases as Record<string, unknown>).upsert as Record<
        string,
        Record<string, { attempted: number; totalAfterUpsert: number }>
      >

      expect(run.status).toBe('completed')
      expect(upsertSummary.teams.football_teams).toMatchObject({
        attempted: 2,
        totalAfterUpsert: 2,
      })
      expect(upsertSummary.matches.football_teams).toMatchObject({
        attempted: 2,
        totalAfterUpsert: 2,
      })
      expect(upsertSummary.matches.football_matches).toMatchObject({
        attempted: 1,
        totalAfterUpsert: 1,
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('tracks per-source request deltas during multi-source fetch runs', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-ingest-'))
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ team: { id: 33, name: 'France' }, venue: {} }],
          paging: { current: 1, total: 1 },
          results: 1,
          errors: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ fixture: { id: 9001 }, league: { id: 1, season: 2026 }, teams: {} }],
          paging: { current: 1, total: 2 },
          results: 1,
          errors: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          response: [{ fixture: { id: 9002 }, league: { id: 1, season: 2026 }, teams: {} }],
          paging: { current: 2, total: 2 },
          results: 1,
          errors: [],
        }),
      })

    try {
      const run = await runApiFootballIngest({
        apiKey: 'test-key',
        artifactRoot,
        sources: ['teams', 'matches'],
        phases: ['fetch'],
        rateDelayMs: 0,
        maxRequests: 10,
        fetchImpl,
        logger: { info() {}, warn() {}, error() {}, debug() {} },
      })

      const teamsArtifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'raw', 'teams.json'), 'utf8'))
      const matchesArtifact = JSON.parse(fs.readFileSync(path.join(artifactRoot, '1-2026', 'raw', 'matches.json'), 'utf8'))
      const fetchSummary = (run.phases as Record<string, unknown>).fetch as Record<
        string,
        { requestsUsed: number; totalRequestsUsed: number }
      >

      expect(run.status).toBe('completed')
      expect(fetchSummary.teams).toMatchObject({
        requestsUsed: 1,
        totalRequestsUsed: 1,
      })
      expect(fetchSummary.matches).toMatchObject({
        requestsUsed: 2,
        totalRequestsUsed: 3,
      })
      expect(teamsArtifact.meta).toMatchObject({
        requestsUsed: 1,
        totalRequestsUsed: 1,
      })
      expect(matchesArtifact.meta).toMatchObject({
        requestsUsed: 2,
        totalRequestsUsed: 3,
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('builds a scoped verification report from normalized artifacts and sink data', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    const teams = normalizeTeamsPayload({
      rawTeams: {
        response: [
          { team: { id: 33, name: 'France', logo: 'france.png' }, venue: {} },
          { team: { id: 44, name: 'Argentina', logo: 'argentina.png' }, venue: {} },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            response: [
              {
                team: { id: 33, name: 'France', logo: 'france.png' },
                players: [
                  { id: 101, name: 'Kylian Mbappe', age: 27, number: 10, position: 'Attacker', photo: 'mbappe.png' },
                ],
              },
            ],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    const standings = normalizeStandingsPayload({
      rawStandings: {
        response: [
          {
            league: {
              id: 1,
              season: 2026,
              standings: [
                [
                  {
                    rank: 1,
                    points: 3,
                    goalsDiff: 2,
                    group: 'Group A',
                    team: { id: 33, name: 'France' },
                    all: {
                      played: 1,
                      win: 1,
                      draw: 0,
                      lose: 0,
                      goals: { for: 2, against: 0 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'teams.json'), `${JSON.stringify(teams, null, 2)}\n`)
      fs.writeFileSync(path.join(normalizedDir, 'squads.json'), `${JSON.stringify(squads, null, 2)}\n`)
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)
      fs.writeFileSync(path.join(normalizedDir, 'standings.json'), `${JSON.stringify(standings, null, 2)}\n`)

      await upsertNormalizedSource({ source: 'teams', normalized: teams, sink, options, logger })
      await upsertNormalizedSource({ source: 'squads', normalized: squads, sink, options, logger })
      await upsertNormalizedSource({ source: 'matches', normalized: matches, sink, options, logger })
      await upsertNormalizedSource({ source: 'standings', normalized: standings, sink, options, logger })

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_teams: { expectedCount: 2, actualCount: 2, matches: true },
        football_players: { expectedCount: 1, actualCount: 1, matches: true },
        football_team_squads: { expectedCount: 1, actualCount: 1, matches: true },
        football_matches: { expectedCount: 1, actualCount: 1, matches: true },
        football_standings: { expectedCount: 1, actualCount: 1, matches: true },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('flags payload drift when database rows keep the same keys', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)

      await upsertNormalizedSource({ source: 'matches', normalized: matches, sink, options, logger })
      await sink.upsert(
        'football_matches',
        [
          {
            ...matches.matchRows[0],
            status_short: 'FT',
            status_long: 'Finished',
          },
        ],
        'fixture_id'
      )

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })
      const tableReport = report.tables as Record<
        string,
        {
          expectedCount: number
          actualCount: number
          missingCount: number
          unexpectedCount: number
          driftCount: number | null
          matches: boolean
        }
      >

      expect(tableReport.football_matches).toMatchObject({
        expectedCount: 1,
        actualCount: 1,
        missingCount: 0,
        unexpectedCount: 0,
        driftCount: 1,
        matches: false,
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('does not treat richer persisted team fields as drift when artifacts only contain sparse team stubs', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', logo: 'france.png' },
              away: { id: 44, name: 'Argentina', logo: 'argentina.png' },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)

      await sink.upsert(
        'football_teams',
        [
          {
            team_id: 33,
            source: 'api-football',
            name: 'France',
            logo_url: 'france.png',
            country: 'France',
            venue_name: 'Stade de France',
            last_fetched_at: '2026-03-31T00:00:00.000Z',
          },
          {
            team_id: 44,
            source: 'api-football',
            name: 'Argentina',
            logo_url: 'argentina.png',
            country: 'Argentina',
            venue_name: 'Monumental',
            last_fetched_at: '2026-03-31T00:00:00.000Z',
          },
        ],
        'team_id'
      )
      await sink.upsert('football_matches', matches.matchRows, 'fixture_id')

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_teams: {
          expectedCount: 2,
          actualCount: 2,
          missingCount: 0,
          unexpectedCount: 0,
          driftCount: 0,
          matches: true,
        },
        football_matches: {
          expectedCount: 1,
          actualCount: 1,
          driftCount: 0,
          matches: true,
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('tolerates equivalent timestamp formats when verifying persisted rows', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', winner: null },
              away: { id: 44, name: 'Argentina', winner: null },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)

      await sink.upsert(
        'football_matches',
        [
          {
            ...matches.matchRows[0],
            kickoff_at: '2026-06-11T18:00:00.000+00:00',
            last_fetched_at: '2026-03-31T00:00:00.000+00:00',
          },
        ],
        'fixture_id'
      )
      await sink.upsert(
        'football_teams',
        [
          {
            team_id: 33,
            source: 'api-football',
            name: 'France',
            last_fetched_at: '2026-03-31T00:00:00.000+00:00',
          },
          {
            team_id: 44,
            source: 'api-football',
            name: 'Argentina',
            last_fetched_at: '2026-03-31T00:00:00.000+00:00',
          },
        ],
        'team_id'
      )

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_matches: {
          expectedCount: 1,
          actualCount: 1,
          missingCount: 0,
          unexpectedCount: 0,
          driftCount: 0,
          matches: true,
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('does not treat mixed rich and sparse team artifacts as drift when sparse rows omit fields they do not know', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()
    const fetchedAt = '2026-03-31T00:00:00.000Z'

    const teams = normalizeTeamsPayload({
      rawTeams: {
        response: [
          {
            team: {
              id: 33,
              name: 'France',
              code: 'FRA',
              country: 'France',
              national: true,
              logo: 'france.png',
            },
            venue: {
              name: 'Stade de France',
              city: 'Paris',
            },
          },
        ],
      },
      fetchedAt,
    })

    const matches = normalizeMatchesPayload({
      rawMatches: {
        response: [
          {
            fixture: {
              id: 9001,
              date: '2026-06-11T18:00:00Z',
              timezone: 'UTC',
              venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 1, name: 'World Cup', season: 2026, round: 'Group A - 1' },
            teams: {
              home: { id: 33, name: 'France', logo: 'france.png' },
              away: { id: 44, name: 'Argentina', logo: 'argentina.png' },
            },
            goals: { home: null, away: null },
          },
        ],
      },
      fetchedAt,
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'teams.json'), `${JSON.stringify(teams, null, 2)}\n`)
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)

      await sink.upsert('football_teams', [teams.rows[0]], 'team_id')
      await sink.upsert(
        'football_teams',
        [
          {
            team_id: 44,
            source: 'api-football',
            name: 'Argentina',
            logo_url: 'argentina.png',
            country: 'Argentina',
            venue_name: 'Monumental',
            last_fetched_at: fetchedAt,
          },
        ],
        'team_id'
      )
      await sink.upsert('football_matches', matches.matchRows, 'fixture_id')

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_teams: {
          expectedCount: 2,
          actualCount: 2,
          missingCount: 0,
          unexpectedCount: 0,
          driftCount: 0,
          matches: true,
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('prefers newer team artifacts over older shared-table artifacts when verifying football_teams', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))
    const sink = createFakeSink()
    const options = { leagueId: 1, season: 2026 }
    const logger = { info() {}, warn() {}, error() {}, debug() {} }

    const teams = {
      source: 'teams',
      normalizedAt: '2026-04-01T00:00:00.000Z',
      rows: [
        {
          team_id: 33,
          source: 'api-football',
          name: 'France National Team',
          code: 'FRA',
          country: 'France',
          logo_url: 'france-new.png',
          last_fetched_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
          raw: {},
        },
      ],
      stats: { teamCount: 1 },
    }
    const matches = {
      source: 'matches',
      normalizedAt: '2026-03-01T00:00:00.000Z',
      teamRows: [
        {
          team_id: 33,
          source: 'api-football',
          name: 'France',
          logo_url: 'france-old.png',
          last_fetched_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
          raw: {},
        },
      ],
      matchRows: [],
      stats: { teamCount: 1, matchCount: 0 },
    }

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'teams.json'), `${JSON.stringify(teams, null, 2)}\n`)
      fs.writeFileSync(path.join(normalizedDir, 'matches.json'), `${JSON.stringify(matches, null, 2)}\n`)

      await upsertNormalizedSource({ source: 'teams', normalized: teams, sink, options, logger })

      const report = await generateIngestVerificationReport({
        sink,
        artifactRoot,
        leagueId: 1,
        season: 2026,
      })

      expect(report.tables).toMatchObject({
        football_teams: {
          expectedCount: 1,
          actualCount: 1,
          missingCount: 0,
          unexpectedCount: 0,
          driftCount: 0,
          matches: true,
        },
      })
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('rejects report generation when the squads artifact was normalized for explicit team ids only', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))

    const squads = normalizeSquadsPayload({
      rawSquads: {
        teams: {
          33: {
            team: { teamId: 33, name: 'France' },
            fetchedAt: '2026-03-31T00:00:00.000Z',
            response: [
              {
                team: { id: 33, name: 'France', logo: 'france.png' },
                players: [{ id: 101, name: 'Kylian Mbappe', number: 10, position: 'Attacker' }],
              },
            ],
          },
        },
      },
      fetchedAt: '2026-03-31T00:00:00.000Z',
      season: 2026,
      requestedTeamIds: [33],
    })

    try {
      const normalizedDir = path.join(artifactRoot, '1-2026', 'normalized')
      fs.mkdirSync(normalizedDir, { recursive: true })
      fs.writeFileSync(path.join(normalizedDir, 'squads.json'), `${JSON.stringify(squads, null, 2)}\n`)

      await expect(
        generateIngestVerificationReport({
          sink: createFakeSink(),
          artifactRoot,
          leagueId: 1,
          season: 2026,
        })
      ).rejects.toThrow(
        'Normalized squads artifact is scoped to team ids: 33. Run normalize for squads again without --team-id before unscoped upsert/report, or rerun with a matching --team-id scope.'
      )
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })

  it('surfaces the artifact path when report generation reads corrupted normalized JSON', async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'api-football-report-'))

    fs.mkdirSync(path.join(artifactRoot, '1-2026', 'normalized'), { recursive: true })
    fs.writeFileSync(path.join(artifactRoot, '1-2026', 'normalized', 'squads.json'), '{bad json\n')

    try {
      await expect(
        generateIngestVerificationReport({
          sink: createFakeSink(),
          artifactRoot,
          leagueId: 1,
          season: 2026,
        })
      ).rejects.toThrow(
        `Failed to parse JSON artifact at ${path.join(artifactRoot, '1-2026', 'normalized', 'squads.json')}`
      )
    } finally {
      fs.rmSync(artifactRoot, { recursive: true, force: true })
    }
  })
})
