import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { canonicalForLocale, breadcrumbJsonLd, itemListJsonLd, jsonLdGraph, faqPageJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { getTeamsPageData } from '@/lib/site-data'
import { Link } from '@/i18n/navigation'
import { TEAMS_FAQS } from '@/data/faq-content'
import FaqSection from '@/components/ui/FaqSection'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'teamsPage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords: 'World Cup 2026 teams, World Cup 2026 groups, World Cup 2026 squads, FIFA World Cup 2026 predictions, World Cup 2026 analysis',
    alternates: buildAlternates(locale, '/teams'),
  }
}

export default async function TeamsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('teamsPage')
  const { groups, teamsByGroup, totalTeams } = await getTeamsPageData()

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Teams',
    description: 'All 48 teams competing in the 2026 FIFA World Cup',
    numberOfItems: totalTeams,
    url: canonicalForLocale(locale, '/teams'),
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Teams', url: canonicalForLocale(locale, '/teams') },
  ])

  const allTeamsFlat = groups.flatMap((g) => teamsByGroup[g] ?? [])
  const teamsList = itemListJsonLd(
    allTeamsFlat.map((team) => ({
      name: team.name,
      url: canonicalForLocale(locale, `/teams/${team.slug}`),
      description: `Group ${team.group} · FIFA #${team.fifaRanking} · ${team.confederation}`,
    })),
    {
      name: 'World Cup 2026 — All 48 Teams',
      description: 'Every nation qualified for the 2026 FIFA World Cup, grouped by their first-round group.',
      url: canonicalForLocale(locale, '/teams'),
    }
  )

  const jsonLd = jsonLdGraph([collectionLd, breadcrumbs, teamsList, faqPageJsonLd(TEAMS_FAQS)])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Editorial header */}
      <section className="relative border-b border-white/[0.08] px-6 md:px-14 pt-14 md:pt-20 pb-10 md:pb-14 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-60" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <div>
            <div className="font-label text-xs tracking-[0.22em] uppercase text-primary mb-4">
              ★ THE FIELD · {totalTeams} FEDERATIONS
            </div>
            <h1 className="font-headline text-6xl md:text-[7rem] xl:text-[8rem] leading-[0.92] uppercase tracking-wide">
              <span className="block">{t('heading')}</span>
            </h1>
            <p className="font-headline italic text-xl md:text-2xl text-primary/90 mt-8 max-w-xl">
              {t('description')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-on-surface-variant">
              WORLD CUP 2026 · {groups.length} GROUPS
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-on-surface-variant/70 mt-1">
              ISSUE 14 · UPDATED LIVE
            </div>
          </div>
        </div>
      </section>

      {/* Groups grid — magazine-style */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-14 py-12 md:py-16">
        <div className="flex items-baseline justify-between mb-6">
          <div className="font-label text-xs tracking-[0.22em] uppercase text-on-surface-variant">
            GROUP STAGE · {totalTeams} TEAMS
          </div>
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-on-surface-variant/70 hidden sm:block">
            ↑ TOP TWO ADVANCE PER GROUP
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08] border border-white/[0.08]">
          {groups.map((group) => {
            const teams = teamsByGroup[group] ?? []
            return (
              <div key={group} className="bg-surface-container p-6 min-h-[380px] flex flex-col">
                <div className="flex items-baseline justify-between mb-5">
                  <div className="leading-none">
                    <em className="font-headline not-italic text-primary text-3xl">Group</em>
                    <div className="font-headline text-7xl leading-[0.8] mt-1">{group}</div>
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-on-surface-variant/70">
                    MD 1–3
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {teams.map((team, i) => (
                    <Link
                      key={team.slug}
                      data-testid="team-card"
                      href={`/teams/${team.slug}`}
                      className={`group/row flex items-center gap-3 pl-2 pr-2.5 py-2 border-l-[3px] transition-colors hover:bg-primary/15 ${
                        i < 2
                          ? 'bg-primary/[0.08] border-primary'
                          : 'bg-white/[0.04] border-transparent'
                      }`}
                    >
                      <span className="font-label text-[11px] font-bold text-on-surface-variant/70 w-4 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-xl leading-none shrink-0">{team.flag}</span>
                      <span className="font-label font-bold text-sm flex-1 tracking-wider uppercase truncate group-hover/row:text-primary transition-colors">
                        {team.name}
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-on-surface-variant/80 shrink-0 hidden sm:inline">
                        <span data-testid="team-group-code">{team.group}</span>
                        <span className="opacity-40 mx-1">·</span>
                        #<span data-testid="team-fifa-ranking">{team.fifaRanking}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-white/15">
                  <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-on-surface-variant/70">
                    ↑ TWO ADVANCE
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <FaqSection items={TEAMS_FAQS} heading="World Cup 2026 Teams — FAQ" />
    </>
  )
}
