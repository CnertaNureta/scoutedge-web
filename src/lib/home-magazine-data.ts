import 'server-only'

import type { Contender } from '@/components/home-magazine/TopContenders'
import { getTeamColors } from '@/lib/team-colors'
import {
  getHomePageData,
  getMatchesBoardData,
  getDailyBriefingPageData,
} from '@/lib/site-data'
import type { MatchFixture, Team } from '@/lib/types'
import { computeGroupStandings, type GroupStanding } from '@/lib/standings'
import {
  computePowerScore,
  deriveStubElo,
  deriveStubTrend,
} from '@/lib/power-rankings-stub'
import { getCompareFbrefStats } from '@/lib/fbref-stats'
import { getLeaderboardData } from '@/lib/leaderboard-data'

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

export const FINAL_DATE_ISO = '2026-07-19T20:00:00-04:00'
const FINAL_DATE = new Date(FINAL_DATE_ISO)

function codeFor(slug: string): string {
  return ISO2_BY_SLUG[slug] ?? slug.slice(0, 3).toUpperCase()
}

function teamToContender(team: Team, index: number): Contender {
  const colors = getTeamColors(team.slug)
  const rank = index + 1
  return {
    team: {
      name: team.name,
      code: codeFor(team.slug),
      colors: [colors.primary, colors.secondary, colors.primary],
      slug: team.slug,
    },
    rank,
    elo: deriveStubElo(team),
    trend: deriveStubTrend(team),
    // form: omitted — no real recent-match results yet. The UI renders a
    // "FORM · PRE-TOURNAMENT" placeholder when `form` is undefined.
    title: team.archetypeMatch || team.keyInsight.split('.')[0],
    note: rank === 1 ? team.keyInsight : undefined,
  }
}

export interface HeroNextFixture {
  homeName: string
  homeCode: string
  homeColors: [string, string, string]
  awayName: string
  awayCode: string
  awayColors: [string, string, string]
  group: string
  round: string
  venue: string
  city: string
  kickoffIso: string
  kickoffLabel: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

export interface HeroStats {
  fixtures: number
  federations: number
  hitRate: string
  predictionsCast: string
}

export interface BriefingLeadStory {
  eyebrow: string
  headline: string
  body: string
  author: string
  readMinutes: number
}

export interface BriefingQuickStory {
  tag: string
  headline: string
  body: string
  readMinutes: number
}

export interface WeekDay {
  day: string
  date: string
  /** Short month label for the start date of this day, e.g. "MAY". */
  monthShort: string
  /** Full uppercase weekday name, e.g. "TUESDAY". */
  weekdayFull: string
  count: number
  today: boolean
}

export interface TodayFixture {
  time: string
  homeName: string
  homeColors: [string, string, string]
  awayName: string
  awayColors: [string, string, string]
  group: string
  note: string
  featured?: boolean
}

export interface CountdownValues {
  days: string
  hours: string
  minutes: string
  seconds: string
}

export interface NextKickoff {
  homeCode: string
  awayCode: string
  hoursUntil: number
  minutesUntil: number
}

export interface CompareStat {
  label: string
  a: number | null
  b: number | null
  format?: 'pct' | 'rating' | 'count'
}

export interface CompareTeams {
  home: { name: string; code: string; colors: [string, string, string]; slug?: string }
  away: { name: string; code: string; colors: [string, string, string]; slug?: string }
  stats?: CompareStat[]
}

export interface LeaderboardPodiumEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  favoriteTeamSlug: string | null
  totalPoints: number
  accuracyPct: number
  rank: number
}

export interface MagazineHomeData {
  contenders: Contender[]
  totalTeams: number
  nextFixture?: HeroNextFixture
  stats: HeroStats
  tickerItems: string[]
  leadStory?: BriefingLeadStory
  quickStories?: BriefingQuickStory[]
  groups: GroupStanding[]
  selectedGroupIds: [string, string]
  weekDays: WeekDay[]
  todayFixtures: TodayFixture[]
  fixturesByDay: TodayFixture[][]
  todayIndex: number
  countdown: CountdownValues
  countdownTargetIso: string
  nextKickoff?: NextKickoff
  compareTeams: CompareTeams
  /**
   * Whether to render the Leaderboard module. Becomes true once the
   * `global_leaderboard` materialized view has any rows (i.e., at least
   * one finished match has been scored and a predictor exists). Driven by
   * `getLeaderboardData()` (src/lib/leaderboard-data.ts).
   */
  showLeaderboard: boolean
  /**
   * Top 3 from the global leaderboard. Empty when `showLeaderboard` is false.
   */
  leaderboardPodium: LeaderboardPodiumEntry[]
  leaderboardTotalUsers: number
}

