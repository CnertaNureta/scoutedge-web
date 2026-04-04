import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams, getPlayersByTeam } from '@/lib/data-service'
import { fetchWorldCupNews } from '@/lib/news-service'
import { getTrendingPlayers } from '@/data/player-social'
import liveCache from '@/data/live-cache.json'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

export const metadata: Metadata = {
  title: 'World Cup 2026 Daily Briefing: Latest News & AI Intelligence Updates',
  description:
    'Your daily World Cup 2026 intelligence briefing. AI-extracted signals covering injuries, transfers, form, tactical shifts, and sentiment across all 48 teams. Updated daily.',
  keywords: 'World Cup 2026 news, World Cup 2026 daily briefing, World Cup 2026 updates, World Cup 2026 injuries, World Cup 2026 intelligence',
  openGraph: {
    title: 'Daily Briefing — World Cup 2026 | ScoutEdge',
    description: 'AI-powered daily intelligence on all 48 World Cup 2026 teams.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'World Cup 2026 Daily Briefing | ScoutEdge',
    description: 'Today\'s AI-extracted signals across all 48 teams.',
  },
  alternates: { canonical: 'https://scoutedge.ai/daily-briefing' },
}

interface Signal {
  type: 'injury' | 'transfer' | 'form' | 'tactical' | 'sentiment'
  team: { name: string; flag: string; slug: string }
  headline: string
  detail: string
  impact: 'high' | 'medium' | 'low'
}

function getSignalIcon(type: Signal['type']): string {
  switch (type) {
    case 'injury': return '\u{1F3E5}'
    case 'transfer': return '\u{1F4B0}'
    case 'form': return '\u{1F4C8}'
    case 'tactical': return '\u{1F9E0}'
    case 'sentiment': return '\u{1F4AC}'
  }
}

function getImpactClass(impact: Signal['impact']): string {
  switch (impact) {
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
  }
}

