import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import { getAllTeams, getTeamsByGroup, getAllGroups } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import CompareSelector from '@/components/compare/CompareSelector'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'comparePage' })
  return {
    title: t('heading'),
    description: t('description', { count: 1128 }),
    keywords:
      'World Cup 2026 team comparison, World Cup 2026 head to head, World Cup 2026 vs, compare World Cup teams, World Cup 2026 matchups',
    alternates: buildAlternates(locale, '/compare'),
  }
}

export default async function ComparePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('comparePage')
  const groups = getAllGroups()
  const teams = getAllTeams().sort((a, b) => a.slug.localeCompare(b.slug))
  const totalMatchups = (teams.length * (teams.length - 1)) / 2

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Team Comparisons',
    description: `Head-to-head comparisons for all ${totalMatchups} possible World Cup 2026 matchups.`,
    numberOfItems: totalMatchups,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{t('badge', { count: totalMatchups })}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-6">
            {t('heading')}<br />
            <span className="gradient-text">{t('badge', { count: totalMatchups })}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('description', { count: totalMatchups })}
          </p>
        </div>
      </section>

      {/* Group-by-group matchups */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {groups.map((group) => {
          const groupTeams = getTeamsByGroup(group).sort((a, b) => a.slug.localeCompare(b.slug))
          const matchups: Array<{ teamA: typeof groupTeams[0]; teamB: typeof groupTeams[0]; slug: string }> = []
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              const [a, b] = [groupTeams[i], groupTeams[j]].sort((x, y) => x.slug.localeCompare(y.slug))
              matchups.push({ teamA: a, teamB: b, slug: `${a.slug}-vs-${b.slug}` })
            }
          }

          return (
            <div key={group} className="mb-12">
              <SectionHeader className="mb-6">{`Group ${group}`}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchups.map(({ teamA, teamB, slug }) => (
                  <Link key={slug} href={`/compare/${slug}`}>
                    <GlassCard hover className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl">{teamA.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight truncate">{teamA.name}</span>
                        </div>
                        <span className="font-headline text-xs text-on-surface-variant mx-2 shrink-0">{t('vs')}</span>
                        <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                          <span className="text-2xl">{teamB.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight truncate text-right">{teamB.name}</span>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        {/* Cross-group featured matchups */}
        <div className="mb-12">
          <SectionHeader className="mb-6">{t('featuredCrossGroup')}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { a: 'argentina', b: 'brazil' },
              { a: 'argentina', b: 'france' },
              { a: 'brazil', b: 'germany' },
              { a: 'england', b: 'spain' },
              { a: 'france', b: 'germany' },
              { a: 'mexico', b: 'usa' },
              { a: 'brazil', b: 'france' },
              { a: 'argentina', b: 'england' },
              { a: 'japan', b: 'south-korea' },
            ].map(({ a, b }) => {
              const [sortedA, sortedB] = a.localeCompare(b) < 0 ? [a, b] : [b, a]
              const teamA = teams.find((t) => t.slug === sortedA)
              const teamB = teams.find((t) => t.slug === sortedB)
              if (!teamA || !teamB) return null
              const slug = `${sortedA}-vs-${sortedB}`
              return (
                <Link key={slug} href={`/compare/${slug}`}>
                  <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl">{teamA.flag}</span>
                        <span className="font-headline text-sm uppercase tracking-tight truncate">{teamA.name}</span>
                      </div>
                      <span className="font-headline text-xs text-on-surface-variant mx-2 shrink-0">{t('vs')}</span>
                      <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                        <span className="text-2xl">{teamB.flag}</span>
                        <span className="font-headline text-sm uppercase tracking-tight truncate text-right">{teamB.name}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Interactive team selector */}
        <div className="mb-16">
          <SectionHeader className="mb-6">{t('compareAny')}</SectionHeader>
          <p className="text-on-surface-variant text-sm mb-6">
            {t('compareAnyDesc', { count: totalMatchups })}
          </p>
          <CompareSelector
            teams={teams.map((t) => ({
              slug: t.slug,
              name: t.name,
              flag: t.flag,
              group: t.group,
              fifaRanking: t.fifaRanking,
            }))}
          />
        </div>

        {/* SEO-friendly full index — all 1128 matchups as crawlable links */}
        <details className="mb-12 glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
          <summary className="px-6 py-5 cursor-pointer font-headline text-lg uppercase tracking-wide text-on-surface hover:text-primary transition-colors flex items-center justify-between">
            <span>{t('browseMatchups', { count: totalMatchups })}</span>
            <svg className="w-5 h-5 text-on-surface-variant transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {teams.map((teamA, i) =>
                teams.slice(i + 1).map((teamB) => {
                  const slug = `${teamA.slug}-vs-${teamB.slug}`
                  return (
                    <Link
                      key={slug}
                      href={`/compare/${slug}`}
                      className="rounded-lg border border-white/[0.04] px-3 py-2 flex items-center justify-between hover:border-white/15 hover:bg-white/[0.02] transition-all text-sm"
                    >
                      <span className="flex items-center gap-1.5 min-w-0 truncate">
                        <span>{teamA.flag}</span>
                        <span className="font-headline text-xs uppercase tracking-tight truncate">{teamA.name}</span>
                      </span>
                      <span className="text-on-surface-variant text-xs mx-1.5 shrink-0">{t('vs')}</span>
                      <span className="flex items-center gap-1.5 min-w-0 truncate flex-row-reverse">
                        <span>{teamB.flag}</span>
                        <span className="font-headline text-xs uppercase tracking-tight truncate text-right">{teamB.name}</span>
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </details>
      </section>
    </>
  )
}
