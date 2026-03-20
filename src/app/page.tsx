import Link from 'next/link'
import { getAllTeams } from '@/lib/data-service'
import TeamCard from '@/components/team/TeamCard'

export default function HomePage() {
  const teams = getAllTeams()
  const topTeams = teams.filter((t) => t.fifaRanking <= 10).slice(0, 6)

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-background to-background" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-primary blur-[120px]" />
          <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full bg-tertiary blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label text-xs font-bold tracking-widest uppercase mb-8">
            June 11 — July 19, 2026
          </span>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9] mb-8">
            AI-Powered<br />
            <span className="text-primary">World Cup 2026</span><br />
            Intelligence
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12">
            Deep squad analysis, chemistry indexes, win probability predictions, and player intelligence reports
            for all 48 nations competing across the United States, Canada, and Mexico.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/teams"
              className="bg-primary text-on-primary px-10 py-4 rounded-full font-label font-extrabold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Explore All 48 Teams →
            </Link>
            <a
              href="#top-teams"
              className="border border-outline-variant text-on-surface px-10 py-4 rounded-full font-label font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
            >
              Top Contenders
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-8 relative z-20 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Teams', value: '48', icon: '🏟️' },
            { label: 'Host Cities', value: '16', icon: '🌎' },
            { label: 'Matches', value: '104', icon: '⚽' },
            { label: 'Players Analyzed', value: '1,200+', icon: '📊' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-6 rounded-xl border border-white/10 text-center">
              <span className="text-3xl block mb-2">{stat.icon}</span>
              <div className="font-headline text-3xl font-black text-primary">{stat.value}</div>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Contenders */}
      <section id="top-teams" className="max-w-[1440px] mx-auto px-6 mb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight uppercase">Top Contenders</h2>
            <p className="text-on-surface-variant mt-2">The highest-ranked nations heading into the 2026 tournament</p>
          </div>
          <Link
            href="/teams"
            className="font-label text-sm font-bold text-primary uppercase tracking-widest hover:underline hidden md:block"
          >
            View All Teams →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topTeams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-primary-container py-20 px-6 mb-0">
        <div className="max-w-[1440px] mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-5xl font-black tracking-tighter uppercase mb-6">
            Premium Intelligence Awaits
          </h2>
          <p className="text-on-primary-container text-lg max-w-xl mx-auto mb-8">
            Get full AI-powered scouting reports, real-time fitness tracking, and predictive match analysis
            for every game of the 2026 World Cup.
          </p>
          <button className="bg-primary text-on-primary px-10 py-4 rounded-full font-label font-extrabold uppercase tracking-widest hover:scale-105 transition-transform">
            Subscribe for Premium Intel
          </button>
        </div>
      </section>
    </>
  )
}
