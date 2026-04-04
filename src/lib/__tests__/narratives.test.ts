import { describe, expect, it } from 'vitest'
import {
  buildDailyBriefingBundle,
  buildMatchPreviewBundle,
  buildSampleNarrativeBundles,
  parseNarrativeStatus,
} from '@/lib/narratives'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { TEAMS } from '@/data/teams-meta'

describe('narrative pipeline builders', () => {
  it('builds a fact-anchored match preview bundle', () => {
    const bundle = buildMatchPreviewBundle(MATCH_FIXTURES[0], {
      status: 'approved',
      sourceDate: '2026-06-11',
    })

    expect(bundle.narrative.content_type).toBe('match_preview')
    expect(bundle.aiContent.content_type).toBe('match_preview')
    expect(bundle.narrative.status).toBe('approved')
    expect(bundle.aiContent.status).toBe('approved')
    expect(bundle.narrative.cache_key).toContain('match_preview')
    expect(bundle.narrative.facts_used.length).toBeGreaterThanOrEqual(8)
    expect(bundle.aiContent.related_team_ids).toEqual(['mexico', 'south-africa'])
    expect(bundle.aiContent.full_content).toContain('## Fact Anchors')
    expect(bundle.aiContent.full_content).toContain('This narrative does not speculate')
  })

  it('builds a publishable daily briefing bundle', () => {
    const bundle = buildDailyBriefingBundle({
      status: 'draft',
      sourceDate: '2026-04-02',
    })

    expect(bundle.narrative.content_type).toBe('daily_briefing')
    expect(bundle.aiContent.slug).toBe('world-cup-2026-daily-briefing-2026-04-02')
    expect(bundle.narrative.facts_used.length).toBeGreaterThanOrEqual(6)
    expect(bundle.aiContent.full_content).toContain('## What This Briefing Can Safely Say')
    expect(bundle.aiContent.related_team_ids.length).toBeGreaterThanOrEqual(6)
  })

  it('only includes fixtures that are still upcoming on the source date', () => {
    const sourceDate = '2026-06-20'
    const bundle = buildDailyBriefingBundle({
      status: 'draft',
      sourceDate,
    })

    const teamBySlug = new Map(TEAMS.map((team) => [team.slug, team.name]))
    const expectedFixtureLabels = MATCH_FIXTURES
      .filter((fixture) => fixture.kickoffUtc >= `${sourceDate}T00:00:00Z`)
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
      .slice(0, 3)
      .map((fixture) => (
        `${teamBySlug.get(fixture.homeTeamSlug)} vs ${teamBySlug.get(fixture.awayTeamSlug)}`
      ))

    const actualFixtureLabels = bundle.narrative.facts_used
      .filter((fact) => fact.source === 'match-fixtures')
      .map((fact) => fact.label)

    expect(actualFixtureLabels).toEqual(expectedFixtureLabels)
  })

  it('creates the two required sample narratives', () => {
    const bundles = buildSampleNarrativeBundles({
      status: 'approved',
      sourceDate: '2026-04-02',
    })

    expect(bundles).toHaveLength(2)
    expect(bundles.map((bundle) => bundle.narrative.content_type)).toEqual([
      'match_preview',
      'daily_briefing',
    ])
  })

  it('parses supported statuses and falls back safely', () => {
    expect(parseNarrativeStatus('published')).toBe('published')
    expect(parseNarrativeStatus('unexpected-value', 'approved')).toBe('approved')
    expect(parseNarrativeStatus(undefined)).toBe('draft')
  })
})
