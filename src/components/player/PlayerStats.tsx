import type { Player } from '@/lib/types'
import type { DerivedStats } from '@/lib/player-derived-stats'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
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
    { label: 'Caps', value: player.caps, decimals: 0, hint: 'International appearances' },
    { label: 'Goals', value: player.goals, decimals: 0, hint: 'International goals scored' },
    { label: 'Assists', value: player.assists, decimals: 0, hint: 'Goal assists provided' },
    { label: 'Rating', value: player.rating, decimals: 1, suffix: '/10', hint: 'KickOracle overall rating' },
    { label: 'Age', value: player.age, decimals: 0, hint: 'Current age' },
  ]

  return (
    <section
      className="page-container -mt-12 relative z-30 mb-16"
      style={{
        '--team-glow': colors.glow,
        '--team-primary': colors.primary,
      } as React.CSSProperties}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full" style={{ background: colors.glow }} />
            <h2 className="font-headline text-2xl tracking-wide uppercase">Player Statistics</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {coreStats.map((stat) => (
              <GlassCard
                key={stat.label}
                className="p-5 text-center relative overflow-hidden group"
              >
                <NeonAccentBar color={colors.glow} />
                <div className="flex justify-center mb-3 transition-colors" style={{ color: colors.glow }}>
                  {STAT_ICONS[stat.label]}
                </div>
                <AnimatedNumber
                  value={stat.value}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                  className="font-headline text-3xl md:text-4xl block"
                  style={{ color: colors.glow }}
                />
                <span className="font-label text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest mt-1 block">
                  {stat.label}
                </span>
                <span className="text-[9px] text-on-surface-variant/60 block mt-0.5">{stat.hint}</span>
              </GlassCard>
            ))}
          </div>

          <div className="mt-6 mb-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="font-label text-xs text-primary uppercase tracking-widest font-semibold mb-2">AI-Derived Attributes</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Think of these like FIFA video game stats — our AI calculates them from real performance data.
              <span className="text-on-surface font-semibold"> PAC</span> = speed &amp; acceleration,
              <span className="text-on-surface font-semibold"> SHO</span> = finishing &amp; shot power,
              <span className="text-on-surface font-semibold"> PAS</span> = vision &amp; delivery,
              <span className="text-on-surface font-semibold"> PHY</span> = strength &amp; stamina,
              <span className="text-on-surface font-semibold"> DEF</span> = tackling &amp; positioning,
              <span className="text-on-surface font-semibold"> OVR</span> = overall ability.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(derivedStats) as [string, number][]).map(([key, value]) => (
              <div key={key} className="glass-panel rounded-xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
                    {key === 'overall' ? 'OVR' : key.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: colors.glow }}>
                    {value}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
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

        <div className="flex flex-col items-center justify-center">
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-6 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4" style={{ color: colors.glow }} />
              <span className="font-label text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
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
