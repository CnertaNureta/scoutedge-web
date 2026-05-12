import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { canonicalForLocale } from '@/lib/og-utils'
import { Link } from '@/i18n/navigation'
import { getAllTeams } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import type { Team } from '@/lib/types'
import { OG_LOCALES } from '@/lib/og-utils'
import { computePowerScore } from '@/lib/power-rankings-stub'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'powerRankingsPage' })
  return {
    title: t('heading'),
    description: t('description'),
    openGraph: {
      title: t('heading'),
      description: t('description'),
      type: 'article',
      locale: OG_LOCALES[locale] ?? 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('heading'),
      description: t('description'),
    },
    alternates: { canonical: canonicalForLocale(locale, '/power-rankings') },
  }
}

function getMovement(currentRank: number, fifaRanking: number): 'up' | 'down' | 'same' {
  const diff = fifaRanking - currentRank
  if (diff > 2) return 'up'
  if (diff < -2) return 'down'
  return 'same'
}

interface RankedTeam extends Team {
  powerScore: number
  rank: number
}

interface Tier {
  name: string
  variant: 'primary' | 'secondary' | 'tertiary' | 'outline'
  teams: RankedTeam[]
}

function groupIntoTiers(rankedTeams: RankedTeam[], t: (key: string) => string): Tier[] {
  const tiers: Tier[] = [
    { name: t('titleContenders'), variant: 'primary', teams: [] },
    { name: t('darkHorses'), variant: 'tertiary', teams: [] },
    { name: t('competitive'), variant: 'outline', teams: [] },
    { name: t('underdogs'), variant: 'outline', teams: [] },
  ]

  for (const team of rankedTeams) {
    if (team.rank <= 6) tiers[0].teams.push(team)
    else if (team.rank <= 16) tiers[1].teams.push(team)
    else if (team.rank <= 32) tiers[2].teams.push(team)
    else tiers[3].teams.push(team)
  }

  return tiers.filter((tier) => tier.teams.length > 0)
}

function RankingRow({ team, t }: { team: RankedTeam; t: (key: string) => string }) {
  const movement = getMovement(team.rank, team.fifaRanking)

  return (
    <tr className="border-b border-white/5 hover:bg-surface-container-high transition-colors group">
      <td className="px-4 md:px-6 py-3 font-mono text-sm font-bold text-on-surface-variant">{team.rank}</td>
      <td className="px-4 md:px-6 py-3">
        <Link href={`/teams/${team.slug}`} className="flex items-center gap-3">
          <span className="text-2xl">{team.flag}</span>
          <span className="font-headline text-base font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
            {team.name}
          </span>
        </Link>
      </td>
      <td className="px-4 md:px-6 py-3 text-center hidden sm:table-cell">
        <span className="font-mono text-sm">#{team.fifaRanking}</span>
      </td>
      <td className="px-4 md:px-6 py-3 text-center hidden md:table-cell">
        <Link href={`/groups/${team.group}`} className="font-label text-xs hover:text-primary transition-colors">
          {team.group}
        </Link>
      </td>
      <td className="px-4 md:px-6 py-3 text-center">
        <span className="font-mono text-sm font-bold">{team.powerScore}</span>
      </td>
      <td className="px-4 md:px-6 py-3 text-center">
        {movement === 'up' && <span className="text-green-400" aria-label={t('trendUp')}>&#9650;</span>}
        {movement === 'down' && <span className="text-red-400" aria-label={t('trendDown')}>&#9660;</span>}
        {movement === 'same' && <span className="text-on-surface-variant" aria-label={t('trendSame')}>&#9644;</span>}
      </td>
      <td className="px-4 md:px-6 py-3 hidden lg:table-cell">
        <ChemistryBar value={team.chemistry} showValue={false} size="sm" />
      </td>
    </tr>
  )
}

export default async function PowerRankingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('powerRankingsPage')
  const teams = getAllTeams()
  const rankedTeams: RankedTeam[] = teams
    .map((team) => ({
      ...team,
      powerScore: computePowerScore(team),
      rank: 0,
    }))
    .sort((a, b) => b.powerScore - a.powerScore)
    .map((team, i) => ({ ...team, rank: i + 1 }))

  const tiers = groupIntoTiers(rankedTeams, t)

  const lastUpdated = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'World Cup 2026 Power Rankings',
    description: 'AI-powered ranking of all 48 World Cup 2026 teams',
    datePublished: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'KickOracle',
      url: 'https://kickoracle.com',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-tertiary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="tertiary" size="md">{t('badge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase mt-4 mb-4">
            {t('heading')}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-4">
            {t('description')}
          </p>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
            {t('lastUpdated', { date: lastUpdated })}
          </p>
        </div>
      </section>

      {/* Top 3 Spotlight */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankedTeams.slice(0, 3).map((team, i) => (
            <Link key={team.slug} href={`/teams/${team.slug}`} className="group">
              <GlassCard className="p-6 md:p-8 text-center hover:bg-surface-bright transition-all duration-300 hover:-translate-y-1" hover>
                <div className="text-5xl mb-3">{team.flag}</div>
                <span className={`inline-block font-mono text-sm font-bold px-3 py-1 rounded-full mb-3 ${
                  i === 0 ? 'bg-tertiary text-on-tertiary' : i === 1 ? 'bg-surface-container-highest text-on-surface' : 'bg-secondary-container text-on-secondary-container'
                }`}>
                  #{i + 1}
                </span>
                <h2 className="font-headline text-2xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
                  {team.name}
                </h2>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1 mb-4">
                  {t('groupLabel', { group: team.group })} &middot; {t('fifaRank', { rank: `#${team.fifaRanking}` })}
                </p>
                <div className="text-center mb-2">
                  <span className="font-mono text-4xl font-bold text-primary">{team.powerScore}</span>
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest block mt-1">{t('powerScore')}</span>
                </div>
                <ChemistryBar value={team.chemistry} label={t('chemistry')} size="sm" />
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Full Rankings by Tier */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20 space-y-8">
        {tiers.map((tier) => (
          <div key={tier.name}>
            <div className="mb-3">
              <Badge variant={tier.variant} size="md">{tier.name}</Badge>
            </div>
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 w-12">{t('rank')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3">{t('team')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 text-center hidden sm:table-cell">{t('fifa')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 text-center hidden md:table-cell">{t('group')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 text-center">{t('score')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 text-center w-12">{t('trend')}</th>
                      <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-4 md:px-6 py-3 min-w-[120px] hidden lg:table-cell">{t('chemistry')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier.teams.map((team) => (
                      <RankingRow key={team.slug} team={team} t={t} />
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ))}
      </section>
    </>
  )
}
