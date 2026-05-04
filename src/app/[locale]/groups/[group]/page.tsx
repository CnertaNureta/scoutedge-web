import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import fs from 'fs'
import path from 'path'
import { getAllGroups, getTeamsByGroup, getPlayersByTeam, getFixturesByGroup, getTeamBySlug } from '@/lib/data-service'
import { GROUP_SEO_META } from '@/data/seo-meta'
import type { MatchFixture } from '@/lib/types'
import TeamCard from '@/components/team/TeamCard'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import { OG_LOCALES, canonicalForLocale } from '@/lib/og-utils'

interface PageProps {
  params: Promise<{ locale: string; group: string }>
}

export async function generateStaticParams() {
  return getAllGroups().map((g) => ({ group: g }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, group } = await params
  const teams = getTeamsByGroup(group)
  if (teams.length === 0) return { title: 'Group Not Found' }

  const teamNames = teams.map((t) => t.name).join(', ')
  const seo = GROUP_SEO_META[group.toUpperCase()]
  const seoTitle = seo?.title?.replace(/ \| KickOracle$/, '') ?? null

  return {
    title: seoTitle ?? `Group ${group} Analysis — World Cup 2026 | ${teamNames}`,
    description: seo?.description ?? `In-depth AI analysis of World Cup 2026 Group ${group}: ${teamNames}. Squad chemistry, FIFA rankings, tactical profiles, and prediction breakdowns.`,
    keywords: `World Cup 2026 Group ${group}, ${teamNames} World Cup 2026, Group ${group} analysis, World Cup 2026 predictions`,
    openGraph: {
      title: seo?.ogTitle ?? `World Cup 2026 Group ${group} — AI Analysis & Predictions`,
      description: `Group ${group}: ${teamNames}. AI-powered squad analysis, chemistry indexes, and match predictions.`,
      type: 'article',
      locale: OG_LOCALES[locale] ?? 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `World Cup 2026 Group ${group} | KickOracle`,
      description: `AI analysis of Group ${group}: ${teamNames}.`,
    },
    alternates: { canonical: canonicalForLocale(locale, `/groups/${group}`) },
  }
}

function getGroupStats(group: string) {
  const teams = getTeamsByGroup(group)
  const avgChemistry = Math.round(teams.reduce((s, t) => s + t.chemistry, 0) / teams.length)
  const avgRanking = Math.round(teams.reduce((s, t) => s + t.fifaRanking, 0) / teams.length)
  const totalPlayers = teams.reduce((s, t) => s + getPlayersByTeam(t.slug).length, 0)
  const topRanked = teams.reduce((best, t) => (t.fifaRanking < best.fifaRanking ? t : best), teams[0])
  return { avgChemistry, avgRanking, totalPlayers, topRanked }
}

function MatchFixtureCard({ fixture, locale }: { fixture: MatchFixture; locale: string }) {
  const homeTeam = getTeamBySlug(fixture.homeTeamSlug)
  const awayTeam = getTeamBySlug(fixture.awayTeamSlug)
  if (!homeTeam || !awayTeam) return null

  const date = new Date(fixture.kickoffUtc)
  const dateStr = date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{dateStr}</span>
        <span className="font-mono text-[10px] text-on-surface-variant">{timeStr}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/teams/${homeTeam.slug}`} className="flex items-center gap-2 group flex-1 min-w-0">
          <span className="text-xl shrink-0">{homeTeam.flag}</span>
          <span className="font-headline text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate">{homeTeam.name}</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-xs font-bold text-primary w-8 text-right">{Math.round(fixture.homeWinProb * 100)}%</span>
          <span className="font-mono text-[10px] text-on-surface-variant px-1">vs</span>
          <span className="font-mono text-xs font-bold text-primary w-8">{Math.round(fixture.awayWinProb * 100)}%</span>
        </div>
        <Link href={`/teams/${awayTeam.slug}`} className="flex items-center gap-2 group flex-1 min-w-0 justify-end">
          <span className="font-headline text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate">{awayTeam.name}</span>
          <span className="text-xl shrink-0">{awayTeam.flag}</span>
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-label text-[10px] text-on-surface-variant">{fixture.venue}, {fixture.city}</span>
        <span className="font-mono text-[10px] text-on-surface-variant">Draw {Math.round(fixture.drawProb * 100)}%</span>
      </div>
    </GlassCard>
  )
}

function getCompetitivenessLabel(avgRanking: number): string {
  if (avgRanking <= 15) return 'Group of Death'
  if (avgRanking <= 30) return 'Highly Competitive'
  if (avgRanking <= 50) return 'Balanced'
  return 'Open'
}

export default async function GroupPage({ params }: PageProps) {
  const { locale, group } = await params
  const teams = getTeamsByGroup(group)
  if (teams.length === 0) notFound()

  const allGroups = getAllGroups()
  const stats = getGroupStats(group)
  const competitiveness = getCompetitivenessLabel(stats.avgRanking)

  const sortedTeams = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking)
  const fixtures = getFixturesByGroup(group)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `World Cup 2026 Group ${group}`,
    description: `Analysis of Group ${group} in the 2026 FIFA World Cup featuring ${teams.map((t) => t.name).join(', ')}`,
    numberOfItems: teams.length,
    hasPart: teams.map((t) => ({
      '@type': 'SportsTeam',
      name: t.name,
      url: `https://kickoracle.com/teams/${t.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-[1440px] mx-auto px-6 pt-6 pb-2">
        <ol className="flex items-center gap-2 font-label text-sm font-bold uppercase tracking-widest">
          <li>
            <Link href="/teams" className="text-on-surface-variant hover:text-primary transition-colors">
              All Teams
            </Link>
          </li>
          <li className="text-outline-variant" aria-hidden="true">&rarr;</li>
          <li>
            <span className="text-on-surface" aria-current="page">Group {group}</span>
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative py-16 md:py-24 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="primary" size="md">World Cup 2026</Badge>
          <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter uppercase mt-4 mb-2">
            Group <span className="text-primary">{group}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-8">
            {teams.map((t) => `${t.flag} ${t.name}`).join('  ·  ')}
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <GlassCard className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-primary">{stats.avgRanking}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">Avg FIFA Rank</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-primary">{stats.avgChemistry}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">Avg Chemistry</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-primary">{stats.totalPlayers}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">Total Players</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-secondary">{competitiveness}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">Difficulty</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Standings Table */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
            Standings Preview
          </span>
        </h2>
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4">#</th>
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4">Team</th>
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4 text-center">FIFA Rank</th>
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4 text-center hidden sm:table-cell">Confederation</th>
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4 text-center hidden md:table-cell">Morale</th>
                  <th className="font-label text-xs text-on-surface-variant uppercase tracking-widest px-6 py-4 min-w-[160px]">Chemistry</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, i) => (
                  <tr
                    key={team.slug}
                    className="border-b border-white/5 hover:bg-surface-container-high transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">{i + 1}</td>
                    <td className="px-6 py-4">
                      <Link href={`/teams/${team.slug}`} className="flex items-center gap-3 group">
                        <span className="text-2xl">{team.flag}</span>
                        <div>
                          <span className="font-headline text-base font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
                            {team.name}
                          </span>
                          <span className="block font-label text-xs text-on-surface-variant">{team.coachName}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-sm font-bold">#{team.fifaRanking}</span>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <span className="font-label text-xs text-on-surface-variant">{team.confederation}</span>
                    </td>
                    <td className="px-6 py-4 text-center hidden md:table-cell">
                      <span className="font-mono text-sm font-bold">{team.morale}</span>
                    </td>
                    <td className="px-6 py-4">
                      <ChemistryBar value={team.chemistry} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      {/* Match Schedule */}
      {fixtures.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
            <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
              Match Schedule
            </span>
          </h2>
          <div className="space-y-3">
            {(['Match Day 1', 'Match Day 2', 'Match Day 3'] as const).map((round) => {
              const roundFixtures = fixtures.filter((f) => f.round === round)
              if (roundFixtures.length === 0) return null
              return (
                <div key={round}>
                  <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    {round}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {roundFixtures.map((fixture) => (
                      <MatchFixtureCard key={`${fixture.homeTeamSlug}-${fixture.awayTeamSlug}`} fixture={fixture} locale={locale} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Qualification Scenarios */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-label text-sm">
            Qualification Scenarios
          </span>
        </h2>
        <GlassCard className="p-6 md:p-8">
          <div className="space-y-4">
            <p className="font-body text-sm text-on-surface-variant">
              In the 2026 World Cup format, the <strong className="text-on-surface">top 2 teams</strong> from each group advance automatically, plus the <strong className="text-on-surface">best 8 third-placed teams</strong> across all 12 groups.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="font-mono text-2xl font-bold text-green-400">1st–2nd</p>
                <p className="font-label text-xs text-green-400/80 uppercase tracking-widest mt-1">Auto-Qualify</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                <p className="font-mono text-2xl font-bold text-yellow-400">3rd</p>
                <p className="font-label text-xs text-yellow-400/80 uppercase tracking-widest mt-1">May Qualify</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <p className="font-mono text-2xl font-bold text-red-400">4th</p>
                <p className="font-label text-xs text-red-400/80 uppercase tracking-widest mt-1">Eliminated</p>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {sortedTeams.map((team, i) => {
                const scenario = i === 0
                  ? 'Favored to top the group. A win on Match Day 1 could seal their path early.'
                  : i === 1
                  ? 'Strong contender for automatic qualification. Results against the group favorite are key.'
                  : i === 2
                  ? 'Needs at least one upset to have a realistic shot at the knockout round via 3rd place.'
                  : 'Faces an uphill battle. Must maximize points from every match to avoid early elimination.'
                return (
                  <div key={team.slug} className="flex items-start gap-3 bg-surface-container-low rounded-lg p-3">
                    <span className="text-xl shrink-0">{team.flag}</span>
                    <div>
                      <span className="font-headline text-sm font-bold uppercase tracking-tight">{team.name}</span>
                      <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full font-label text-[10px] font-bold uppercase tracking-widest ${
                        i < 2 ? 'bg-green-500/20 text-green-400' : i === 2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        #{i + 1} Projected
                      </span>
                      <p className="font-body text-xs text-on-surface-variant mt-1">{scenario}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Team Cards */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
            Team Profiles
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedTeams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* Group Analysis Content */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
            AI Analysis
          </span>
        </h2>
        <GlassCard className="p-8 md:p-12">
          <div className="prose prose-invert prose-lg max-w-none">
            <h3>Group {group} Overview</h3>
            <p>
              Group {group} features {teams.map((t) => t.name).join(', ')} in what is rated as a{' '}
              <strong>{competitiveness.toLowerCase()}</strong> group. The favorite by FIFA ranking is{' '}
              <strong>{stats.topRanked.flag} {stats.topRanked.name}</strong> (#{stats.topRanked.fifaRanking}),
              but our AI chemistry analysis reveals a more nuanced picture.
            </p>

            <h3>Key Matchups to Watch</h3>
            <ul>
              {sortedTeams.length >= 2 && (
                <li>
                  <strong>{sortedTeams[0].flag} {sortedTeams[0].name} vs {sortedTeams[1].flag} {sortedTeams[1].name}</strong>
                  {' '}&mdash; The top-two ranked sides clash in what could decide the group winner. Chemistry indexes of{' '}
                  {sortedTeams[0].chemistry} and {sortedTeams[1].chemistry} suggest a tight contest.
                </li>
              )}
              {sortedTeams.length >= 4 && (
                <li>
                  <strong>{sortedTeams[2].flag} {sortedTeams[2].name} vs {sortedTeams[3].flag} {sortedTeams[3].name}</strong>
                  {' '}&mdash; A crucial match for qualification hopes between the underdogs.
                </li>
              )}
            </ul>

            <h3>Chemistry Breakdown</h3>
            <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              {sortedTeams.map((team) => (
                <div key={team.slug} className="bg-surface-container-low rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{team.flag}</span>
                    <span className="font-headline text-sm font-bold uppercase tracking-tight">{team.name}</span>
                  </div>
                  <div className="space-y-2">
                    <ChemistryBar value={team.familiarity} label="Familiarity" size="sm" />
                    <ChemistryBar value={team.stability} label="Stability" size="sm" />
                    <ChemistryBar value={team.morale} label="Morale" size="sm" />
                    <ChemistryBar value={team.chemistry} label="Overall" size="sm" />
                  </div>
                </div>
              ))}
            </div>

            <h3>Prediction</h3>
            <p>
              Based on our AI analysis combining FIFA rankings, squad chemistry, and recent form signals,
              the most likely qualification order is:{' '}
              {sortedTeams.map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && ', '}
                  <strong>{i + 1}. {t.flag} {t.name}</strong>
                </span>
              ))}.
              {sortedTeams.length >= 3 && (
                <>{' '}However, with a top-3 format in this expanded World Cup, {sortedTeams[2].name} has
                a realistic path to the knockout stage as a potential third-place qualifier.</>
              )}
            </p>
          </div>
        </GlassCard>
      </section>

      {/* Group Analysis Article */}
      {(() => {
        try {
          const articlePath = path.join(process.cwd(), 'src/content/groups', `group-${group.toLowerCase()}-world-cup-2026-analysis.md`)
          const raw = fs.readFileSync(articlePath, 'utf8')
          const bodyStart = raw.indexOf('---', raw.indexOf('---') + 3) + 3
          const body = raw.slice(bodyStart).trim()
          const paragraphs = body.split(/\n\n+/).filter((p: string) => !p.startsWith('---') && !p.startsWith('|') && p.trim().length > 0)
          const textParagraphs = paragraphs.filter((p: string) => !p.startsWith('#')).slice(0, 6)
          if (textParagraphs.length === 0) return null
          return (
            <section className="max-w-[1440px] mx-auto px-6 mb-16">
              <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
                Group {group} Deep Analysis
              </h2>
              <GlassCard className="p-8 md:p-12">
                <div className="space-y-4">
                  {textParagraphs.map((p: string, i: number) => (
                    <p key={i} className="text-on-surface-variant text-sm md:text-base leading-relaxed">{p}</p>
                  ))}
                </div>
              </GlassCard>
            </section>
          )
        } catch { return null }
      })()}

      {/* Other Groups Navigation */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
          Other Groups
        </h2>
        <div className="flex flex-wrap gap-2">
          {allGroups
            .filter((g) => g !== group)
            .map((g) => {
              const groupTeams = getTeamsByGroup(g)
              return (
                <Link
                  key={g}
                  href={`/groups/${g}`}
                  className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 hover:border-outline-variant/30 rounded-lg px-4 py-3 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <span className="font-headline text-sm font-bold uppercase tracking-tight">Group {g}</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">
                    {groupTeams.map((t) => t.flag).join(' ')}
                  </span>
                </Link>
              )
            })}
        </div>
      </section>
    </>
  )
}