function fmtKickoffLabel(iso: string): string {
  const date = new Date(iso)
  // Use a fixed locale + ET timezone for SSR determinism.
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(date)
}

function fmtFixtureTime(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  }).format(date)
}

function buildNextFixture(
  fixture: MatchFixture | undefined,
  teamsBySlug: Record<string, Team>
): HeroNextFixture | undefined {
  if (!fixture) return undefined
  const home = teamsBySlug[fixture.homeTeamSlug]
  const away = teamsBySlug[fixture.awayTeamSlug]
  if (!home || !away) return undefined
  const homeColors = getTeamColors(home.slug)
  const awayColors = getTeamColors(away.slug)
  return {
    homeName: home.name,
    homeCode: codeFor(home.slug),
    homeColors: [homeColors.primary, homeColors.secondary, homeColors.primary],
    awayName: away.name,
    awayCode: codeFor(away.slug),
    awayColors: [awayColors.primary, awayColors.secondary, awayColors.primary],
    group: fixture.group,
    round: fixture.round,
    venue: fixture.venue,
    city: fixture.city,
    kickoffIso: fixture.kickoffUtc,
    kickoffLabel: fmtKickoffLabel(fixture.kickoffUtc),
    homeWinProb: fixture.homeWinProb,
    drawProb: fixture.drawProb,
    awayWinProb: fixture.awayWinProb,
  }
}

function buildWeekDays(fixtures: MatchFixture[], now: Date): WeekDay[] {
  // Week starts Monday at local midnight (server timezone). For deterministic
  // SSR we just use server now. Phase 3 will move to a client-side hook.
  const day = now.getDay() // 0=Sun .. 6=Sat
  const offsetToMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - offsetToMonday)
  monday.setHours(0, 0, 0, 0)

  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const weekdayFulls = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const todayKey = new Date(now)
  todayKey.setHours(0, 0, 0, 0)

  return labels.map((label, idx) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() + idx)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    const count = fixtures.filter((f) => {
      const t = new Date(f.kickoffUtc).getTime()
      return t >= start.getTime() && t < end.getTime()
    }).length
    return {
      day: label,
      date: String(start.getDate()).padStart(2, '0'),
      monthShort: months[start.getMonth()],
      weekdayFull: weekdayFulls[idx],
      count,
      today: start.getTime() === todayKey.getTime(),
    }
  })
}

function fixtureToTodayShape(
  f: MatchFixture,
  teamsBySlug: Record<string, Team>,
  featured: boolean
): TodayFixture {
  const home = teamsBySlug[f.homeTeamSlug]
  const away = teamsBySlug[f.awayTeamSlug]
  const homeColors = home ? getTeamColors(home.slug) : { primary: '#888', secondary: '#888' }
  const awayColors = away ? getTeamColors(away.slug) : { primary: '#888', secondary: '#888' }
  return {
    time: fmtFixtureTime(f.kickoffUtc),
    homeName: home?.name ?? f.homeTeamSlug,
    homeColors: [homeColors.primary, homeColors.secondary, homeColors.primary],
    awayName: away?.name ?? f.awayTeamSlug,
    awayColors: [awayColors.primary, awayColors.secondary, awayColors.primary],
    group: f.group,
    note: `${f.venue || f.city} · ${f.round}`,
    featured,
  }
}

function buildFixturesByDay(
  fixtures: MatchFixture[],
  teamsBySlug: Record<string, Team>,
  now: Date
): TodayFixture[][] {
  const day = now.getDay()
  const offsetToMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - offsetToMonday)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, idx) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() + idx)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    const dayFixtures = fixtures
      .filter((f) => {
        const t = new Date(f.kickoffUtc).getTime()
        return t >= start.getTime() && t < end.getTime()
      })
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
      .slice(0, 4)
    return dayFixtures.map((f, i) => fixtureToTodayShape(f, teamsBySlug, i === 0))
  })
}

