import type { Team, Player } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import TeamRadar from '@/components/team/TeamRadar'
import type { TeamRadarStats } from '@/components/team/TeamRadar'

interface TacticalDNAProps {
  team: Team
  players: Player[]
}

function computeTeamRadarStats(team: Team, players: Player[]): TeamRadarStats {
  const fwd = players.filter((p) => p.position === 'FWD')
  const mid = players.filter((p) => p.position === 'MID')
  const defGk = players.filter((p) => p.position === 'DEF' || p.position === 'GK')

  const avgRating = (group: Player[]) =>
    group.length > 0
      ? Math.round((group.reduce((sum, p) => sum + p.rating, 0) / group.length) * 10)
      : 50

  const avgCaps = players.length > 0
    ? players.reduce((sum, p) => sum + p.caps, 0) / players.length
    : 0
  const expNormalized = Math.min(99, Math.round((avgCaps / 100) * 99))

  const fitCount = players.filter((p) => p.fitnessStatus === 'green').length
  const fitNormalized = players.length > 0
    ? Math.min(99, Math.round((fitCount / players.length) * 99))
    : 50

  return {
    atk: Math.min(99, avgRating(fwd)),
    mid: Math.min(99, avgRating(mid)),
    def: Math.min(99, avgRating(defGk)),
    chm: Math.min(99, team.chemistry),
    exp: expNormalized,
    fit: fitNormalized,
  }
}

export default function TacticalDNA({ team, players }: TacticalDNAProps) {
  const colors = getTeamColors(team.slug)
  const radarStats = computeTeamRadarStats(team, players)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
        Tactical DNA
      </h2>
      <GlassCard className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <TeamRadar
            stats={radarStats}
            teamGlow={colors.glow}
            teamPrimary={colors.primary}
          />
          <div className="space-y-4">
            <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
              The radar chart shows six key dimensions of team strength. Bigger area = stronger overall squad.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
              <ul className="space-y-1.5 text-xs text-on-surface-variant">
                <li><span className="text-on-surface font-semibold">ATK</span> — Attacking quality: how dangerous the forwards are</li>
                <li><span className="text-on-surface font-semibold">MID</span> — Midfield control: ability to dominate possession</li>
                <li><span className="text-on-surface font-semibold">DEF</span> — Defensive solidity: how hard they are to score against</li>
                <li><span className="text-on-surface font-semibold">CHM</span> — Chemistry: how well the team plays as a unit</li>
                <li><span className="text-on-surface font-semibold">EXP</span> — Experience: average international caps per player</li>
                <li><span className="text-on-surface font-semibold">FIT</span> — Fitness: percentage of squad fully fit for the tournament</li>
              </ul>
            </div>
            <ChemistryBar value={team.familiarity} label="Familiarity" />
            <ChemistryBar value={team.stability} label="Tactical Stability" />
            <ChemistryBar value={team.morale} label="Morale" />
            <ChemistryBar value={team.chemistry} label="Chemistry Index" />

            {team.archetypeMatch && (
              <div className="bg-surface-container-low rounded-lg p-4 border border-white/5 mt-4">
                <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest">
                  Historical Archetype Match
                </span>
                <p className="font-body text-base text-on-surface mt-1">
                  {team.archetypeMatch}
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </section>
  )
}
