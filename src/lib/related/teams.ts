import { getTeamsByGroup } from '@/lib/data-service'
import type { Team } from '@/lib/types'

/**
 * Returns the other teams that share a group with the given team.
 * Used to build the "Group X Rivals" cross-link section. Sorted by FIFA
 * ranking ascending so the strongest rival appears first.
 */
export function getGroupRivals(team: Team): Team[] {
  return getTeamsByGroup(team.group)
    .filter((entry) => entry.slug !== team.slug)
    .sort((a, b) => a.fifaRanking - b.fifaRanking)
}