function generateDailySignals(): Signal[] {
  const teams = getAllTeams()
  const signals: Signal[] = []

  const sortedByChemistry = [...teams].sort((a, b) => b.chemistry - a.chemistry)
  const topTeams = sortedByChemistry.slice(0, 3)
  const bottomTeams = sortedByChemistry.slice(-3)

  for (const team of topTeams) {
    signals.push({
      type: 'form',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} squad chemistry at ${team.chemistry}/100`,
      detail: `Strong cohesion detected across the squad. Familiarity index: ${team.familiarity}, Stability: ${team.stability}, Morale: ${team.morale}. Coach ${team.coachName}'s system appears well-drilled.`,
      impact: 'medium',
    })
  }

  for (const team of bottomTeams) {
    signals.push({
      type: 'sentiment',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} chemistry concerns — ${team.chemistry}/100`,
      detail: `Below-average squad cohesion detected. Morale: ${team.morale}, Stability: ${team.stability}. This could impact tournament preparation.`,
      impact: team.chemistry < 50 ? 'high' : 'medium',
    })
  }

  for (const team of teams.slice(0, 12)) {
    const players = getPlayersByTeam(team.slug)
    const injured = players.filter((p) => p.fitnessStatus === 'red')
    const monitoring = players.filter((p) => p.fitnessStatus === 'amber')

    if (injured.length > 0) {
      signals.push({
        type: 'injury',
        team: { name: team.name, flag: team.flag, slug: team.slug },
        headline: `${team.name}: ${injured.length} player${injured.length > 1 ? 's' : ''} flagged injured`,
        detail: `${injured.map((p) => `${p.name} (${p.position}) — ${p.fitnessNote}`).join('. ')}. ${monitoring.length} additional player${monitoring.length !== 1 ? 's' : ''} under monitoring.`,
        impact: injured.length >= 2 ? 'high' : 'medium',
      })
    }
  }

  const topRanked = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking).slice(0, 5)
  for (const team of topRanked) {
    signals.push({
      type: 'tactical',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} tactical profile: ${team.archetypeMatch}`,
      detail: team.keyInsight,
      impact: 'low',
    })
  }

  const impactOrder = { high: 0, medium: 1, low: 2 }
  return signals.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">{getSignalIcon(signal.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href={`/teams/${signal.team.slug}`}
              className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              {signal.team.flag} {signal.team.name}
            </Link>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label font-bold uppercase tracking-widest border ${getImpactClass(signal.impact)}`}>
              {signal.impact}
            </span>
          </div>
          <h3 className="font-headline text-base md:text-lg font-bold tracking-tight mb-1">
            {signal.headline}
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {signal.detail}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

export default async function DailyBriefingPage() {
  const signals = generateDailySignals()
  const news = await fetchWorldCupNews(20)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const highCount = signals.filter((s) => s.impact === 'high').length
  const mediumCount = signals.filter((s) => s.impact === 'medium').length

  const signalTypes = [...new Set(signals.map((s) => s.type))]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `World Cup 2026 Daily Briefing — ${today}`,
    description: 'AI-generated daily intelligence briefing for World Cup 2026',
    datePublished: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'ScoutEdge',
      url: 'https://scoutedge.ai',
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
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="secondary" size="md">Daily Intelligence</Badge>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase mt-4 mb-4">
            Daily<br />
            <span className="text-primary">Briefing</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-6">
            AI-extracted signals from news, social media, and data sources across all 48 World Cup 2026 teams.
          </p>
          <p className="font-label text-sm text-on-surface-variant uppercase tracking-widest mb-8">
            {today}
          </p>

          {/* Summary Stats */}
          <div className="flex flex-wrap justify-center gap-3">
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{signals.length}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Signals</span>
            </GlassCard>
            {news.length > 0 && (
              <GlassCard className="px-5 py-3 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-primary">{news.length}</span>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Live News</span>
              </GlassCard>
            )}
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-red-400">{highCount}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">High Impact</span>
            </GlassCard>
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-yellow-400">{mediumCount}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Medium Impact</span>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Live News Section */}
      {news.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Live News Feed
            </h2>
            <Badge variant="primary" size="sm">Real-time</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <GlassCard className="p-5 h-full hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{'\u{1F4F0}'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline text-sm md:text-base font-bold tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.source && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-xs font-label uppercase tracking-widest text-on-surface-variant">
                            {item.source}
                          </span>
                        )}
                        {item.relativeTime && (
                          <span className="text-xs text-on-surface-variant/70 font-mono">
                            {item.relativeTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Signal Type Filter Labels */}
      <section className="max-w-[1440px] mx-auto px-6 mb-4">
        <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mb-6">
          Intelligence Signals
        </h2>
        <div className="flex flex-wrap gap-2">
          {signalTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 bg-surface-container rounded-full px-3 py-1.5 font-label text-xs uppercase tracking-widest text-on-surface-variant"
            >
              {getSignalIcon(type)} {type}
              <span className="font-mono text-xs text-on-surface-variant/70">
                ({signals.filter((s) => s.type === type).length})
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Signals Feed */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20">
        <GlassCard className="mb-5 p-5 md:p-6 border-primary/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-headline text-xl uppercase tracking-tight text-on-surface">
                Open Signal Feed
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                ScoutEdge v1 keeps the briefing open so the core narrative layer stays readable without paywalls or subscription detours.
              </p>
            </div>
            <Badge variant="primary" size="sm">All signals visible</Badge>
          </div>
        </GlassCard>
        <div className="space-y-3">
          {signals.map((signal, i) => (
            <SignalCard key={i} signal={signal} />
          ))}
        </div>
      </section>

      {/* Confirmed 2026 Fixtures — Real Data */}
      {liveCache.wcFixtures2026.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Confirmed 2026 Fixtures
            </h2>
            <Badge variant="primary" size="sm">Live API</Badge>
          </div>
          <p className="text-on-surface-variant text-sm mb-6">
            Real match data from <span className="text-primary">TheSportsDB</span> — updated{' '}
            {new Date(liveCache.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {liveCache.wcFixtures2026.slice(0, 9).map((match) => (
              <GlassCard key={match.id} className="p-5 relative overflow-hidden">
                <NeonAccentBar color="#a0d494" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    Round {match.round}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-label text-sm font-semibold text-on-surface">{match.homeTeam}</span>
                  <span className="font-mono text-xs text-on-surface-variant font-bold px-2">
                    {match.homeScore != null ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                  </span>
                  <span className="font-label text-sm font-semibold text-on-surface text-right">{match.awayTeam}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant truncate">
                  {match.venue}
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline"
            >
              View Full Schedule ({liveCache.wcFixtures2026.length}+ matches) →
            </Link>
          </div>
        </section>
      )}

      {/* 2022 WC Flashbacks — Real Historical Data */}
      {liveCache.wcFixtures2022.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              2022 WC Flashbacks
            </h2>
            <Badge variant="outline" size="sm">Historical</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {liveCache.wcFixtures2022.slice(0, 10).map((match) => (
              <GlassCard key={match.id} className="p-4 relative overflow-hidden">
                <NeonAccentBar color="#e9c400" />
                <div className="text-center">
                  <div className="text-[10px] text-on-surface-variant mb-2">
                    {new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="font-label text-xs font-semibold text-on-surface">{match.homeTeam}</div>
                  <div className="font-mono text-lg font-bold my-1" style={{ color: '#e9c400' }}>
                    {match.homeScore} - {match.awayScore}
                  </div>
                  <div className="font-label text-xs font-semibold text-on-surface">{match.awayTeam}</div>
                  <div className="text-[10px] text-on-surface-variant mt-2 truncate">{match.venue}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Social Buzz — Trending Players */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
            Social Buzz
          </h2>
          <Badge variant="primary" size="sm">Trending</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getTrendingPlayers(6).map((player) => (
            <GlassCard key={player.playerSlug} className="p-5 relative overflow-hidden">
              <NeonAccentBar color={player.buzzScore >= 90 ? '#e9c400' : '#a0d494'} />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-base uppercase tracking-tight">
                    {player.playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  {player.trending && <span className="text-xs">🔥</span>}
                </div>
                <div
                  className="px-2 py-0.5 rounded-full font-mono text-xs font-bold"
                  style={{
                    background: player.buzzScore >= 90 ? 'rgba(233,196,0,0.2)' : 'rgba(160,212,148,0.2)',
                    color: player.buzzScore >= 90 ? '#e9c400' : '#a0d494',
                  }}
                >
                  {player.buzzScore}/100
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {player.platforms.instagram && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    IG {player.platforms.instagram.followers}
                  </span>
                )}
                {player.platforms.twitter && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    X {player.platforms.twitter.followers}
                  </span>
                )}
                {player.platforms.tiktok && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    TikTok {player.platforms.tiktok.followers}
                  </span>
                )}
              </div>
              {player.recentPosts[0] && (
                <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                  &ldquo;{player.recentPosts[0].summary}&rdquo;
                  <span className="text-xs text-on-surface-variant/50 ml-1">— {player.recentPosts[0].platform}</span>
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <NewsletterSignup variant="banner" />
      </section>

      {/* CTA */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20 text-center">
        <GlassCard className="p-8 md:p-12">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-3">
            Explore Team Intelligence
          </h2>
          <p className="text-on-surface-variant mb-6 max-w-lg mx-auto">
            Dive deeper into individual team analysis, squad chemistry breakdowns, and player-level intelligence reports.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Browse All Teams
            </Link>
            <Link
              href="/power-rankings"
              className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              Power Rankings
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
