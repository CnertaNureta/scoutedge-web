import type { Metadata } from 'next'
import MatchesClient from './MatchesClient'

export const metadata: Metadata = {
  title: 'All Group-Stage Matches — World Cup 2026 Fixtures & Predictions',
  description:
    'Browse all 72 World Cup 2026 group-stage fixtures with AI-powered win probability predictions, venues, and kick-off times across 12 groups.',
  keywords:
    'World Cup 2026 matches, World Cup 2026 fixtures, World Cup 2026 schedule, World Cup 2026 predictions',
  alternates: { canonical: 'https://scoutedge.ai/matches' },
}

export default function MatchesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Group-Stage Matches',
    description:
      'All 72 group-stage fixtures for the 2026 FIFA World Cup with AI predictions.',
    numberOfItems: 72,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MatchesClient />
    </>
  )
}
