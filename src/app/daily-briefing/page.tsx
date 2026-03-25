import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams, getPlayersByTeam } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = {
  title: 'Daily Briefing — World Cup 2026 AI Intelligence',
  description:
    'Your daily World Cup 2026 intelligence briefing. AI-extracted signals from news, social media, and data sources. Key developments, team updates, and prediction shifts.',
  keywords: 'World Cup 2026 daily briefing, World Cup 2026 news, World Cup 2026 updates, World Cup 2026 intelligence',
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

  // Generate signals from actual team/player data
  const sortedByChemistry = [...teams].sort((a, b) => b.chemistry - a.chemistry)
  const topTeams = sortedByChemistry.slice(0, 3)
  const bottomTeams = sortedByChemistry.slice(-3)

  // Top chemistry signals
  for (const team of topTeams) {
    signals.push({
      type: 'form',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} squad chemistry at ${team.chemistry}/100`,
      detail: `Strong cohesion detected across the squad. Familiarity index: ${team.familiarity}, Stability: ${team.stability}, Morale: ${team.morale}. Coach ${team.coachName}'s system appears well-drilled.`,
      impact: 'medium',
    })
  }

  // Low chemistry alerts
  for (const team of bottomTeams) {
    signals.push({
      type: 'sentiment',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} chemistry concerns — ${team.chemistry}/100`,
      detail: `Below-average squad cohesion detected. Morale: ${team.morale}, Stability: ${team.stability}. This could impact tournament preparation.`,
      impact: team.chemistry < 50 ? 'high' : 'medium',
    })
  }

  // Injury signals from player fitness data
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

  // Tactical signals from top-ranked teams
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

  // Sort by impact priority
  const impactOrder = { high: 0, medium: 1, low: 2 }
  return signals.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
}

export default function DailyBriefingPage() {
  const signals = generateDailySignals()
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

      {/* Signal Type Filter Labels */}
      <section className="max-w-[1440px] mx-auto px-6 mb-8">
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
        <div className="space-y-3">
          {signals.map((signal, i) => (
            <GlassCard key={i} className="p-5 md:p-6">
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
          ))}
        </div>
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
