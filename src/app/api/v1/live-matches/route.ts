import { NextResponse } from 'next/server'
import {
  getDailyBriefingPageData,
  getMatchesBoardData,
} from '@/lib/site-data'
import type { LiveCacheMatch } from '@/lib/site-data'
import type { MatchFixture, Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'

/**
 * Same-origin homepage polling endpoint for the Hero "Tonight's Match" card
 * and the live-ticker. Intentionally NOT wrapped with `withApiKey` because it
 * is called from the user's own browser on the same origin; the existing
 * `/api/v1/*` middleware sets CORS but does not require an API key for
 * same-origin requests.
 *
 * Cache: 30s edge cache + 60s SWR — anything faster wastes resources for
 * negligible perceived freshness.
 */
export const revalidate = 30

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

function fmtKickoffLabel(iso: string): string {
  const date = new Date(iso)
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

export interface LiveScoreline {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  round: string
  minute?: string
}

export interface UpcomingFixturePayload {
  homeTeamSlug: string
  awayTeamSlug: string
  homeName: string
  awayName: string
  homeCode: string
  awayCode: string
  homeColors: [string, string, string]
  awayColors: [string, string, string]
  group: string
  round: string
  venue: string
  city: string
  kickoffUtc: string
  kickoffLabel: string
  hoursUntil: number
  minutesUntil: number
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

/**
 * A `LiveCacheMatch` is considered "live" when at least one score field has
 * been set to a non-null value. Pre-tournament we expect both to be null and
 * therefore no rows to qualify. There is no explicit `status` field on the
 * `LiveCacheMatch` shape today; if/when one is added, prefer it.
 */
function isLive(match: LiveCacheMatch): boolean {
  return match.homeScore !== null || match.awayScore !== null
}

function toUpcoming(
  fixture: MatchFixture,
  teamsBySlug: Record<string, Team>,
  now: Date
): UpcomingFixturePayload | null {
  const home = teamsBySlug[fixture.homeTeamSlug]
  const away = teamsBySlug[fixture.awayTeamSlug]
  if (!home || !away) return null

  const homeColors = getTeamColors(home.slug)
  const awayColors = getTeamColors(away.slug)
  const diff = Math.max(0, new Date(fixture.kickoffUtc).getTime() - now.getTime())
  const totalMinutes = Math.floor(diff / 60_000)

  return {
    homeTeamSlug: home.slug,
    awayTeamSlug: away.slug,
    homeName: home.name,
    awayName: away.name,
    homeCode: codeFor(home.slug),
    awayCode: codeFor(away.slug),
    homeColors: [homeColors.primary, homeColors.secondary, homeColors.primary],
    awayColors: [awayColors.primary, awayColors.secondary, awayColors.primary],
    group: fixture.group,
    round: fixture.round,
    venue: fixture.venue,
    city: fixture.city,
    kickoffUtc: fixture.kickoffUtc,
    kickoffLabel: fmtKickoffLabel(fixture.kickoffUtc),
    hoursUntil: Math.floor(totalMinutes / 60),
    minutesUntil: totalMinutes % 60,
    homeWinProb: fixture.homeWinProb,
    drawProb: fixture.drawProb,
    awayWinProb: fixture.awayWinProb,
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date()
    const [matches, briefing] = await Promise.all([
      getMatchesBoardData(),
      // Daily-briefing carries the `liveCache` snapshot. If it fails we still
      // want the upcoming list to render, so degrade gracefully.
      getDailyBriefingPageData().catch((error: unknown) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[live-matches] getDailyBriefingPageData failed:', error)
        }
        return null
      }),
    ])

    const liveRows = briefing?.liveCache?.wcFixtures2026 ?? []
    const live: LiveScoreline[] = liveRows
      .filter(isLive)
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        round: m.round,
      }))

    const upcoming: UpcomingFixturePayload[] = matches.fixtures
      .filter((f) => new Date(f.kickoffUtc).getTime() > now.getTime())
      .sort(
        (a, b) =>
          new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
      )
      .slice(0, 6)
      .map((f) => toUpcoming(f, matches.teamsBySlug, now))
      .filter((x): x is UpcomingFixturePayload => x !== null)

    return NextResponse.json(
      {
        fetchedAt: now.toISOString(),
        live,
        upcoming,
        nextFixture: upcoming[0] ?? null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[live-matches] GET failed:', error)
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        live: [],
        upcoming: [],
        nextFixture: null,
        error: 'failed_to_load',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
