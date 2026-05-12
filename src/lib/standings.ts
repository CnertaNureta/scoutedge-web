/**
 * Group standings computation. Returns zero-state (0-0-0 W/D/L) until match
 * results land on MatchFixture. To wire real standings, extend MatchFixture
 * with `homeScore`, `awayScore`, `status: 'scheduled'|'live'|'final'` and
 * reduce fixtures-with-final-status into per-team aggregates here.
 *
 * Check `liveCache.wcFixtures2026` first — historical fixtures there may
 * already carry scores in production. As of this writing the live-cache rows
 * are matched by team NAME (not slug) and only carry scores for completed
 * 2022 WC fixtures, so the 2026 group rail still renders pre-tournament.
 * `applyLiveCacheScores` exists below so once live 2026 score rows arrive,
 * passing them through to `computeGroupStandings` lights up the standings
 * automatically.
 */
import 'server-only'

import type { MatchFixture, Team } from '@/lib/types'
import type { LiveCacheMatch } from '@/lib/site-data'
import { getTeamColors } from '@/lib/team-colors'

export interface GroupStandingTeam {
  slug: string
  name: string
  code: string
  colors: [string, string, string]
  w: number
  d: number
  l: number
  gd: string
  pts: number
}

export interface GroupStanding {
  id: string
  matchday: number
  totalMatchdays: number
  isFeatured?: boolean
  teams: GroupStandingTeam[]
}

// Reuse the ISO2 mapping used by the homepage. Kept here so the helper has no
// dependency on the page module.
const ISO2_BY_SLUG: Record<string, string> = {
  argentina: 'ARG',
  brazil: 'BRA',
  france: 'FRA',
  england: 'ENG',
  germany: 'GER',
  spain: 'ESP',
  portugal: 'POR',
  netherlands: 'NED',
  usa: 'USA',
  mexico: 'MEX',
  italy: 'ITA',
  japan: 'JPN',
  'south-korea': 'KOR',
  morocco: 'MAR',
  croatia: 'CRO',
  belgium: 'BEL',
  colombia: 'COL',
  canada: 'CAN',
  uruguay: 'URU',
  senegal: 'SEN',
  australia: 'AUS',
  switzerland: 'SUI',
  denmark: 'DEN',
  poland: 'POL',
  serbia: 'SRB',
  'saudi-arabia': 'KSA',
  qatar: 'QAT',
  iran: 'IRN',
  tunisia: 'TUN',
  cameroon: 'CMR',
  ghana: 'GHA',
  ecuador: 'ECU',
  'costa-rica': 'CRC',
}

function codeFor(slug: string): string {
  return ISO2_BY_SLUG[slug] ?? slug.slice(0, 3).toUpperCase()
}

function teamToStandingRow(team: Team): GroupStandingTeam {
  const colors = getTeamColors(team.slug)
  return {
    slug: team.slug,
    name: team.name,
    code: codeFor(team.slug),
    colors: [colors.primary, colors.secondary, colors.primary],
    w: 0,
    d: 0,
    l: 0,
    gd: '—',
    pts: 0,
  }
}

interface MutableStandingRow extends GroupStandingTeam {
  gf: number
  ga: number
}

function newMutableRow(team: Team): MutableStandingRow {
  return { ...teamToStandingRow(team), gf: 0, ga: 0 }
}

function finalizeRow(row: MutableStandingRow): GroupStandingTeam {
  const diff = row.gf - row.ga
  const sign = diff > 0 ? '+' : ''
  return {
    slug: row.slug,
    name: row.name,
    code: row.code,
    colors: row.colors,
    w: row.w,
    d: row.d,
    l: row.l,
    gd: row.w + row.d + row.l === 0 ? '—' : `${sign}${diff}`,
    pts: row.pts,
  }
}

/**
 * Apply scores from `liveCache.wcFixtures2026` to the per-group mutable rows.
 * Live-cache rows are keyed by team NAME (not slug). We build a name→slug
 * lookup from the group's teams, find matches that involve two teams in the
 * SAME group, and only count rows that have both scores set (i.e. completed).
 */
