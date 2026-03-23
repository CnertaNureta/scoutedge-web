import Link from 'next/link'
import { getAllTeams } from '@/lib/data-service'
import TeamCard from '@/components/team/TeamCard'

export default function HomePage() {
  const teams = getAllTeams()
  const topTeams = teams.filter((t) => t.fifaRanking <= 10).slice(0, 6)

  return (
    <>
      {/* ── Cinematic Hero ── */}
      <section className="relative min-h-[100vh] flex items-center justify-center px-6 overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 mesh-gradient" />

        {/* Animated glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-secondary/6 blur-[120px] animate-float" style={{ animationDelay: '4s' }} />

        {/* Pitch lines overlay */}
        <div className="absolute inset-0 pitch-lines opacity-30 pointer-events-none" />

        {/* Scanline overlay */}
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

        {/* Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          {/* Date badge */}
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-8 text-secondary animate-fade-in-up opacity-0">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" />
            June 11 — July 19, 2026
          </span>

          {/* Giant headline */}
          <h1 className="font-headline text-[clamp(3rem,10vw,9rem)] leading-[0.85] tracking-wide uppercase mb-6 animate-fade-in-up opacity-0 stagger-1">
            <span className="block text-on-surface">WORLD CUP</span>
            <span className="block gradient-text">2026</span>
            <span className="block text-on-surface text-[clamp(1.5rem,4vw,4rem)]">INTELLIGENCE</span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0 stagger-2">
            Deep squad analysis, chemistry indexes, win probability predictions, and player intelligence reports
            for all 48 nations competing across the United States, Canada, and Mexico.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up opacity-0 stagger-3">
            <Link
              href="/teams"
              className="group relative bg-primary text-on-primary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all animate-neon-glow"
            >
              <span className="relative z-10">Explore All 48 Teams</span>
            </Link>
            <a
              href="#top-teams"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              Top Contenders
            </a>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Quick Stats ── */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-16 relative z-20 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Teams', value: '48', accent: '#00ff87' },
            { label: 'Host Cities', value: '16', accent: '#04f5ff' },
            { label: 'Matches', value: '104', accent: '#ffd700' },
            { label: 'Players Analyzed', value: '1,200+', accent: '#e90052' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`relative glass-panel p-6 rounded-2xl border border-white/[0.08] text-center overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up opacity-0 stagger-${i + 1}`}
            >
              {/* Neon top border */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.accent}, transparent)` }}
              />
              <div className="font-headline text-4xl md:text-5xl tracking-wide" style={{ color: stat.accent }}>
                {stat.value}
              </div>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Contenders ── */}
      <section id="top-teams" className="max-w-[1440px] mx-auto px-6 mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 rounded-full bg-primary" />
              <h2 className="font-headline text-4xl md:text-5xl tracking-wide uppercase">Top Contenders</h2>
            </div>
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

      {/* ── CTA Section ── */}
      <section className="relative w-full py-24 px-6 mb-0 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/10 blur-[200px]" />

        {/* Pitch lines */}
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
