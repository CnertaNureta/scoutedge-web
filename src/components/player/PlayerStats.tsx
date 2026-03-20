import type { Player } from '@/lib/types'
import type { DerivedStats } from '@/lib/player-derived-stats'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import StatRadar from '@/components/player/StatRadar'
import { Globe, Target, ArrowLeftRight, BarChart3, Calendar, Monitor } from 'lucide-react'

interface PlayerStatsProps {
  player: Player
  derivedStats: DerivedStats
}

const STAT_ICONS: Record<string, React.ReactNode> = {
  Caps: <Globe className="w-5 h-5" />,
  Goals: <Target className="w-5 h-5" />,
  Assists: <ArrowLeftRight className="w-5 h-5" />,
  Rating: <BarChart3 className="w-5 h-5" />,
  Age: <Calendar className="w-5 h-5" />,
}

export default function PlayerStats({ player, derivedStats }: PlayerStatsProps) {
  const colors = getTeamColors(player.teamSlug)

  const coreStats = [
    { label: 'Caps', value: player.caps, decimals: 0 },
    { label: 'Goals', value: player.goals, decimals: 0 },
    { label: 'Assists', value: player.assists, decimals: 0 },
    { label: 'Rating', value: player.rating, decimals: 1, suffix: '/10' },
    { label: 'Age', value: player.age, decimals: 0 },
  ]

  return (
    <section
      className="max-w-[1440px] mx-auto px-6 -mt-12 relative z-30 mb-16"
      style={{
        '--team-glow': colors.glow,
        '--team-primary': colors.primary,
      } as React.CSSProperties}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Core stats grid */}
        <div>
          {/* Section header - broadcast style */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full" style={{ background: colors.glow }} />
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Player Statistics</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {coreStats.map((stat, i) => (
              <GlassCard
                key={stat.label}
                className="p-5 text-center relative overflow-hidden group"
              >
                {/* Neon top border */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }}
                />
                <div className="flex justify-center mb-3 text-on-surface-variant group-hover:text-on-surface transition-colors" style={{ color: colors.glow }}>
                  {STAT_ICONS[stat.label]}
                </div>
                <AnimatedNumber
                  value={stat.value}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                  className="font-headline text-3xl md:text-4xl font-black block"
                  style={{ color: colors.glow }}
                />
                <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1 block">
                  {stat.label}
                </span>
              </GlassCard>
            ))}
          </div>

          {/* Derived attributes bars */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(derivedStats) as [string, number][]).map(([key, value]) => (
              <div key={key} className="glass-panel rounded-lg border border-white/5 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {key === 'overall' ? 'OVR' : key.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: colors.glow }}>
                    {value}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full animate-bar-fill"
                    style={{
                      '--bar-width': `${value}%`,
                      width: `${value}%`,
                      background: `linear-gradient(90deg, ${colors.primary}, ${colors.glow})`,
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar chart */}
        <div className="flex flex-col items-center justify-center">
          <div className="glass-panel rounded-xl border border-white/5 p-6 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4" style={{ color: colors.glow }} />
              <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Performance Radar
              </span>
            </div>
            <StatRadar stats={derivedStats} teamGlow={colors.glow} teamPrimary={colors.primary} />
          </div>
        </div>
      </div>
    </section>
  )
}
