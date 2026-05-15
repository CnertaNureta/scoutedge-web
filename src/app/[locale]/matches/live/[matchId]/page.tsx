import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getMatchesBoardData } from '@/lib/site-data'
import { sportsEventJsonLd, breadcrumbJsonLd, jsonLdGraph, canonicalForLocale, buildOGMeta } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import LiveMatchClient from './LiveMatchClient'

interface PageProps {
  params: Promise<{ locale: string; matchId: string }>
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
  const { locale, matchId } = await params
  const fixture = resolveFixture(matchId)
  if (!fixture) return { title: 'Match Not Found' }

  const title = `Live: ${fixture.homeTeamSlug.replace(/-/g, ' ')} vs ${fixture.awayTeamSlug.replace(/-/g, ' ')} | World Cup 2026`
  const description = `Live predictions, real-time stats, and interactive leaderboard for ${fixture.venue}, ${fixture.city}. Group ${fixture.group}, ${fixture.round}.`
  const canonicalMatchId = fixtureToMatchId(fixture)
  const alternates = buildAlternates(locale, `/matches/live/${canonicalMatchId}`)

  return {
    title,
    description,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

export default async function LiveMatchPage({ params }: PageProps) {
  const { locale, matchId } = await params
  const fixture = resolveFixture(matchId)

  if (!fixture) notFound()
  const canonicalMatchId = fixtureToMatchId(fixture)

  const { teamsBySlug } = await getMatchesBoardData()
  const homeTeam = teamsBySlug[fixture.homeTeamSlug]
  const awayTeam = teamsBySlug[fixture.awayTeamSlug]

  if (!homeTeam || !awayTeam) notFound()

  const eventJsonLd = sportsEventJsonLd({
    homeName: homeTeam.name,
    awayName: awayTeam.name,
    homeSlug: fixture.homeTeamSlug,
    awaySlug: fixture.awayTeamSlug,
    venue: fixture.venue,
    city: fixture.city,
    kickoffUtc: fixture.kickoffUtc,
  })

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Matches', url: canonicalForLocale(locale, '/matches') },
    {
      name: `${homeTeam.name} vs ${awayTeam.name}`,
      url: canonicalForLocale(locale, `/matches/live/${canonicalMatchId}`),
    },
  ])

  const graph = jsonLdGraph([eventJsonLd, breadcrumbs])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
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
