import { TEAMS } from '../data/teams-meta.ts'
import { slugify } from './utils.ts'

export interface TeamAliasRow {
  aliasKey: string
  aliasName: string
  teamSlug: string
}

const EXPLICIT_TEAM_ALIASES: Record<string, string[]> = {
  usa: ['United States', 'United States of America', 'US', 'U.S.A.', 'USMNT'],
  'south-korea': ['Korea Republic', 'Republic of Korea', 'Korea, South'],
  'saudi-arabia': ['Saudi'],
  'ivory-coast': ['Cote d\'Ivoire', 'Côte d\'Ivoire', 'Cote D Ivoire', 'Cote d Ivoire'],
  curacao: ['Curaçao'],
  'cabo-verde': ['Cape Verde', 'Cape Verde Islands'],
  iran: ['IR Iran', 'Iran IR'],
  turkey: ['Türkiye', 'Turkiye'],
  netherlands: ['The Netherlands', 'Holland'],
  'south-africa': ['RSA'],
  'new-zealand': ['NZ'],
  'tbd-playoff-i': ['TBD Playoff I', 'Playoff I'],
  'tbd-playoff-k': ['TBD Playoff K', 'Playoff K'],
}

const TEAM_NAME_BY_SLUG = new Map(TEAMS.map((team) => [team.slug, team.name]))

export function normalizeTeamNameKey(value: string): string {
  return slugify(
    value
      .replace(/\bmen'?s\b/gi, '')
      .replace(/\bnational team\b/gi, '')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/&/g, ' and ')
      .trim()
  )
}

function implicitAliasesForTeam(teamSlug: string, teamName: string): string[] {
  const titleFromSlug = teamSlug
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

  return [teamName, teamSlug, titleFromSlug]
}

function uniqueAliases(values: string[]): string[] {
  const seen = new Set<string>()
  const aliases: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue

    const key = normalizeTeamNameKey(trimmed)
    if (!key || seen.has(key)) continue

    seen.add(key)
    aliases.push(trimmed)
  }

  return aliases
}

export function getAliasesForTeam(teamSlug: string): string[] {
  const teamName = TEAM_NAME_BY_SLUG.get(teamSlug)
  if (!teamName) return []

  return uniqueAliases([
    ...implicitAliasesForTeam(teamSlug, teamName),
    ...(EXPLICIT_TEAM_ALIASES[teamSlug] || []),
  ])
}

export function buildTeamAliasRows(): TeamAliasRow[] {
  const rows: TeamAliasRow[] = []

  for (const team of TEAMS) {
    for (const aliasName of getAliasesForTeam(team.slug)) {
      rows.push({
        aliasKey: normalizeTeamNameKey(aliasName),
        aliasName,
        teamSlug: team.slug,
      })
    }
  }

  return rows
}

const TEAM_ALIAS_INDEX = new Map(
  buildTeamAliasRows().map((row) => [row.aliasKey, row.teamSlug])
)

export function resolveTeamSlug(nameOrSlug: string): string | null {
  return TEAM_ALIAS_INDEX.get(normalizeTeamNameKey(nameOrSlug)) || null
}

export function getCanonicalTeamName(teamSlug: string): string {
  return TEAM_NAME_BY_SLUG.get(teamSlug) || teamSlug
}

export function teamSlugToCommonName(teamSlug: string): string {
  return getCanonicalTeamName(teamSlug)
}
