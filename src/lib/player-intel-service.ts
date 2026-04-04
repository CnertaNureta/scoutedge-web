import generatedPlayerIntel from '@/data/generated-player-intel.json'
import type { Player, PlayerIntelRecord } from '@/lib/types'

const PLAYER_INTEL = generatedPlayerIntel as PlayerIntelRecord[]

function buildPlayerKey(teamSlug: string, playerSlug: string): string {
  return `${teamSlug}::${playerSlug}`
}

const intelByPlayerSlug = new Map(
  PLAYER_INTEL.map((intel) => [buildPlayerKey(intel.team_slug, intel.player_slug), intel])
)

export function getAllPlayerIntel(): PlayerIntelRecord[] {
  return PLAYER_INTEL
}

export function getPlayerIntelBySlug(teamSlug: string, playerSlug: string): PlayerIntelRecord | undefined {
  return intelByPlayerSlug.get(buildPlayerKey(teamSlug, playerSlug))
}

export function mergePlayerWithIntel(player: Player): Player {
  const intel = getPlayerIntelBySlug(player.teamSlug, player.slug)
  if (!intel) return player

  return {
    ...player,
    fitnessStatus: intel.fitness_status,
    fitnessNote: intel.fitness_note,
    sentimentScore: intel.morale_score,
    sentimentLabel: intel.morale_label,
    recentSignals: intel.recent_signals,
    tacticalRisk: intel.tactical_risk,
    tacticalNote: intel.tactical_note,
    selectionRisk: intel.selection_risk,
    selectionNote: intel.selection_note,
    intelLastUpdated: intel.last_updated,
    intelSignalCount: intel.signal_count,
  }
}
