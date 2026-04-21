import type { Metadata } from 'next'
import { buildOGMeta } from '@/lib/og-utils'
import { getAllGroups, getTeamsByGroup } from '@/lib/data-service'
import SimulatorClient from './SimulatorClient'

export const metadata: Metadata = {
  title: 'Group Stage Simulator — World Cup 2026 | KickOracle',
  description:
    'Simulate all 12 World Cup 2026 groups. Drag teams to predict advancement, compare your bracket against AI predictions, and share your results.',
  keywords:
    'World Cup 2026 group simulator, World Cup 2026 bracket, World Cup 2026 group stage predictions, World Cup 2026 group draw simulator',
  alternates: { canonical: 'https://kickoracle.com/simulator' },
  ...buildOGMeta({
    title: 'World Cup 2026 Group Stage Simulator',
    description:
      'Simulate all 12 World Cup 2026 groups. Drag to rank teams, compare against AI, and share your bracket.',
    url: 'https://kickoracle.com/simulator',
  }),
}

export interface TeamEntry {
  slug: string
  name: string
  flag: string
  fifaRanking: number
}

export interface GroupData {
  group: string
  teams: TeamEntry[]
}

export default function SimulatorPage() {
  const groups: GroupData[] = getAllGroups().map((g) => ({
    group: g,
    teams: getTeamsByGroup(g)
      .map((t) => ({
        slug: t.slug,
        name: t.name,
        flag: t.flag,
        fifaRanking: t.fifaRanking,
      }))
      .sort((a, b) => a.fifaRanking - b.fifaRanking), // AI-predicted order
  }))

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/6 blur-[160px] animate-float" />
        <div
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[140px] animate-float"
          style={{ animationDelay: '1.5s' }}
        />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-tertiary/15 text-tertiary border border-tertiary/20 font-label font-semibold uppercase tracking-widest rounded-full px-4 py-1 text-xs mb-4">
            12 Groups · 48 Teams
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">Group</span>
            <span className="block gradient-text">Simulator</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
            Drag teams to set your predicted advancement order for all 12 groups.
            See how your picks diverge from the AI and share your bracket.
          </p>
        </div>
      </section>

      {/* Simulator */}
      <section className="page-container pb-24">
        <SimulatorClient groups={groups} />
      </section>
    </>
  )
}
