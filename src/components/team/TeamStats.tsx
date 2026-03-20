import type { Team } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'

interface TeamStatsProps {
  team: Team
}

export default function TeamStats({ team }: TeamStatsProps) {
  return (
    <section className="max-w-[1440px] mx-auto px-6 -mt-12 relative z-30 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <GlassCard className="p-6">
          <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest">FIFA Ranking</span>
          <div className="font-headline text-4xl md:text-5xl font-black text-primary mt-2">#{team.fifaRanking}</div>
        </GlassCard>
        <GlassCard className="p-6">
          <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest">Chemistry</span>
          <div className="font-headline text-4xl md:text-5xl font-black text-tertiary mt-2">{team.chemistry}</div>
          <ChemistryBar value={team.chemistry} showValue={false} size="sm" />
        </GlassCard>
        <GlassCard className="p-6">
          <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest">Group</span>
          <div className="font-headline text-4xl md:text-5xl font-black text-on-surface mt-2">{team.group}</div>
        </GlassCard>
        <GlassCard className="p-6">
          <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest">Confederation</span>
          <div className="font-headline text-2xl font-black text-on-surface mt-2">{team.confederation}</div>
        </GlassCard>
      </div>

      {/* Chemistry Breakdown */}
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
        <div className="mt-6 glass-panel p-6 rounded-xl border border-white/10">
          <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest">Historical Archetype Match</span>
          <p className="text-on-surface mt-2 font-body text-lg">{team.archetypeMatch}</p>
        </div>
      )}
    </section>
  )
}
