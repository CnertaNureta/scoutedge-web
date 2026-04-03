import { describe, expect, it } from 'vitest'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { PREDICTION_CONTEXTS } from '@/data/prediction-contexts'
import { MATCH_CONTEXT_MODEL_VERSION } from '@/lib/prediction-context'
import { getPredictionContextByMatchId, getPredictionContextByTeamPair, getPredictionContexts } from '@/lib/data-service'

describe('prediction contexts', () => {
  it('generates one match_context record for every fixture', () => {
    expect(PREDICTION_CONTEXTS).toHaveLength(MATCH_FIXTURES.length)

    const uniqueIds = new Set(PREDICTION_CONTEXTS.map((record) => record.match_id))
    expect(uniqueIds.size).toBe(MATCH_FIXTURES.length)
  })

  it('includes confidence intervals, ordered key factors, and model version for every record', () => {
    for (const record of PREDICTION_CONTEXTS) {
      const { match_context: matchContext } = record
      expect(record.model_version).toBe(MATCH_CONTEXT_MODEL_VERSION)
      expect(matchContext.model_version).toBe(MATCH_CONTEXT_MODEL_VERSION)

      expect(matchContext.confidence_interval.level).toBe(0.8)
      expect(matchContext.confidence_interval.confidence_score).toBeGreaterThanOrEqual(0.36)
      expect(matchContext.confidence_interval.confidence_score).toBeLessThanOrEqual(0.87)

      for (const band of [
        matchContext.confidence_interval.home_win,
        matchContext.confidence_interval.draw,
        matchContext.confidence_interval.away_win,
      ]) {
        expect(band.lower).toBeLessThanOrEqual(band.point)
        expect(band.point).toBeLessThanOrEqual(band.upper)
        expect(band.lower).toBeGreaterThanOrEqual(0.01)
        expect(band.upper).toBeLessThanOrEqual(0.98)
      }

      expect(matchContext.key_factors.length).toBeGreaterThanOrEqual(4)
      expect(matchContext.key_factors[0].impact_score).toBeGreaterThanOrEqual(
        matchContext.key_factors[1].impact_score
      )
      expect(matchContext.key_factors[1].impact_score).toBeGreaterThanOrEqual(
        matchContext.key_factors[2].impact_score
      )
      expect(matchContext.key_factors[2].impact_score).toBeGreaterThanOrEqual(
        matchContext.key_factors[3].impact_score
      )

      for (const factor of matchContext.key_factors) {
        expect(factor.direction === 'home' || factor.direction === 'away').toBe(true)
        expect(factor.summary.length).toBeGreaterThan(40)
        expect(factor.explanation.length).toBeGreaterThan(100)
      }
    }
  })

  it('produces complete narrative-ready JSON for representative matches', () => {
    const sampleIds = [
      '2026-06-11_mexico_vs_south-africa',
      '2026-06-12_morocco_vs_brazil',
      '2026-06-14_portugal_vs_iran',
    ]

    const samples = sampleIds.map((matchId) => {
      const record = PREDICTION_CONTEXTS.find((item) => item.match_id === matchId)
      expect(record).toBeDefined()
      return record!.match_context
    })

    for (const sample of samples) {
      expect(sample.home_team.featured_players.length).toBeGreaterThan(0)
      expect(sample.away_team.featured_players.length).toBeGreaterThan(0)
      expect(sample.key_factors[0].title).toContain(sample.key_factors[0].team_name)
      expect(sample.confidence_interval.rationale.length).toBeGreaterThan(80)
      expect(sample.probabilities.favorite_edge).toBeGreaterThan(0)
    }
  })

  it('keeps playoff fixtures valid even when roster completeness is lower', () => {
    const playoffRecord = PREDICTION_CONTEXTS.find(
      (record) => record.away_team_slug === 'tbd-playoff-i' || record.home_team_slug === 'tbd-playoff-i'
    )

    expect(playoffRecord).toBeDefined()
    expect(playoffRecord!.match_context.confidence_interval.confidence_score).toBeLessThan(0.75)
    expect(playoffRecord!.match_context.key_factors.length).toBeGreaterThanOrEqual(4)
  })

  it('exposes prediction contexts from data-service', () => {
    expect(getPredictionContexts()).toHaveLength(PREDICTION_CONTEXTS.length)

    const firstFixture = MATCH_FIXTURES[0]
    const firstRecord = getPredictionContextByMatchId(`${firstFixture.kickoffUtc.slice(0, 10)}_${firstFixture.homeTeamSlug}_vs_${firstFixture.awayTeamSlug}`)
    expect(firstRecord).toBeDefined()
    expect(firstRecord!.match_id).toBe(firstFixture.kickoffUtc.slice(0, 10) + `_${firstFixture.homeTeamSlug}_vs_${firstFixture.awayTeamSlug}`)
    expect(
      getPredictionContextByTeamPair(firstFixture.homeTeamSlug, firstFixture.awayTeamSlug)?.match_id
    ).toBe(firstRecord!.match_id)
  })
})
