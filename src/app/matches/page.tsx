import type { Metadata } from 'next'
import { getMatchesBoardData } from '@/lib/site-data'
import MatchesClient from './MatchesClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'World Cup 2026 Match Schedule: Fixtures, Kick-Off Times & Predictions',
  description:
    'Complete World Cup 2026 match schedule with all 72 group-stage fixtures. AI-powered win probability predictions, venues, and kick-off times across 16 host cities in the USA, Canada & Mexico.',
  keywords:
    'World Cup 2026 schedule, World Cup 2026 fixtures, World Cup 2026 matches, World Cup 2026 kick off times, World Cup 2026 predictions',
  alternates: { canonical: 'https://scoutedge.ai/matches' },
}

export default async function MatchesPage() {
  const { fixtures, groups, teamsByGroup, teamsBySlug } =
    await getMatchesBoardData()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Group-Stage Matches',
    description:
      'All 72 group-stage fixtures for the 2026 FIFA World Cup with AI predictions.',
    numberOfItems: fixtures.length,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MatchesClient
        fixtures={fixtures}
        groups={groups}
        teamsByGroup={teamsByGroup}
        teamsBySlug={teamsBySlug}
      />
    </>
  )
}
