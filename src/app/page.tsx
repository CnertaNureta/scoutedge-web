import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams } from '@/lib/data-service'
import { buildOGMeta, websiteJsonLd, organizationJsonLd } from '@/lib/og-utils'
import TeamCard from '@/components/team/TeamCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import SectionHeader from '@/components/ui/SectionHeader'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

export const metadata: Metadata = {
  title: 'World Cup 2026 AI Predictions, Squad Analysis & Match Previews | ScoutEdge',
  description:
    'AI-powered predictions and analysis for all 48 World Cup 2026 teams. Squad chemistry indexes, win probabilities, player scouting reports, and match previews across the USA, Canada & Mexico.',
  keywords:
    'World Cup 2026, World Cup 2026 predictions, FIFA World Cup 2026, soccer predictions, football analysis, team chemistry, player stats, World Cup 2026 schedule',
  alternates: { canonical: 'https://scoutedge.ai' },
  ...buildOGMeta({
    title: 'World Cup 2026 AI Predictions & Squad Analysis | ScoutEdge',
    description: 'AI-powered predictions for all 48 teams. Chemistry indexes, win probabilities, and player scouting reports.',
    url: 'https://scoutedge.ai',
  }),
}

export default function HomePage() {
  const teams = getAllTeams()
  const topTeams = teams.filter((t) => t.fifaRanking <= 10).slice(0, 6)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />

      {/* Cinematic Hero */}
      <section className="relative min-h-[100vh] flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-secondary/6 blur-[120px] animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 pitch-lines opacity-30 pointer-events-none" />
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-8 text-secondary animate-fade-in-up opacity-0">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" />
            June 11 — July 19, 2026
          </span>

          <h1 className="font-headline text-[clamp(3rem,10vw,9rem)] leading-[0.85] tracking-wide uppercase mb-6 animate-fade-in-up opacity-0 stagger-1">
            <span className="block text-on-surface">WORLD CUP</span>
            <span className="block gradient-text">2026</span>
            <span className="block text-on-surface text-[clamp(1.5rem,4vw,4rem)]">INTELLIGENCE</span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0 stagger-2">
            Deep squad analysis, chemistry indexes, win probability predictions, and player intelligence reports
            for all 48 nations competing across the United States, Canada, and Mexico.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up opacity-0 stagger-3">
            <Link
              href="/teams"
              className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all animate-neon-glow"
            >
              Explore All 48 Teams
            </Link>
            <a
              href="#top-teams"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              Top Contenders
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Quick Stats */}
      <section className="page-container -mt-16 relative z-20 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Teams', value: '48', accent: '#a0d494' },
            { label: 'Host Cities', value: '16', accent: '#bcf0ae' },
            { label: 'Matches', value: '104', accent: '#e9c400' },
            { label: 'Players Analyzed', value: '1,200+', accent: '#ffb4aa' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`relative glass-panel p-6 rounded-2xl border border-white/[0.08] text-center overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up opacity-0 stagger-${i + 1}`}
            >
              <NeonAccentBar color={stat.accent} />
              <div className="font-headline text-4xl md:text-5xl tracking-wide" style={{ color: stat.accent }}>
                {stat.value}
              </div>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Contenders */}
      <section id="top-teams" className="page-container mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <SectionHeader className="mb-3">Top Contenders</SectionHeader>
            <p className="text-on-surface-variant mt-2 ml-4">The highest-ranked nations heading into the 2026 tournament</p>
          </div>
          <Link
            href="/teams"
            className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline hidden md:block"
          >
            View All Teams
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topTeams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* Feature Hub — Analysis */}
      <section className="page-container mb-16">
        <SectionHeader className="mb-8">Analysis &amp; Intelligence</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {([
            {
              title: 'All 48 Teams',
              desc: 'Squad chemistry, tactical profiles, and AI predictions for every nation.',
              href: '/teams',
              icon: '\u{1F3C3}',
              accent: '#a0d494',
            },
            {
              title: 'Match Schedule',
              desc: 'Full group-stage fixtures with AI win-probability previews.',
              href: '/matches',
              icon: '\u{26BD}',
              accent: '#bcf0ae',
            },
            {
              title: 'Power Rankings',
              desc: 'AI-driven rankings combining form, chemistry, and squad depth.',
              href: '/power-rankings',
              icon: '\u{1F3C6}',
              accent: '#e9c400',
            },
            {
              title: 'Daily Briefing',
              desc: 'Live news feed and AI-extracted signals updated daily.',
              href: '/daily-briefing',
              icon: '\u{1F4F0}',
              accent: '#ffb4aa',
            },
            {
              title: 'Prediction Challenge',
              desc: 'Pick winners, choose your champion, and compete against the AI.',
              href: '/predictions',
              icon: '\u{1F3AF}',
              accent: '#ffd700',
            },
          ] as const).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <NeonAccentBar color={feature.accent} />
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline text-lg uppercase tracking-wide mb-2" style={{ color: feature.accent }}>
                {feature.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature Hub — Tools */}
      <section className="page-container mb-24">
        <SectionHeader className="mb-8">Tools &amp; Resources</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {([
            {
              title: 'Countdown',
              desc: 'Live countdown to kickoff with key dates and venue highlights.',
              href: '/countdown',
              icon: '\u{23F3}',
              accent: '#ffb4aa',
            },
            {
              title: 'Time Converter',
              desc: 'Match kick-off times converted to your local time zone.',
              href: '/schedule/converter',
              icon: '\u{1F30D}',
              accent: '#e9c400',
            },
            {
              title: 'Group Analysis',
              desc: 'Deep-dive into all 12 groups with standings and qualification odds.',
              href: '/groups/A',
              icon: '\u{1F4CA}',
              accent: '#bcf0ae',
            },
            {
              title: 'Compare Teams',
              desc: 'Head-to-head comparisons for all 1,128 possible matchups.',
              href: '/compare',
              icon: '\u{2694}\u{FE0F}',
              accent: '#a0d494',
            },
            {
              title: 'Blog',
              desc: 'Plain-English analysis, predictions, and guides for real football fans.',
              href: '/blog',
              icon: '\u{1F4DD}',
              accent: '#bcf0ae',
            },
            {
              title: 'Community',
              desc: 'Fan forum — predictions, debates, and match-day discussion worldwide.',
              href: '/community',
              icon: '\u{1F4AC}',
              accent: '#e9c400',
            },
          ] as const).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <NeonAccentBar color={feature.accent} />
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline text-lg uppercase tracking-wide mb-2" style={{ color: feature.accent }}>
                {feature.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="page-container mb-24">
        <NewsletterSignup variant="banner" />
      </section>

      {/* CTA Section */}
      <section className="relative w-full py-24 px-6 mb-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/10 blur-[200px]" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl tracking-wide uppercase mb-6">
            Premium <span className="text-tertiary">Intelligence</span> Awaits
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-10">
            Get full AI-powered scouting reports, real-time fitness tracking, and predictive match analysis
            for every game of the 2026 World Cup.
          </p>
          <button className="bg-tertiary text-on-tertiary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_50px_rgba(255,215,0,0.5)]">
            Subscribe for Premium Intel
          </button>
        </div>
      </section>
    </>
  )
}