function buildTodayFixtures(
  fixtures: MatchFixture[],
  teamsBySlug: Record<string, Team>,
  now: Date
): TodayFixture[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)

  const todays = fixtures.filter((f) => {
    const t = new Date(f.kickoffUtc).getTime()
    return t >= start.getTime() && t < end.getTime()
  })

  const target = todays.length > 0 ? todays : fixtures.filter((f) => new Date(f.kickoffUtc) > now)

  return target.slice(0, 4).map((f, idx) => fixtureToTodayShape(f, teamsBySlug, idx === 0))
}

function buildCountdown(now: Date): CountdownValues {
  const diff = Math.max(0, FINAL_DATE.getTime() - now.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    days: String(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  }
}

function buildNextKickoff(
  fixture: MatchFixture | undefined,
  teamsBySlug: Record<string, Team>,
  now: Date
): NextKickoff | undefined {
  if (!fixture) return undefined
  const home = teamsBySlug[fixture.homeTeamSlug]
  const away = teamsBySlug[fixture.awayTeamSlug]
  if (!home || !away) return undefined
  const diff = Math.max(0, new Date(fixture.kickoffUtc).getTime() - now.getTime())
  const totalMinutes = Math.floor(diff / 60000)
  return {
    homeCode: codeFor(home.slug),
    awayCode: codeFor(away.slug),
    hoursUntil: Math.floor(totalMinutes / 60),
    minutesUntil: totalMinutes % 60,
  }
}

function buildTickerItems(
  liveFixtures: { homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; round: string }[],
  upcoming: MatchFixture[],
  teamsBySlug: Record<string, Team>,
  now: Date
): string[] {
  if (liveFixtures.length > 0) {
    return liveFixtures.slice(0, 6).map((m) => {
      const score =
        m.homeScore !== null && m.awayScore !== null
          ? `${m.homeScore} — ${m.awayScore}`
          : 'vs'
      return `${m.homeTeam} ${score} ${m.awayTeam} · ${m.round}`
    })
  }

  return upcoming.slice(0, 6).map((f) => {
    const home = teamsBySlug[f.homeTeamSlug]
    const away = teamsBySlug[f.awayTeamSlug]
    const hCode = home ? codeFor(home.slug) : f.homeTeamSlug.slice(0, 3).toUpperCase()
    const aCode = away ? codeFor(away.slug) : f.awayTeamSlug.slice(0, 3).toUpperCase()
    const diffMs = new Date(f.kickoffUtc).getTime() - now.getTime()
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
    const hours = Math.floor(totalMinutes / 60)
    const days = Math.floor(hours / 24)
    const label = days > 0 ? `in ${days}d` : hours > 0 ? `in ${hours}h` : `in ${totalMinutes}m`
    return `${hCode} vs ${aCode} · ${label}`
  })
}

/**
 * Build the eight-row Compare stat table for the home magazine.
 *
 * Real data we have today (from `Team`):
 *   - FIFA rank (inverse-scored to a 0-100 "rank score")
 *   - chemistry, familiarity, stability, morale (already 0-100)
 *   - derived power score from `computePowerScore()`
 *   - derived stub Elo
 *
 * Real data we DON'T have yet (rendered as `—` with a flat 50/50 bar):
 *   - Goals/90, xG/90, Pass accuracy %
 * Wire these once an FBref-style stats source ships.
 */
function buildCompareStats(
  home: Team | undefined,
  away: Team | undefined,
  fbref?: Record<string, import('./fbref-stats').CompareFbrefStat> | null
): CompareStat[] {
  // Inverse FIFA rank → 0..100 "rank score" so higher is better and the bar
  // visualisation reads correctly. Anchored to a 60-team field.
  const rankScore = (r: number): number =>
    Math.max(0, Math.min(100, Math.round(100 - (r - 1) * 1.5)))
  const fbA = home ? fbref?.[home.slug] : undefined
  const fbB = away ? fbref?.[away.slug] : undefined
  return [
    {
      label: 'Power Score',
      a: home ? computePowerScore(home) : null,
      b: away ? computePowerScore(away) : null,
      format: 'count',
    },
    {
      label: 'Elo Rating',
      a: home ? deriveStubElo(home) : null,
      b: away ? deriveStubElo(away) : null,
      format: 'count',
    },
    {
      label: 'FIFA Rank Score',
      a: home ? rankScore(home.fifaRanking) : null,
      b: away ? rankScore(away.fifaRanking) : null,
      format: 'pct',
    },
    {
      label: 'Chemistry',
      a: home?.chemistry ?? null,
      b: away?.chemistry ?? null,
      format: 'pct',
    },
    {
      label: 'Possession',
      a: fbA?.possessionPct ?? null,
      b: fbB?.possessionPct ?? null,
      format: 'pct',
    },
    {
      label: 'Pass Accuracy',
      a: fbA?.passCompletionPct ?? null,
      b: fbB?.passCompletionPct ?? null,
      format: 'pct',
    },
    {
      label: 'xG / 90',
      a: fbA?.xgPer90 ?? null,
      b: fbB?.xgPer90 ?? null,
      format: 'rating',
    },
    {
      label: 'Morale',
      a: home?.morale ?? null,
      b: away?.morale ?? null,
      format: 'pct',
    },
  ]
}

function buildLeadAndQuickStories(
  signals:
    | Array<{
        type: string
        team: { name: string; flag: string; slug: string }
        headline: string
        detail: string
        impact: 'high' | 'medium' | 'low'
      }>
    | undefined
): { lead?: BriefingLeadStory; quick?: BriefingQuickStory[] } {
  if (!signals || signals.length === 0) return {}
  const [first, ...rest] = signals
  const lead: BriefingLeadStory = {
    eyebrow: `${first.team.flag} ${first.team.name.toUpperCase()} · ${first.type.toUpperCase()}`,
    headline: first.headline,
    body: first.detail,
    author: 'KICK ORACLE DESK',
    readMinutes: Math.max(2, Math.min(8, Math.ceil(first.detail.length / 220))),
  }
  const quick: BriefingQuickStory[] = rest.slice(0, 3).map((s) => ({
    tag: `${s.type.toUpperCase()} · ${codeFor(s.team.slug)}`,
    headline: s.headline,
    body: s.detail,
    readMinutes: Math.max(1, Math.min(5, Math.ceil(s.detail.length / 280))),
  }))
  return { lead, quick }
}

export async function getMagazineHomeData(): Promise<MagazineHomeData> {
  const now = new Date()
  const [home, matches, briefing, leaderboard] = await Promise.all([
    getHomePageData(),
    getMatchesBoardData(),
    // If the daily-briefing pipeline errors we still want the homepage to
    // render — but in development we want to see the failure so it doesn't
    // silently regress. Production logs swallow it to keep the page alive.
    getDailyBriefingPageData().catch((error: unknown) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[home-magazine] getDailyBriefingPageData failed:', error)
      }
      return undefined
    }),
    // Leaderboard is optional. Returns null when no real prediction data
    // exists yet (which is the current pre-tournament state). The homepage
    // hides the module entirely in that case.
    getLeaderboardData().catch(() => null),
  ])

  // Rank top contenders by the same `computePowerScore` used on
  // /power-rankings so the two surfaces agree. Tie-break on FIFA rank for
  // determinism.
  const contenders = [...home.topTeams]
    .sort((a, b) => {
      const diff = computePowerScore(b) - computePowerScore(a)
      if (diff !== 0) return diff
      return a.fifaRanking - b.fifaRanking
    })
    .slice(0, 8)
    .map(teamToContender)

  const upcoming = matches.fixtures
    .filter((f) => new Date(f.kickoffUtc).getTime() > now.getTime())
    .sort(
      (a, b) =>
        new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
    )

  const nextFixtureRaw = upcoming[0]
  const nextFixture = buildNextFixture(nextFixtureRaw, matches.teamsBySlug)

  const stats: HeroStats = {
    fixtures: matches.fixtures.length,
    federations: home.teams.length,
    // Honest pre-launch state: no user_predictions table yet (see
    // docs/leaderboard-schema.md). When predictions ship, replace with:
    //   const rate = await getPredictionHitRate({ windowDays: 30 })
    hitRate: '—',
    // Same: no count to aggregate until predictions exist.
    predictionsCast: '—',
  }

  // Live ticker — Phase 4 will plumb live cache fully. For now check the matches
  // board's source data via the live cache if a future signal arrives. We don't
  // have direct access to live cache from getMatchesBoardData, so fall back to
  // top 6 upcoming fixtures with hours-to-kickoff.
  const tickerItems = buildTickerItems([], upcoming, matches.teamsBySlug, now)

  const { lead, quick } = buildLeadAndQuickStories(briefing?.signals)

  const selectedGroupIds: [string, string] =
    matches.groups.length >= 2
      ? [matches.groups[0], matches.groups[Math.min(3, matches.groups.length - 1)]]
      : ['A', 'D']
  // Compute standings for ALL groups so the client-side selector can swap to
  // any letter without missing data. Pass live-cache 2026 match rows so that
  // any completed scores fold into the W/D/L tally; pre-tournament the rows
  // stay zero-state.
  const groups = computeGroupStandings(
    matches.teamsByGroup,
    matches.fixtures,
    matches.groups,
    briefing?.liveCache?.wcFixtures2026
  )
  // Mark the second selected group as featured (mirrors the design's tonight pick).
  const featuredId = selectedGroupIds[1]
  const featured = groups.find((g) => g.id === featuredId)
  if (featured) featured.isFeatured = true

  const weekDays = buildWeekDays(matches.fixtures, now)
  const todayFixtures = buildTodayFixtures(matches.fixtures, matches.teamsBySlug, now)
  const fixturesByDay = buildFixturesByDay(matches.fixtures, matches.teamsBySlug, now)
  const todayIndex = Math.max(0, weekDays.findIndex((d) => d.today))
  const countdown = buildCountdown(now)
  const nextKickoff = buildNextKickoff(nextFixtureRaw, matches.teamsBySlug, now)

  // Compare module — use top 2 contenders.
  // Stats use REAL `Team` fields (chemistry / morale / FIFA rank / power score)
  // plus FBref pull (possession, pass accuracy, xG/90) when Supabase has rows.
  const [c1, c2] = contenders
  const homeTeam = c1?.team.slug ? matches.teamsBySlug[c1.team.slug] : undefined
  const awayTeam = c2?.team.slug ? matches.teamsBySlug[c2.team.slug] : undefined
  const fbref =
    homeTeam && awayTeam
      ? await getCompareFbrefStats([homeTeam.slug, awayTeam.slug]).catch(() => null)
      : null
  const compareStats: CompareStat[] = buildCompareStats(homeTeam, awayTeam, fbref)
  const compareTeams: CompareTeams = {
    home: c1
      ? { name: c1.team.name, code: c1.team.code, colors: c1.team.colors, slug: c1.team.slug }
      : { name: 'Brazil', code: 'BRA', colors: ['#009C3B', '#FFDF00', '#002776'], slug: 'brazil' },
    away: c2
      ? { name: c2.team.name, code: c2.team.code, colors: c2.team.colors, slug: c2.team.slug }
      : {
          name: 'Argentina',
          code: 'ARG',
          colors: ['#75AADB', '#FFFFFF', '#75AADB'],
          slug: 'argentina',
        },
    stats: compareStats,
  }

  return {
    contenders,
    totalTeams: home.teams.length,
    nextFixture,
    stats,
    tickerItems,
    leadStory: lead,
    quickStories: quick,
    groups,
    selectedGroupIds,
    weekDays,
    todayFixtures,
    fixturesByDay,
    todayIndex,
    countdown,
    countdownTargetIso: FINAL_DATE_ISO,
    nextKickoff,
    compareTeams,
    // Show only when the global_leaderboard view has scored predictions.
    showLeaderboard: !!leaderboard && leaderboard.podium.length > 0,
    leaderboardPodium: leaderboard?.podium.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      favoriteTeamSlug: p.favoriteTeamSlug,
      totalPoints: p.totalPoints,
      accuracyPct: p.accuracyPct,
      rank: p.rank,
    })) ?? [],
    leaderboardTotalUsers: leaderboard?.totalUsers ?? 0,
  }
}
