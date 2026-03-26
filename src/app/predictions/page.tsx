import type { Metadata } from 'next'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import { getPredictionMatches, TOP_CONTENDERS } from '@/data/prediction-matches'
import { getAllTeams } from '@/lib/data-service'
import Badge from '@/components/ui/Badge'
import PredictionsClient from './PredictionsClient'

export const metadata: Metadata = {
  title: 'World Cup 2026 Prediction Game — Pick Winners & Challenge Friends | ScoutEdge',
  description:
    'Make your World Cup 2026 predictions! Pick match winners, choose your champion, and compare your picks against our AI model. Free bracket challenge with shareable results.',
  keywords:
    'World Cup 2026 predictions, World Cup 2026 bracket, World Cup 2026 pick em, World Cup 2026 prediction game, World Cup 2026 challenge',
  alternates: { canonical: 'https://scoutedge.ai/predictions' },
  ...buildOGMeta({
    title: 'World Cup 2026 Prediction Game — Make Your Picks',
    description: 'Pick match winners, choose your champion, and challenge friends. Free bracket challenge powered by AI.',
    url: 'https://scoutedge.ai/predictions',
  }),
}

export default function PredictionsPage() {
  const predictionMatches = getPredictionMatches()
  const allTeams = getAllTeams()

  // Hydrate match data with team names/flags
  const matches = predictionMatches.map((m) => {
    const home = allTeams.find((t) => t.slug === m.homeTeamSlug)
    const away = allTeams.find((t) => t.slug === m.awayTeamSlug)
    return {
      ...m,
      homeTeamName: home?.name ?? m.homeTeamSlug,
      awayTeamName: away?.name ?? m.awayTeamSlug,
      homeFlag: home?.flag ?? '',
      awayFlag: away?.flag ?? '',
    }
  })

  const contenders = TOP_CONTENDERS.map((slug) => {
    const team = allTeams.find((t) => t.slug === slug)
    return {
      slug,
      name: team?.name ?? slug,
      flag: team?.flag ?? '',
      fifaRanking: team?.fifaRanking ?? 99,
    }
  }).sort((a, b) => a.fifaRanking - b.fifaRanking)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScoutEdge World Cup 2026 Prediction Game',
    description: 'Free prediction challenge for FIFA World Cup 2026',
    applicationCategory: 'GameApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://scoutedge.ai' },
        { name: 'Predictions', url: 'https://scoutedge.ai/predictions' },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[180px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#e9c400]/6 blur-[140px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Free to Play</Badge>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">Prediction</span>
            <span className="block gradient-text">Challenge</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-4">
            Pick match winners, choose your champion, and see how your predictions
            stack up against our AI model. Lock in your picks and share with friends.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="inline-flex items-center gap-2 bg-surface-container/50 rounded-full px-4 py-2">
              <span className="font-mono text-sm font-bold text-primary">{matches.length}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Matches</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-surface-container/50 rounded-full px-4 py-2">
              <span className="font-mono text-sm font-bold" style={{ color: '#e9c400' }}>{contenders.length}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Title Contenders</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-surface-container/50 rounded-full px-4 py-2">
              <span className="font-mono text-sm font-bold" style={{ color: '#ffb4aa' }}>AI</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">vs You</span>
            </div>
          </div>
        </div>
      </section>

      {/* Predictions Content */}
      <section className="page-container pb-24">
        <PredictionsClient matches={matches} contenders={contenders} />
      </section>
    </>
  )
}
