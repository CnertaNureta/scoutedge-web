import { describe, expect, it } from 'vitest'

import {
  buildTeamAliasRows,
  getCanonicalTeamName,
  normalizeTeamNameKey,
  resolveTeamSlug,
} from '../team-aliases'

describe('team aliases', () => {
  it('normalizes names consistently', () => {
    expect(normalizeTeamNameKey('Côte d\'Ivoire')).toBe('cote-d-ivoire')
    expect(normalizeTeamNameKey('Korea Republic')).toBe('korea-republic')
  })

  it('resolves common provider aliases to canonical team slugs', () => {
    expect(resolveTeamSlug('United States')).toBe('usa')
    expect(resolveTeamSlug('Korea Republic')).toBe('south-korea')
    expect(resolveTeamSlug('Côte d\'Ivoire')).toBe('ivory-coast')
    expect(resolveTeamSlug('Cape Verde Islands')).toBe('cabo-verde')
    expect(resolveTeamSlug('Curaçao')).toBe('curacao')
    expect(resolveTeamSlug('IR Iran')).toBe('iran')
    expect(resolveTeamSlug('Türkiye')).toBe('turkey')
  })

  it('emits unique alias rows per normalized key', () => {
    const rows = buildTeamAliasRows()
    const keys = new Set(rows.map((row) => row.aliasKey))
    expect(keys.size).toBe(rows.length)
  })

  it('returns canonical team names', () => {
    expect(getCanonicalTeamName('usa')).toBe('USA')
    expect(getCanonicalTeamName('cabo-verde')).toBe('Cabo Verde')
  })
})
