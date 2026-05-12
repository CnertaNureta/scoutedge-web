import { getAllPlayers, getPlayersByTeam } from '@/lib/data-service'
import type { Player } from '@/lib/types'

export interface RelatedPlayersOptions {
  sameTeam?: number
  samePosition?: number
}

export interface RelatedPlayersResult {
  teammates: Player[]
  samePosition: Player[]
}

/**
 * Pure helper to surface contextually-related players for the on-page
 * "More from {team}" and "Top {position}" cross-link sections.
 *
 * - `teammates` are other players on the same national team, sorted by
 *   AI rating descending (highest-rated first).
 * - `samePosition` are players from across the tournament that share
 *   the same position. The current player and any teammates that already
 *   appear in `teammates` are filtered out so we maximise unique link
 *   destinations.
 */
export function getRelatedPlayers(
  player: Player,
  { sameTeam = 4, samePosition = 4 }: RelatedPlayersOptions = {}
): RelatedPlayersResult {
  const teammates = getPlayersByTeam(player.teamSlug)
    .filter((p) => p.slug !== player.slug)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, sameTeam)

  const teammateSlugs = new Set(teammates.map((p) => p.slug))

  const samePositionPlayers = getAllPlayers()
    .filter(
      (p) =>
        p.position === player.position &&
        p.slug !== player.slug &&
        !teammateSlugs.has(p.slug) &&
        p.teamSlug !== player.teamSlug
    )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, samePosition)

  return { teammates, samePosition: samePositionPlayers }
}
