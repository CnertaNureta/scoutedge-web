import { describe, expect, it } from 'vitest'
import { computeDifferentiator } from '../DifferentiatorCard'
import type { Player } from '@/lib/types'
import type { PlayerOutlook } from '@/data/player-outlooks'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'FWD',
    number: 9,
    age: 26,
    club: 'Test FC',
    caps: 60,
    goals: 30,
    assists: 12,
    rating: 84,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function makeOutlook(overrides: Partial<PlayerOutlook> = {}): PlayerOutlook {
  return {
    outlook:
      'First sentence about the trait. Second sentence about why defenders struggle. Third sentence about supporting evidence. Fourth sentence that should not appear.',
    keyMatchups: ['Group stage matchup A', 'Round of 16 matchup B'],
    signatureStat: {
      label: 'Career goals',
      value: '100 — joint top of the era',
    },
    ...overrides,
  }
}

describe('computeDifferentiator', () => {
  it('uses outlook prose when an outlook exists', () => {
    const player = makePlayer()
    const outlook = makeOutlook()
    const result = computeDifferentiator(player, outlook)

    expect(result.fromOutlook).toBe(true)
    expect(result.headline).toBe('Career goals')
    // Should contain the first 3 sentences, not the fourth
    expect(result.paragraph).toContain('First sentence about the trait.')
    expect(result.paragraph).toContain('Second sentence about why defenders struggle.')
    expect(result.paragraph).toContain('Third sentence about supporting evidence.')
    expect(result.paragraph).not.toContain('Fourth sentence')
  })

  it('falls back to position template when no outlook is provided', () => {
    const player = makePlayer({ position: 'FWD', goals: 5, caps: 30 })
    const result = computeDifferentiator(player, undefined)

    expect(result.fromOutlook).toBe(false)
    expect(result.headline).toBe('')
    expect(result.paragraph).toBe('')
    // Low goal:cap ratio → wide creator template
    expect(result.traitKey).toBe('fw_wide_creator')
  })

  it('classifies a forward with high goals-per-cap as fw_box_crasher', () => {
    const player = makePlayer({
      position: 'FWD',
      goals: 40,
      caps: 50, // ratio 0.8 > 0.45 → box crasher
    })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('fw_box_crasher')
  })

  it('classifies a forward with low goals-per-cap as fw_wide_creator', () => {
    const player = makePlayer({
      position: 'FWD',
      goals: 5,
      caps: 40, // ratio 0.125 < 0.45 → wide creator
    })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('fw_wide_creator')
  })

  it('classifies a high-rated MID as mid_metronome', () => {
    const player = makePlayer({ position: 'MID', rating: 87 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('mid_metronome')
  })

  it('classifies equivalent 0-10 MID ratings with the same threshold', () => {
    const player = makePlayer({ position: 'MID', rating: 8.7 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('mid_metronome')
  })

  it('classifies a lower-rated MID as mid_press_resistant', () => {
    const player = makePlayer({ position: 'MID', rating: 75 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('mid_press_resistant')
  })

  it('classifies an older DEF as def_aerial', () => {
    const player = makePlayer({ position: 'DEF', age: 31 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('def_aerial')
  })

  it('classifies a younger DEF as def_sweeper', () => {
    const player = makePlayer({ position: 'DEF', age: 24 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('def_sweeper')
  })

  it('classifies a high-rated GK as gk_shotstopper', () => {
    const player = makePlayer({ position: 'GK', rating: 86 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('gk_shotstopper')
  })

  it('classifies a lower-rated GK as gk_sweeper', () => {
    const player = makePlayer({ position: 'GK', rating: 76 })
    const result = computeDifferentiator(player, undefined)
    expect(result.traitKey).toBe('gk_sweeper')
  })

  it('always returns 3 anchor stats keyed to position', () => {
    const fw = computeDifferentiator(makePlayer({ position: 'FWD' }), undefined)
    expect(fw.anchors).toHaveLength(3)
    expect(fw.anchors[0].label).toBe('rating')
    expect(fw.anchors[1].label).toBe('goals')

    const mid = computeDifferentiator(makePlayer({ position: 'MID' }), undefined)
    expect(mid.anchors[1].label).toBe('assists')

    const gk = computeDifferentiator(makePlayer({ position: 'GK' }), undefined)
    expect(gk.anchors[1].label).toBe('caps')
  })
})
