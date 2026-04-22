import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getTeamsPageData } from '@/lib/site-data'
import TeamCard from '@/components/team/TeamCard'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'teamsPage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords: 'World Cup 2026 teams, World Cup 2026 groups, World Cup 2026 squads, FIFA World Cup 2026 predictions, World Cup 2026 analysis',
    alternates: { canonical: 'https://kickoracle.com/teams' },
  }
}

export default async function TeamsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('teamsPage')
  const { groups, teamsByGroup, totalTeams } = await getTeamsPageData()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Teams',
    description: 'All 48 teams competing in the 2026 FIFA World Cup',
    numberOfItems: totalTeams,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <h1 className="font-headline text-6xl md:text-8xl tracking-wide uppercase mb-6">
            <span className="gradient-text">{t('heading')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
      </section>

      {/* Groups */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {groups.map((group) => {
          const teams = teamsByGroup[group] ?? []
          return (
            <div key={group} className="mb-14">
              <h2 className="font-headline text-2xl tracking-wide uppercase mb-6 flex items-center gap-3">
                <span className="bg-primary/15 text-primary border border-primary/20 px-5 py-1.5 rounded-full font-label text-sm font-semibold tracking-widest">
                  {t('group', { group })}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {teams.map((team) => (
                  <TeamCard key={team.slug} team={team} />
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
