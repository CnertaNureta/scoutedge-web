import type { MatchFixture, Player, Team } from '@/lib/types'

export type ThreatTier = 'S' | 'A' | 'B' | 'C'
export type ProjectedRoleKey =
  | 'sweeperKeeper'
  | 'shotStopper'
  | 'ballPlayingCb'
  | 'defensiveAnchor'
  | 'deepLyingPlaymaker'
  | 'boxToBoxEngine'
  | 'boxCrasher'
  | 'invertedWinger'

export interface MatchProjectionRow {
  fixtureId: string
  opponentSlug: string
  opponentName: string
  opponentFlag?: string
  projectedRole: ProjectedRoleKey
  projectedMinutesPct: number
  threatTier: ThreatTier
  keyMatchupNote?: string
}

export interface MatchProjectionBreakdown {
  rows: MatchProjectionRow[]
  signalCount: number
  sourceCount: number
}

const MAX_ROWS = 6

const SELECTION_RISK_MINUTES: Record<'low' | 'medium' | 'high', number> = {
  low: 85,
  medium: 60,
  high: 35,
}
const SELECTION_RISK_MINUTES_DEFAULT = 75

const FITNESS_MINUTES_MODIFIER: Record<'green' | 'amber' | 'red', number> = {
  green: 0,
  amber: -15,
  red: -40,
}

const GK_BASE_MINUTES = 90
const GK_BENCHED_MINUTES = 0

const THREAT_TIER_S_MIN = 85
const THREAT_TIER_A_MIN = 75
const THREAT_TIER_B_MIN = 60

const STRONG_OPPONENT_FIFA_RANK_MAX = 15
const WEAK_OPPONENT_FIFA_RANK_MIN = 45

const KEY_MATCHUP_RATING_MIN = 82
const KEY_MATCHUP_OPPONENT_RANK_MAX = 20

const ROLE_BY_POSITION_TEMPLATE: Record<
  Player['position'],
  { primary: ProjectedRoleKey; alt: ProjectedRoleKey }
