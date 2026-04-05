import { describe, expect, it } from 'vitest'

import { TEAMS } from '../../data/teams-meta'
import {
  buildTeamAliasRows as buildTsAliasRows,
  normalizeTeamNameKey,
  resolveTeamSlug,
} from '../team-aliases'
import {
  TEAM_CATALOG,
  buildTeamAliasRows as buildMjsAliasRows,
  resolveTeam,
} from '../../../scripts/lib/team-layer1.mjs'

describe('layer1 path consistency', () => {
  it('keeps the TS and MJS team catalogs aligned', () => {
    const tsCatalog = TEAMS.map((team) => ({
      slug: team.slug,
      name: team.name,
      confederation: team.confederation,
    }))
    const mjsCatalog = TEAM_CATALOG.map((team) => ({
      slug: team.slug,
      name: team.name,
      confederation: team.confederation,
    }))

    expect(mjsCatalog).toEqual(tsCatalog)
  })

  it('resolves core aliases identically across both ingestion paths', () => {
    const aliases = [
      'United States',
      'Korea Republic',
      'Côte d\'Ivoire',
      'Cape Verde',
      'Curaçao',
      'IR Iran',
      'Türkiye',
    ]

    for (const alias of aliases) {
      expect(resolveTeam(alias)?.slug).toBe(resolveTeamSlug(alias))
    }
  })

  it('exposes at least the same normalized aliases in the TS path as the MJS path', () => {
    const tsAliases = new Set(buildTsAliasRows().map((row) => `${row.teamSlug}:${row.aliasKey}`))

    for (const alias of buildMjsAliasRows()) {
      expect(resolveTeamSlug(alias.alias)).toBe(alias.team_slug)
      expect(tsAliases.has(`${alias.team_slug}:${normalizeTeamNameKey(alias.alias)}`)).toBe(true)
    }
  })
})
