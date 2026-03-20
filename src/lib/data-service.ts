import { TEAMS } from '@/data/teams-meta'
import { PLAYERS } from '@/data/players-data'
import type { Team, Player } from '@/lib/types'

export function getAllTeams(): Team[] {
  return TEAMS
}

export function getTeamBySlug(slug: string): Team | undefined {
  return TEAMS.find((t) => t.slug === slug)
}

export function getTeamsByGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group)
}

export function getAllGroups(): string[] {
  return [...new Set(TEAMS.map((t) => t.group))].sort()
}

export function getPlayersByTeam(teamSlug: string): Player[] {
  return PLAYERS.filter((p) => p.teamSlug === teamSlug)
}

export function getPlayerBySlug(teamSlug: string, playerSlug: string): Player | undefined {
  return PLAYERS.find((p) => p.teamSlug === teamSlug && p.slug === playerSlug)
}

export function getAllPlayers(): Player[] {
  return PLAYERS
}
