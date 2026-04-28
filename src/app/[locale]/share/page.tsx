import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildOGMeta } from '@/lib/og-utils'
import { getAllTeams } from '@/lib/data-service'
import { TOP_CONTENDERS } from '@/data/prediction-matches'
import ShareCardClient from './ShareCardClient'

export const metadata: Metadata = {
  title: 'Share Your World Cup 2026 Champion Pick | KickOracle',
  description:
    'Generate a shareable card for your World Cup 2026 champion prediction. Compare against AI win probabilities and challenge your friends on social media.',
  keywords:
    'World Cup 2026 share card, World Cup 2026 champion prediction, share World Cup pick, World Cup 2026 social share',
  alternates: { canonical: 'https://kickoracle.com/share' },
  ...buildOGMeta({
    title: 'Share Your World Cup 2026 Champion Pick',
    description:
      'Generate a shareable card and challenge your friends with your World Cup 2026 champion prediction.',
    url: 'https://kickoracle.com/share',
  }),
}

export default async function SharePage() {
  const t = await getTranslations('sharePage')
  const allTeams = getAllTeams()

  const contenders = TOP_CONTENDERS.map((slug) => {
    const team = allTeams.find((t) => t.slug === slug)
    return {
      slug,
      name: team?.name ?? slug,
      flag: team?.flag ?? '🏴',
      fifaRanking: team?.fifaRanking ?? 99,
    }
  }).sort((a, b) => a.fifaRanking - b.fifaRanking)

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[180px] animate-float" />
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px] animate-float"
          style={{ animationDelay: '2s' }}
        />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-primary/15 text-primary border border-primary/20 font-label font-semibold uppercase tracking-widest rounded-full px-4 py-1 text-xs mb-4">
            {t('heroBadge')}
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">{t('heroTitle1')}</span>
            <span className="block gradient-text">{t('heroTitle2')}</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      {/* Share Card Builder */}
      <section className="page-container pb-24">
        <ShareCardClient contenders={contenders} />
      </section>
    </>
  )
}
