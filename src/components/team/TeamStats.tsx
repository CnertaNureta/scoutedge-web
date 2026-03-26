import type { Team } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import NeonAccentBar from '@/components/ui/NeonAccentBar'

interface TeamStatsProps {
  team: Team
}

export default function TeamStats({ team }: TeamStatsProps) {
  return (
    <section className="page-container -mt-12 relative z-30 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'FIFA Ranking', value: `#${team.fifaRanking}`, color: '#a0d494' },
          { label: 'Chemistry', value: String(team.chemistry), color: '#e9c400', showBar: true },
          { label: 'Group', value: team.group, color: '#bcf0ae' },
          { label: 'Confederation', value: team.confederation, color: '#ffb4aa', small: true },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-6 relative overflow-hidden group">
            <NeonAccentBar color={stat.color} />
            <span className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
            <div
              className={`font-headline ${stat.small ? 'text-2xl' : 'text-4xl md:text-5xl'} tracking-wide mt-2`}
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            {stat.showBar && <ChemistryBar value={team.chemistry} showValue={false} size="sm" />}
          </GlassCard>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <ChemistryBar value={team.familiarity} label="Familiarity" />
        </GlassCard>
        <GlassCard className="p-6">
          <ChemistryBar value={team.stability} label="Tactical Stability" />
        </GlassCard>
        <GlassCard className="p-6">
          <ChemistryBar value={team.morale} label="Morale" />
        </GlassCard>
      </div>

      {team.archetypeMatch && (
        <div className="mt-6 glass-panel p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-tertiary/50 to-transparent" />
          <span className="font-label text-xs font-semibold text-tertiary uppercase tracking-widest">Historical Archetype Match</span>
          <p className="text-on-surface mt-2 font-body text-lg">{team.archetypeMatch}</p>
        </div>
      )}
    </section>
  )
}