> = {
  GK: { primary: 'sweeperKeeper', alt: 'shotStopper' },
  DEF: { primary: 'ballPlayingCb', alt: 'defensiveAnchor' },
  MID: { primary: 'deepLyingPlaymaker', alt: 'boxToBoxEngine' },
  FWD: { primary: 'boxCrasher', alt: 'invertedWinger' },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function findOpponent(fixture: MatchFixture, playerTeamSlug: string): string | null {
  if (fixture.homeTeamSlug === playerTeamSlug) return fixture.awayTeamSlug
  if (fixture.awayTeamSlug === playerTeamSlug) return fixture.homeTeamSlug
  return null
}

function teamRatingFromFixture(
  fixture: MatchFixture,
  playerTeamSlug: string,
): number {
  // Use implied win probability as a strength proxy: opponent's win prob
  // against this team. Higher = stronger opponent.
  if (fixture.homeTeamSlug === playerTeamSlug) return fixture.awayWinProb
  if (fixture.awayTeamSlug === playerTeamSlug) return fixture.homeWinProb
  return 0
}

function projectRole(player: Player): ProjectedRoleKey {
  const template = ROLE_BY_POSITION_TEMPLATE[player.position]
  if (player.position === 'FWD') {
    const goalRatio = player.goals / Math.max(1, player.caps)
    return goalRatio >= 0.45 ? template.primary : template.alt
  }
  if (player.position === 'MID') {
    return player.rating >= 82 ? template.primary : template.alt
  }
  if (player.position === 'DEF') {
    return player.age >= 28 ? template.alt : template.primary
  }
  return player.rating >= 82 ? template.alt : template.primary
}

function projectMinutesPct(player: Player, opponentStrength: number): number {
  if (player.position === 'GK') {
    if (player.selectionRisk === 'high' || player.fitnessStatus === 'red') {
      return GK_BENCHED_MINUTES
    }
    return GK_BASE_MINUTES
  }

  const risk = player.selectionRisk
  let minutes = risk ? SELECTION_RISK_MINUTES[risk] : SELECTION_RISK_MINUTES_DEFAULT

  const fitnessAdj = FITNESS_MINUTES_MODIFIER[player.fitnessStatus] ?? 0
  minutes += fitnessAdj

  // Star players ride out tough fixtures; squad rotation in soft games.
  if (player.rating >= 80) {
    if (opponentStrength >= 0.45) minutes += 5
  } else if (player.rating < 75) {
    if (opponentStrength < 0.3) minutes -= 5
  }

  return clamp(Math.round(minutes), 0, 100)
}

function projectThreatTier(
  player: Player,
  opponentTeam: Team | undefined,
): ThreatTier {
  let score = player.rating

  if (opponentTeam) {
    if (opponentTeam.fifaRanking <= STRONG_OPPONENT_FIFA_RANK_MAX) {
      score -= 8
    } else if (opponentTeam.fifaRanking >= WEAK_OPPONENT_FIFA_RANK_MIN) {
      score += 4
    }
  }

  // Goalkeepers have a different threat ceiling — they don't put up xG, so
  // we tier them off shot-stopping ceiling (proxied by raw rating) without
  // the +/- opponent adjustment (they face every shot regardless).
  if (player.position === 'GK') {
    score = player.rating
  }

  if (score >= THREAT_TIER_S_MIN) return 'S'
  if (score >= THREAT_TIER_A_MIN) return 'A'
  if (score >= THREAT_TIER_B_MIN) return 'B'
  return 'C'
}

function buildKeyMatchupNote(
  player: Player,
  opponentTeam: Team | undefined,
  minutesPct: number,
): string | undefined {
  if (player.position === 'GK') return undefined
  if (!opponentTeam) return undefined
  if (player.rating < KEY_MATCHUP_RATING_MIN) return undefined
  if (opponentTeam.fifaRanking > KEY_MATCHUP_OPPONENT_RANK_MAX) return undefined
  if (minutesPct < 50) return undefined
  return `vs ${opponentTeam.name}`
}

function buildFixtureId(fixture: MatchFixture): string {
  return `${fixture.group}:${fixture.round}:${fixture.homeTeamSlug}:${fixture.awayTeamSlug}`
}

function buildTeamIndex(teams: Team[]): Map<string, Team> {
  const idx = new Map<string, Team>()
  for (const t of teams) {
    idx.set(t.slug, t)
  }
  return idx
}

/**
 * Pure compute — no IO. Caps at the next 6 upcoming fixtures for this player's
 * team. Returns empty rows when no fixtures are reachable.
 */
export function computeMatchProjection(
  player: Player,
  team: Team,
  fixtures: MatchFixture[],
  opponents: Team[] = [],
  now: Date = new Date(),
): MatchProjectionBreakdown {
  if (!fixtures || fixtures.length === 0) {
    return { rows: [], signalCount: 0, sourceCount: 0 }
  }

  const teamIndex = buildTeamIndex(opponents)
  const nowTime = now.getTime()

  const upcoming = [...fixtures]
    .filter(
      (f) => {
        if (f.homeTeamSlug !== team.slug && f.awayTeamSlug !== team.slug) return false
        const kickoffTime = new Date(f.kickoffUtc).getTime()
        return Number.isFinite(kickoffTime) && kickoffTime >= nowTime
      },
    )
    .sort(
      (a, b) =>
        new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
    )
    .slice(0, MAX_ROWS)

  if (upcoming.length === 0) {
    return { rows: [], signalCount: 0, sourceCount: 0 }
  }

  const role = projectRole(player)

  const rows: MatchProjectionRow[] = upcoming.map((fixture) => {
    const opponentSlug = findOpponent(fixture, team.slug) ?? ''
    const opponentTeam = teamIndex.get(opponentSlug)
    const opponentStrength = teamRatingFromFixture(fixture, team.slug)
    const minutesPct = projectMinutesPct(player, opponentStrength)
    const tier = projectThreatTier(player, opponentTeam)
    const note = buildKeyMatchupNote(player, opponentTeam, minutesPct)

    return {
      fixtureId: buildFixtureId(fixture),
      opponentSlug,
      opponentName: opponentTeam?.name ?? opponentSlug,
      opponentFlag: opponentTeam?.flag,
      projectedRole: role,
      projectedMinutesPct: minutesPct,
      threatTier: tier,
      keyMatchupNote: note,
    }
  })

  return {
    rows,
    signalCount: rows.length,
    sourceCount: 2,
  }
}
