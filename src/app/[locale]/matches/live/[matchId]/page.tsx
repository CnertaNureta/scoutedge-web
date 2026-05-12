import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getMatchesBoardData } from '@/lib/site-data'
import { sportsEventJsonLd } from '@/lib/og-utils'
import LiveMatchClient from './LiveMatchClient'

interface PageProps {
  params: Promise<{ matchId: string }>
}

function fixtureToMatchId(fixture: (typeof MATCH_FIXTURES)[number]): string {
  return `${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}-${fixture.group.toLowerCase()}`
}

/**
 * Resolve a `matchId` URL segment to a fixture.
 *
 * Primary form: `${homeSlug}-vs-${awaySlug}-${groupLowercased}`.
 * Fallback form: `match-NNN` (1-indexed position in `MATCH_FIXTURES`) —
 * keeps short, opaque ids working for smoke tests and deep links.
 */
function resolveFixture(matchId: string): (typeof MATCH_FIXTURES)[number] | undefined {
  const direct = MATCH_FIXTURES.find((f) => fixtureToMatchId(f) === matchId)
  if (direct) return direct

  const shortMatch = matchId.match(/^match-0*(\d+)$/i)
  if (shortMatch) {
    const idx = Number(shortMatch[1]) - 1
    if (idx >= 0 && idx < MATCH_FIXTURES.length) return MATCH_FIXTURES[idx]
  }
  return undefined
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId } = await params
  const fixture = resolveFixture(matchId)
  if (!fixture) return { title: 'Match Not Found' }

  const title = `Live: ${fixture.homeTeamSlug.replace(/-/g, ' ')} vs ${fixture.awayTeamSlug.replace(/-/g, ' ')} | World Cup 2026`
  return {
    title,
    description: `Live predictions, real-time stats, and interactive leaderboard for ${fixture.venue}, ${fixture.city}. Group ${fixture.group}, ${fixture.round}.`,
  }
}

export default async function LiveMatchPage({ params }: PageProps) {
  const { matchId } = await params
  const fixture = resolveFixture(matchId)

  if (!fixture) notFound()

  const { teamsBySlug } = await getMatchesBoardData()
  const homeTeam = teamsBySlug[fixture.homeTeamSlug]
  const awayTeam = teamsBySlug[fixture.awayTeamSlug]

  if (!homeTeam || !awayTeam) notFound()

  const eventJsonLd = sportsEventJsonLd({
    homeName: homeTeam.name,
    awayName: awayTeam.name,
    venue: fixture.venue,
    city: fixture.city,
    kickoffUtc: fixture.kickoffUtc,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <LiveMatchClient
        matchId={matchId}
        fixture={fixture}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </>
  )
}
