import { TEAMS } from '@/data/teams-meta'
import { PLAYERS } from '@/data/players-data'
import type { Team, Player, WorldCupHistory, Venue, TeamTimezone } from '@/lib/types'
import worldCupHistoryData from '@/data/world-cup-history.json'
import venuesData from '@/data/venues.json'
import timezoneData from '@/data/timezone-adjustments.json'

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

export function getWorldCupHistory(teamSlug: string): WorldCupHistory | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teams = (worldCupHistoryData as any).teams
  const entry = teams[teamSlug]
  if (!entry || entry.totalAppearances === null) return undefined
  return entry as WorldCupHistory
}

export function getAllVenues(): Venue[] {
  return (venuesData as { venues: Venue[] }).venues
}

export function getTeamTimezone(teamSlug: string): TeamTimezone | undefined {
  const teamTimezones = (timezoneData as { teamHomeTimezones: Record<string, TeamTimezone> }).teamHomeTimezones
  return teamTimezones[teamSlug]
}

export function getJetLagTier(teamSlug: string): string | undefined {
  const tiers = (timezoneData as { jetLagRiskTiers: Array<{ tier: string; teams: string[] }> }).jetLagRiskTiers
  const tier = tiers.find(t => t.teams.includes(teamSlug))
  return tier?.tier
}