function applyLiveCacheScores(
  byGroupRows: Record<string, Record<string, MutableStandingRow>>,
  liveMatches: LiveCacheMatch[] | undefined
): number {
  if (!liveMatches || liveMatches.length === 0) return 0

  // name → { groupId, slug } across ALL teams in ALL groups
  const nameLookup: Record<string, { groupId: string; slug: string }> = {}
  for (const [groupId, rows] of Object.entries(byGroupRows)) {
    for (const slug of Object.keys(rows)) {
      nameLookup[rows[slug].name.toLowerCase()] = { groupId, slug }
    }
  }

  let appliedCount = 0
  for (const match of liveMatches) {
    if (match.homeScore === null || match.awayScore === null) continue
    const home = nameLookup[match.homeTeam.toLowerCase()]
    const away = nameLookup[match.awayTeam.toLowerCase()]
    if (!home || !away) continue
    if (home.groupId !== away.groupId) continue // not a group-stage match

    const homeRow = byGroupRows[home.groupId][home.slug]
    const awayRow = byGroupRows[away.groupId][away.slug]
    homeRow.gf += match.homeScore
    homeRow.ga += match.awayScore
    awayRow.gf += match.awayScore
    awayRow.ga += match.homeScore

    if (match.homeScore > match.awayScore) {
      homeRow.w += 1
      homeRow.pts += 3
      awayRow.l += 1
    } else if (match.homeScore < match.awayScore) {
      awayRow.w += 1
      awayRow.pts += 3
      homeRow.l += 1
    } else {
      homeRow.d += 1
      homeRow.pts += 1
      awayRow.d += 1
      awayRow.pts += 1
    }
    appliedCount += 1
  }
  return appliedCount
}

/**
 * Compute group standings from teams + fixtures (+ optional live scores).
 *
 * MatchFixture currently lacks final scores — only pre-match win probabilities
 * are available. When `liveMatches` is supplied (from
 * `liveCache.wcFixtures2026`) and rows carry `homeScore`/`awayScore`, those
 * scores are folded in. Without scores we return zero-state rows
 * (`matchday: 0`). The shape stays stable so the UI doesn't need to change
 * once scores arrive.
 */
export function computeGroupStandings(
  teamsByGroup: Record<string, Team[]>,
  _fixtures: MatchFixture[],
  groupIds: string[],
  liveMatches?: LiveCacheMatch[]
): GroupStanding[] {
  // Build mutable rows keyed by groupId → slug → row
  const byGroupRows: Record<string, Record<string, MutableStandingRow>> = {}
  for (const id of groupIds) {
    const teams = teamsByGroup[id] ?? []
    byGroupRows[id] = {}
    for (const team of teams) {
      byGroupRows[id][team.slug] = newMutableRow(team)
    }
  }

  const matchesApplied = applyLiveCacheScores(byGroupRows, liveMatches)

  return groupIds.map((id) => {
    const rows = Object.values(byGroupRows[id]).map(finalizeRow)
    // Sort by points desc, then by GD numeric desc, then alphabetically.
    rows.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const aDiff = a.gd === '—' ? 0 : parseInt(a.gd, 10)
      const bDiff = b.gd === '—' ? 0 : parseInt(b.gd, 10)
      if (bDiff !== aDiff) return bDiff - aDiff
      return a.name.localeCompare(b.name)
    })
    // Matchday is best-effort: count matches involving this group's teams that
    // have actually been applied, divided by 2 (each row counts twice). Cap at 3.
    const teamsInGroup = Object.keys(byGroupRows[id]).length
    const gamesPerTeamMax = Math.min(3, teamsInGroup - 1)
    let played = 0
    if (matchesApplied > 0) {
      const totalRowPlays = Object.values(byGroupRows[id]).reduce(
        (sum, r) => sum + r.w + r.d + r.l,
        0
      )
      played = teamsInGroup > 0 ? Math.floor(totalRowPlays / teamsInGroup) : 0
    }
    return {
      id,
      matchday: played,
      totalMatchdays: gamesPerTeamMax,
      teams: rows,
    }
  })
}
