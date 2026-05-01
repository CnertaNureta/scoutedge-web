import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getAllMatchupSlugs, getHeadToHead } from '@/lib/compare-utils'
import { getTeamBySlug } from '@/lib/data-service'
import { getH2H } from '@/data/h2h-history'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { HOST_CITIES } from '@/data/cities-data'
import { jsonLdGraph, sportsEventJsonLd } from '@/lib/og-utils'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import ChemistryBar from '@/components/ui/ChemistryBar'
import ProbabilityBar from '@/components/ui/ProbabilityBar'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { BRAND } from '@/lib/brand-tokens'

export async function generateMetadata({ params }: { params: Promise<{ matchup: string }> }): Promise<Metadata> {
  const { matchup } = await params
  const parts = matchup.split('-vs-')
  const teamA = getTeamBySlug(parts[0])
  const teamB = getTeamBySlug(parts[1])
  const nameA = teamA?.name ?? parts[0]
  const nameB = teamB?.name ?? parts[1]

  const title = `${nameA} vs ${nameB}: World Cup 2026 Head-to-Head Comparison`
  const description = `AI-powered comparison of ${nameA} vs ${nameB} at the 2026 FIFA World Cup. Win probabilities, squad stats, chemistry indexes, key player matchups, and tactical analysis.`

  return {
    title,
    description,
    keywords: `${nameA} vs ${nameB}, ${nameA} vs ${nameB} World Cup 2026, World Cup 2026 prediction, ${nameA} World Cup 2026, ${nameB} World Cup 2026`,
    alternates: { canonical: `https://kickoracle.com/compare/${matchup}` },
    openGraph: {
      title,
      description,
      url: `https://kickoracle.com/compare/${matchup}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function StatRow({ label, valueA, valueB, higherIsBetter = true }: { label: string; valueA: number; valueB: number; higherIsBetter?: boolean }) {
  const aWins = higherIsBetter ? valueA > valueB : valueA < valueB
  const bWins = higherIsBetter ? valueB > valueA : valueB < valueA
  const tied = valueA === valueB
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3 border-b border-white/[0.04]">
      <div className="text-right">
        <span className={`font-mono text-lg font-bold ${aWins ? 'text-primary' : tied ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {valueA}
        </span>
      </div>
      <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest text-center min-w-[100px]">
        {label}
      </span>
      <div>
        <span className={`font-mono text-lg font-bold ${bWins ? 'text-primary' : tied ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {valueB}
        </span>
      </div>
    </div>
  )
}

export default async function CompareDetailPage({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params
  const data = getHeadToHead(matchup)
  if (!data) return <div className="page-container py-20 text-center text-on-surface-variant">Matchup not found.</div>

  const { teamA, teamB, prediction, statDeltas, squadA, squadB, keyPlayerMatchups, historyA, historyB, verdict } = data

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${teamA.name} vs ${teamB.name}: World Cup 2026 Head-to-Head`,
    description: `AI comparison of ${teamA.name} and ${teamB.name} for the 2026 World Cup.`,
    author: { '@type': 'Organization', name: 'KickOracle' },
  }

  // Look for an actual scheduled fixture between the two teams (group stage)
  const scheduledFixture = MATCH_FIXTURES.find(
    (f) =>
      (f.homeTeamSlug === teamA.slug && f.awayTeamSlug === teamB.slug) ||
      (f.homeTeamSlug === teamB.slug && f.awayTeamSlug === teamA.slug)
  )

  const sportsEventLd = scheduledFixture
    ? sportsEventJsonLd({
        homeName: scheduledFixture.homeTeamSlug === teamA.slug ? teamA.name : teamB.name,
        awayName: scheduledFixture.homeTeamSlug === teamA.slug ? teamB.name : teamA.name,
        homeSlug: scheduledFixture.homeTeamSlug,
        awaySlug: scheduledFixture.awayTeamSlug,
        venue: scheduledFixture.venue,
        city: scheduledFixture.city,
        countryCode: HOST_CITIES.find((c) => c.name === scheduledFixture.city)?.countryCode,
        kickoffUtc: scheduledFixture.kickoffUtc,
      })
    : null

  const jsonLd = jsonLdGraph(sportsEventLd ? [articleLd, sportsEventLd] : [articleLd])

  // Related matchups: other comparisons involving either team
  const allSlugs = getAllMatchupSlugs()
  const related = allSlugs
    .filter((s) => s !== matchup && (s.includes(teamA.slug) || s.includes(teamB.slug)))
    .slice(0, 6)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Predictions', href: '/predictions' },
          { name: 'Compare', href: '/compare' },
          { name: `${teamA.name} vs ${teamB.name}`, href: `/compare/${matchup}` },
        ]}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[150px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" size="md">Head-to-Head Comparison</Badge>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12">
            {/* Team A */}
            <Link href={`/teams/${teamA.slug}`} className="text-center group">
              <div className="text-6xl md:text-8xl mb-3">{teamA.flag}</div>
              <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide group-hover:text-primary transition-colors">{teamA.name}</h2>
              <div className="flex justify-center gap-3 mt-2">
                <Badge variant="primary" size="sm">#{teamA.fifaRanking}</Badge>
                <Badge variant="outline" size="sm">Group {teamA.group}</Badge>
              </div>
            </Link>

            {/* VS */}
            <div className="flex flex-col items-center">
              <span className="font-headline text-4xl md:text-6xl text-on-surface-variant tracking-tighter">VS</span>
            </div>

            {/* Team B */}
            <Link href={`/teams/${teamB.slug}`} className="text-center group">
              <div className="text-6xl md:text-8xl mb-3">{teamB.flag}</div>
              <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide group-hover:text-primary transition-colors">{teamB.name}</h2>
              <div className="flex justify-center gap-3 mt-2">
                <Badge variant="primary" size="sm">#{teamB.fifaRanking}</Badge>
                <Badge variant="outline" size="sm">Group {teamB.group}</Badge>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-6 pb-20 space-y-12">

        {/* AI Summary — plain language */}
        <GlassCard className="p-6 md:p-8 relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <h3 className="font-headline text-xl uppercase tracking-wide mb-4">The Bottom Line</h3>
          <p className="text-on-surface leading-relaxed text-lg">{verdict}</p>
        </GlassCard>

        {/* Who Wins? */}
        <GlassCard className="p-6 md:p-8">
          <h3 className="font-headline text-xl uppercase tracking-wide mb-2 text-center">Who Wins?</h3>
          <p className="text-on-surface-variant text-sm text-center mb-6">Our AI model weighs form, squad quality, and team cohesion to predict the most likely outcome.</p>
          <ProbabilityBar
            homeProb={prediction.teamAWin}
            drawProb={prediction.draw}
            awayProb={prediction.teamBWin}
            homeLabel={teamA.name}
            awayLabel={teamB.name}
          />
        </GlassCard>

        {/* Stat Comparison with explanations */}
        <GlassCard className="p-6 md:p-8">
          <h3 className="font-headline text-xl uppercase tracking-wide mb-2 text-center">How They Compare</h3>
          <p className="text-on-surface-variant text-sm text-center mb-6">A side-by-side look at the key factors that could decide this matchup. Higher is better (except FIFA Ranking, where lower = stronger).</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
            <div className="text-right font-headline text-sm uppercase tracking-wide text-primary">{teamA.name}</div>
            <div />
            <div className="font-headline text-sm uppercase tracking-wide text-primary">{teamB.name}</div>
          </div>
          <StatRow label="FIFA Ranking" valueA={teamA.fifaRanking} valueB={teamB.fifaRanking} higherIsBetter={false} />
          <StatRow label="Chemistry" valueA={teamA.chemistry} valueB={teamB.chemistry} />
          <StatRow label="Familiarity" valueA={teamA.familiarity} valueB={teamB.familiarity} />
          <StatRow label="Stability" valueA={teamA.stability} valueB={teamB.stability} />
          <StatRow label="Morale" valueA={teamA.morale} valueB={teamB.morale} />
          <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="font-label text-xs text-primary uppercase tracking-widest font-semibold mb-3">What do these mean?</p>
            <ul className="space-y-2 text-sm text-on-surface-variant leading-relaxed">
              <li><span className="text-on-surface font-semibold">Chemistry</span> — How well the squad plays together as a unit. Think Barcelona&apos;s tiki-taka vs a random group of all-stars.</li>
              <li><span className="text-on-surface font-semibold">Familiarity</span> — How long these players have been playing together. Squads with years of shared experience read each other&apos;s runs instinctively.</li>
              <li><span className="text-on-surface font-semibold">Stability</span> — How consistent the tactical system and lineup have been. Frequent coaching changes and formation experiments hurt this score.</li>
              <li><span className="text-on-surface font-semibold">Morale</span> — The squad&apos;s current confidence and momentum. Recent wins, fan support, and media positivity all contribute.</li>
            </ul>
          </div>
        </GlassCard>

        {/* Chemistry Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{teamA.flag}</span>
              <h3 className="font-headline text-lg uppercase tracking-wide">{teamA.name}</h3>
            </div>
            <div className="space-y-3">
              <ChemistryBar value={teamA.chemistry} label="Chemistry" />
              <ChemistryBar value={teamA.familiarity} label="Familiarity" />
              <ChemistryBar value={teamA.stability} label="Stability" />
              <ChemistryBar value={teamA.morale} label="Morale" />
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{teamB.flag}</span>
              <h3 className="font-headline text-lg uppercase tracking-wide">{teamB.name}</h3>
            </div>
            <div className="space-y-3">
              <ChemistryBar value={teamB.chemistry} label="Chemistry" />
              <ChemistryBar value={teamB.familiarity} label="Familiarity" />
              <ChemistryBar value={teamB.stability} label="Stability" />
              <ChemistryBar value={teamB.morale} label="Morale" />
            </div>
          </GlassCard>
        </div>

        {/* Squad Comparison */}
        <GlassCard className="p-6 md:p-8">
          <h3 className="font-headline text-xl uppercase tracking-wide mb-6 text-center">Squad Comparison</h3>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
            <div className="text-right font-headline text-sm uppercase tracking-wide text-primary">{teamA.name}</div>
            <div />
            <div className="font-headline text-sm uppercase tracking-wide text-primary">{teamB.name}</div>
          </div>
          <StatRow label="Squad Size" valueA={squadA.count} valueB={squadB.count} />
          <StatRow label="Avg Rating" valueA={squadA.avgRating} valueB={squadB.avgRating} />
          <StatRow label="Total Caps" valueA={squadA.totalCaps} valueB={squadB.totalCaps} />
          <StatRow label="Total Goals" valueA={squadA.totalGoals} valueB={squadB.totalGoals} />
        </GlassCard>

        {/* Key Player Matchups */}
        {keyPlayerMatchups.length > 0 && (
          <div>
            <SectionHeader className="mb-6">Key Player Matchups</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {keyPlayerMatchups.map((m) => (
                <GlassCard key={m.position} className="p-5 relative overflow-hidden">
                  <NeonAccentBar color={BRAND.primary} />
                  <Badge variant="outline" size="sm">{m.position}</Badge>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-4">
                    <Link href={`/teams/${teamA.slug}/players/${m.teamAPlayer.slug}`} className="text-center group">
                      <div className="font-headline text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{m.teamAPlayer.name}</div>
                      <div className="font-mono text-xs text-on-surface-variant">{m.teamAPlayer.rating}/10</div>
                      <div className="text-xs text-on-surface-variant">{m.teamAPlayer.club}</div>
                    </Link>
                    <span className="text-on-surface-variant text-xs">vs</span>
                    <Link href={`/teams/${teamB.slug}/players/${m.teamBPlayer.slug}`} className="text-center group">
                      <div className="font-headline text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{m.teamBPlayer.name}</div>
                      <div className="font-mono text-xs text-on-surface-variant">{m.teamBPlayer.rating}/10</div>
                      <div className="text-xs text-on-surface-variant">{m.teamBPlayer.club}</div>
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* World Cup History */}
        {(historyA || historyB) && (
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-xl uppercase tracking-wide mb-6 text-center">World Cup History</h3>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
              <div className="text-right font-headline text-sm uppercase tracking-wide text-primary">{teamA.name}</div>
              <div />
              <div className="font-headline text-sm uppercase tracking-wide text-primary">{teamB.name}</div>
            </div>
            <StatRow label="Appearances" valueA={historyA?.totalAppearances ?? 0} valueB={historyB?.totalAppearances ?? 0} />
            <StatRow label="Titles" valueA={historyA?.titlesWon ?? 0} valueB={historyB?.titlesWon ?? 0} />
            <StatRow label="WC Wins" valueA={historyA?.allTimeRecord.won ?? 0} valueB={historyB?.allTimeRecord.won ?? 0} />
            <StatRow label="WC Matches" valueA={historyA?.allTimeRecord.played ?? 0} valueB={historyB?.allTimeRecord.played ?? 0} />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3">
              <div className="text-right text-sm text-on-surface-variant">{historyA?.bestFinish ?? 'N/A'}</div>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest text-center min-w-[100px]">Best Finish</span>
              <div className="text-sm text-on-surface-variant">{historyB?.bestFinish ?? 'N/A'}</div>
            </div>
          </GlassCard>
        )}

        {/* Head-to-Head Record */}
        {(() => {
          const h2h = getH2H(teamA.slug, teamB.slug)
          if (!h2h) return null
          const isTeamAFirst = h2h.teamA === teamA.slug
          return (
            <GlassCard className="p-6 md:p-8">
              <NeonAccentBar color={BRAND.tertiary} />
              <h3 className="font-headline text-xl uppercase tracking-wide mb-2 text-center">All-Time Head-to-Head</h3>
              <p className="text-on-surface-variant text-sm text-center mb-6">
                {h2h.totalMatches} meetings · Last: {h2h.lastResult}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="font-headline text-3xl md:text-4xl text-primary">
                    {isTeamAFirst ? h2h.teamAWins : h2h.teamBWins}
                  </div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider">{teamA.name} Wins</div>
                </div>
                <div className="text-center">
                  <div className="font-headline text-3xl md:text-4xl text-on-surface-variant">{h2h.draws}</div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider">Draws</div>
                </div>
                <div className="text-center">
                  <div className="font-headline text-3xl md:text-4xl text-primary">
                    {isTeamAFirst ? h2h.teamBWins : h2h.teamAWins}
                  </div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider">{teamB.name} Wins</div>
                </div>
              </div>
              {/* Win ratio bar */}
              <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden flex mb-6">
                <div className="h-full bg-primary rounded-l-full" style={{ width: `${((isTeamAFirst ? h2h.teamAWins : h2h.teamBWins) / h2h.totalMatches) * 100}%` }} />
                <div className="h-full bg-on-surface-variant/30" style={{ width: `${(h2h.draws / h2h.totalMatches) * 100}%` }} />
                <div className="h-full bg-tertiary rounded-r-full" style={{ width: `${((isTeamAFirst ? h2h.teamBWins : h2h.teamAWins) / h2h.totalMatches) * 100}%` }} />
              </div>
              {/* Goals */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3 border-b border-white/[0.04]">
                <div className="text-right font-mono text-lg font-bold text-primary">{isTeamAFirst ? h2h.teamAGoals : h2h.teamBGoals}</div>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest text-center min-w-[100px]">Total Goals</span>
                <div className="font-mono text-lg font-bold text-primary">{isTeamAFirst ? h2h.teamBGoals : h2h.teamAGoals}</div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3">
                <div className="text-right font-mono text-lg font-bold">{h2h.worldCupMeetings}</div>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest text-center min-w-[100px]">WC Meetings</span>
                <div className="font-mono text-lg font-bold">{h2h.worldCupMeetings}</div>
              </div>
              {/* Notable meetings */}
              {h2h.notableMeetings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-label text-xs text-primary uppercase tracking-widest font-semibold">Key Encounters</p>
                  {h2h.notableMeetings.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
                      <span className="font-mono text-xs text-tertiary font-bold shrink-0">{m.year}</span>
                      <div>
                        <div className="text-sm text-on-surface">{m.result}</div>
                        <div className="text-xs text-on-surface-variant">{m.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )
        })()}

        {/* Related Comparisons */}
        {related.length > 0 && (
          <div>
            <SectionHeader className="mb-6">Related Comparisons</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((slug) => {
                const [aSlug, bSlug] = slug.split('-vs-')
                const a = getTeamBySlug(aSlug)
                const b = getTeamBySlug(bSlug)
                if (!a || !b) return null
                return (
                  <Link key={slug} href={`/compare/${slug}`}>
                    <GlassCard hover className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>{a.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight">{a.name}</span>
                        </span>
                        <span className="text-on-surface-variant text-xs mx-2">vs</span>
                        <span className="flex items-center gap-1.5 flex-row-reverse">
                          <span>{b.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight text-right">{b.name}</span>
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Back to all comparisons */}
        <div className="text-center">
          <Link
            href="/compare"
            className="inline-block border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            All Comparisons
          </Link>
        </div>
      </div>
    </>
  )
}
