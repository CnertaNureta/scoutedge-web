import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams, getTeamsByGroup, getAllGroups } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'World Cup 2026 Team Comparisons: Head-to-Head for All 48 Teams',
  description:
    'Compare any two World Cup 2026 teams head-to-head. AI-powered analysis of 1,128 possible matchups with squad stats, chemistry indexes, key player matchups, and win probability predictions.',
  keywords:
    'World Cup 2026 team comparison, World Cup 2026 head to head, World Cup 2026 vs, compare World Cup teams, World Cup 2026 matchups',
  alternates: { canonical: 'https://scoutedge.ai/compare' },
}

export default function ComparePage() {
  const groups = getAllGroups()
  const teams = getAllTeams().sort((a, b) => a.slug.localeCompare(b.slug))
  const totalMatchups = (teams.length * (teams.length - 1)) / 2

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Team Comparisons',
    description: `Head-to-head comparisons for all ${totalMatchups} possible World Cup 2026 matchups.`,
    numberOfItems: totalMatchups,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{totalMatchups} Matchups</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-6">
            Team<br />
            <span className="gradient-text">Comparisons</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Head-to-head AI analysis for every possible World Cup 2026 matchup.
            Select a group below or browse all {totalMatchups} comparisons.
          </p>
        </div>
      </section>

      {/* Group-by-group matchups */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {groups.map((group) => {
          const groupTeams = getTeamsByGroup(group).sort((a, b) => a.slug.localeCompare(b.slug))
          const matchups: Array<{ teamA: typeof groupTeams[0]; teamB: typeof groupTeams[0]; slug: string }> = []
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              const [a, b] = [groupTeams[i], groupTeams[j]].sort((x, y) => x.slug.localeCompare(y.slug))
              matchups.push({ teamA: a, teamB: b, slug: `${a.slug}-vs-${b.slug}` })
            }
          }

          return (
            <div key={group} className="mb-12">
              <SectionHeader className="mb-6">Group {group}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchups.map(({ teamA, teamB, slug }) => (
                  <Link key={slug} href={`/compare/${slug}`}>
                    <GlassCard hover className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl">{teamA.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight truncate">{teamA.name}</span>
                        </div>
                        <span className="font-headline text-xs text-on-surface-variant mx-2 shrink-0">VS</span>
                        <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                          <span className="text-2xl">{teamB.flag}</span>
                          <span className="font-headline text-sm uppercase tracking-tight truncate text-right">{teamB.name}</span>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        {/* Cross-group featured matchups */}
        <div className="mb-12">
          <SectionHeader className="mb-6">Featured Cross-Group Matchups</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { a: 'argentina', b: 'brazil' },
              { a: 'argentina', b: 'france' },
              { a: 'brazil', b: 'germany' },
              { a: 'england', b: 'spain' },
              { a: 'france', b: 'germany' },
              { a: 'mexico', b: 'usa' },
              { a: 'brazil', b: 'france' },
              { a: 'argentina', b: 'england' },
              { a: 'japan', b: 'south-korea' },
            ].map(({ a, b }) => {
              const [sortedA, sortedB] = a.localeCompare(b) < 0 ? [a, b] : [b, a]
              const teamA = teams.find((t) => t.slug === sortedA)
              const teamB = teams.find((t) => t.slug === sortedB)
              if (!teamA || !teamB) return null
              const slug = `${sortedA}-vs-${sortedB}`
              return (
                <Link key={slug} href={`/compare/${slug}`}>
                  <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl">{teamA.flag}</span>
                        <span className="font-headline text-sm uppercase tracking-tight truncate">{teamA.name}</span>
                      </div>
                      <span className="font-headline text-xs text-on-surface-variant mx-2 shrink-0">VS</span>
                      <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                        <span className="text-2xl">{teamB.flag}</span>
                        <span className="font-headline text-sm uppercase tracking-tight truncate text-right">{teamB.name}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Full index — all matchups */}
        <div>
          <SectionHeader className="mb-6">All {totalMatchups} Matchups</SectionHeader>
          <p className="text-on-surface-variant text-sm mb-6">Browse every possible head-to-head comparison at the 2026 World Cup.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {teams.map((teamA, i) =>
              teams.slice(i + 1).map((teamB) => {
                const slug = `${teamA.slug}-vs-${teamB.slug}`
                return (
                  <Link
                    key={slug}
                    href={`/compare/${slug}`}
                    className="glass-panel rounded-xl border border-white/[0.06] px-4 py-3 flex items-center justify-between hover:border-white/15 hover:bg-white/[0.02] transition-all text-sm"
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span>{teamA.flag}</span>
                      <span className="font-headline text-xs uppercase tracking-tight truncate">{teamA.name}</span>
                    </span>
                    <span className="text-on-surface-variant text-xs mx-1.5 shrink-0">vs</span>
                    <span className="flex items-center gap-1.5 min-w-0 truncate flex-row-reverse">
                      <span>{teamB.flag}</span>
                      <span className="font-headline text-xs uppercase tracking-tight truncate text-right">{teamB.name}</span>
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </section>
    </>
  )
}
