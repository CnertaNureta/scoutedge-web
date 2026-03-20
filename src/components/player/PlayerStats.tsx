import type { Player } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import GlassCard from '@/components/ui/GlassCard'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import StatRadar from '@/components/player/StatRadar'

interface PlayerStatsProps {
  player: Player
}

const STAT_ICONS: Record<string, React.ReactNode> = {
  Caps: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.732-3.558" />
    </svg>
  ),
  Goals: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  Assists: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  Rating: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Age: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
}

export default function PlayerStats({ player }: PlayerStatsProps) {
  const colors = getTeamColors(player.teamSlug)
  const derived = computeDerivedStats(player)

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
            {(Object.entries(derived) as [string, number][]).map(([key, value]) => (
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
              <svg className="w-4 h-4" style={{ color: colors.glow }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
              <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Performance Radar
              </span>
            </div>
            <StatRadar stats={derived} teamGlow={colors.glow} teamPrimary={colors.primary} />
          </div>
        </div>
      </div>
    </section>
  )
}
