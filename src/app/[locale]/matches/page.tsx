import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { canonicalForLocale } from '@/lib/og-utils'
import { Link } from '@/i18n/navigation'
import { getMatchesBoardData } from '@/lib/site-data'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import { getLatestNarrativePost } from '@/lib/blog-service'
import MatchesClient from './MatchesClient'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'matchesPage' })
  return {
    title: t('featuredPreview'),
    description: 'World Cup 2026 matches, fixtures, and AI-powered match previews',
    keywords:
      'World Cup 2026 schedule, World Cup 2026 fixtures, World Cup 2026 matches, World Cup 2026 kick off times, World Cup 2026 predictions',
    alternates: { canonical: canonicalForLocale(locale, '/matches') },
  }
}

export default async function MatchesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('matchesPage')
  const { fixtures, groups, teamsByGroup, teamsBySlug } = await getMatchesBoardData()
  const featuredPreview = getLatestNarrativePost('match_preview')
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
      {featuredPreview && (
        <section className="max-w-[1440px] mx-auto px-6 pt-10">
          <GlassCard className="p-6 md:p-7 border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <Badge variant="primary" size="sm">{t('featuredPreview')}</Badge>
                <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mt-3 mb-3">
                  {featuredPreview.title}
                </h2>
                <p className="text-on-surface-variant leading-relaxed mb-4">
                  {featuredPreview.description}
                </p>
                <div className="flex flex-wrap gap-3 text-xs font-label uppercase tracking-widest text-on-surface-variant">
                  {featuredPreview.sourceDate && <span>{t('sourceDate', { date: featuredPreview.sourceDate })}</span>}
                  {featuredPreview.factCount && <span>{t('anchoredFacts', { count: featuredPreview.factCount })}</span>}
                </div>
              </div>
              <Link
                href={`/blog/${featuredPreview.slug}`}
                className="inline-flex items-center rounded-full border border-primary/40 px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
              >
                {t('readPreview')}
              </Link>
            </div>
          </GlassCard>
        </section>
      )}
      <MatchesClient
        fixtures={fixtures}
        groups={groups}
        teamsByGroup={teamsByGroup}
        teamsBySlug={teamsBySlug}
      />
    </>
  )
}
