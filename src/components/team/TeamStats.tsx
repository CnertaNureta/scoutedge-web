import type { Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import TeamColorSection from '@/components/ui/TeamColorSection'
import StatsRibbon from '@/components/ui/StatsRibbon'
import ChemistryBar from '@/components/ui/ChemistryBar'
import GlassCard from '@/components/ui/GlassCard'
import { SURFACE } from '@/lib/brand-tokens'

interface TeamStatsProps {
  team: Team
}

export default function TeamStats({ team }: TeamStatsProps) {
  const colors = getTeamColors(team.slug)

  const ribbonStats = [
    { label: 'Chemistry', value: team.chemistry, suffix: '' },
    { label: 'Familiarity', value: team.familiarity, suffix: '' },
    { label: 'Stability', value: team.stability, suffix: '' },
    { label: 'Morale', value: team.morale, suffix: '' },
    { label: 'FIFA Ranking', value: team.fifaRanking, prefix: '#' },
  ]

  return (
    <>
      {/* Full-width Stats Ribbon with team color */}
      <TeamColorSection
        teamColor={colors.primary}
        opacity={0.1}
        borderOpacity={0.25}
        className="py-10 md:py-14 -mt-8 relative z-30"
      >
        <div className="max-w-[1440px] mx-auto px-6">
          <StatsRibbon stats={ribbonStats} accentColor={colors.glow} />
        </div>
      </TeamColorSection>

      {/* Detailed metrics */}
      <section data-testid="team-stats" className="page-container mt-10 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <ChemistryBar value={team.familiarity} label="Familiarity" />
            <p className="text-on-surface-variant text-xs mt-3 leading-relaxed">
              How long the squad has played together. Higher = more instinctive understanding on the pitch.
            </p>
          </GlassCard>
          <GlassCard className="p-6">
            <ChemistryBar value={team.stability} label="Tactical Stability" />
            <p className="text-on-surface-variant text-xs mt-3 leading-relaxed">
              How settled the coaching setup and formation are. Frequent changes lower this score.
            </p>
          </GlassCard>
          <GlassCard className="p-6">
            <ChemistryBar value={team.morale} label="Morale" />
            <p className="text-on-surface-variant text-xs mt-3 leading-relaxed">
              Current squad confidence. Driven by recent results, fan support, and media sentiment.
            </p>
          </GlassCard>
        </div>

        {team.archetypeMatch && (
          <div
            className="mt-6 p-6 rounded-2xl border relative overflow-hidden"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 6%, ${SURFACE.surfaceContainer})`,
              borderColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(to right, transparent, ${colors.primary}50, transparent)`,
              }}
            />
            <span className="font-label text-xs font-semibold uppercase tracking-widest" style={{ color: colors.glow }}>
              Historical Archetype Match
            </span>
            <p className="text-on-surface mt-2 font-body text-lg">{team.archetypeMatch}</p>
            <p className="text-on-surface-variant text-xs mt-2">
              A past World Cup team whose playing style and trajectory most closely resemble this squad.
            </p>
          </div>
        )}
      </section>
    </>
  )
}
