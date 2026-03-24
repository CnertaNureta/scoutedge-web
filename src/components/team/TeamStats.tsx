import type { Team, Player } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'

interface TeamStatsProps {
  team: Team
  players: Player[]
}

export default function TeamStats({ team, players }: TeamStatsProps) {
  const squadSize = players.length
  const averageAge = players.length > 0
    ? Math.round((players.reduce((sum, p) => sum + p.age, 0) / players.length) * 10) / 10
    : 0
  const starPlayer = players.length > 0
    ? players.reduce((best, p) => (p.rating > best.rating ? p : best), players[0])
    : null

  const greenCount = players.filter((p) => p.fitnessStatus === 'green').length
  const amberCount = players.filter((p) => p.fitnessStatus === 'amber').length
  const formLabel = greenCount >= players.length * 0.8
    ? 'Excellent'
    : greenCount >= players.length * 0.6
    ? 'Good'
    : amberCount > greenCount
    ? 'Mixed'
    : 'Concern'

  const stats = [
    { label: 'FIFA Ranking', value: `#${team.fifaRanking}`, colorClass: 'text-primary' },
    { label: 'Squad Size', value: `${squadSize}`, colorClass: 'text-on-surface' },
    { label: 'Avg Age', value: `${averageAge}`, colorClass: 'text-on-surface' },
    { label: 'Star Player', value: starPlayer?.name ?? '—', subValue: starPlayer ? `${starPlayer.rating}/10` : undefined, colorClass: 'text-on-surface', isName: true },
    { label: 'Chemistry', value: `${team.chemistry}`, colorClass: 'text-tertiary' },
    { label: 'Fitness', value: formLabel, colorClass: 'text-primary' },
  ]

  return (
    <section
      className="max-w-[1440px] mx-auto px-6 -mt-12 relative z-30 mb-8"
      aria-label="Team statistics"
    >
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-6 md:overflow-visible scrollbar-hide">
        {stats.map((stat) => (
          <GlassCard
            key={stat.label}
            className="min-w-[140px] snap-center flex-shrink-0 md:min-w-0 p-4"
          >
            <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {stat.label}
            </span>
            <div
              className={`font-headline ${stat.isName ? 'text-lg md:text-xl' : 'text-3xl'} font-black ${stat.colorClass} mt-1 leading-tight truncate`}
            >
              {stat.value}
            </div>
            {stat.subValue && (
              <div className="font-label text-sm font-bold text-primary mt-0.5">
                {stat.subValue}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
