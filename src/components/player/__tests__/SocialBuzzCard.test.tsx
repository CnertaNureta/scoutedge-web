import { describe, expect, it } from 'vitest'
import { computeBuzzSummary } from '../SocialBuzzCard'
import type { PlayerSocialProfile } from '@/data/player-social'

const NOW = new Date('2026-05-15T12:00:00Z')

function makeSocial(overrides: Partial<PlayerSocialProfile> = {}): PlayerSocialProfile {
  return {
    playerSlug: 'test-player',
    teamSlug: 'test-team',
    platforms: {
      instagram: { handle: '@test', followers: '10M', recentEngagement: '500K avg' },
    },
    buzzScore: 80,
    recentPosts: [
      { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'positive', engagement: '1M likes' },
      { date: '2026-05-20', platform: 'Instagram', summary: 'B', sentiment: 'positive', engagement: '900K likes' },
    ],
    trending: true,
    ...overrides,
  }
}

describe('computeBuzzSummary', () => {
  it('classifies high buzz + positive sentiment as tailwind', () => {
    const result = computeBuzzSummary(
      makeSocial({
        buzzScore: 90,
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'positive', engagement: '1M' },
          { date: '2026-05-20', platform: 'Twitter', summary: 'B', sentiment: 'positive', engagement: '500K' },
        ],
      }),
    )
    expect(result.verdictKey).toBe('tailwind')
    expect(result.buzz).toBe(90)
    expect(result.sentiment).toBe(100)
  })

  it('classifies high buzz + negative sentiment as headwind', () => {
    const result = computeBuzzSummary(
      makeSocial({
        buzzScore: 85,
        recentPosts: [
          { date: '2026-05-25', platform: 'Twitter', summary: 'A', sentiment: 'negative', engagement: '50K' },
          { date: '2026-05-20', platform: 'Twitter', summary: 'B', sentiment: 'negative', engagement: '60K' },
        ],
      }),
    )
    expect(result.verdictKey).toBe('headwind')
    expect(result.sentiment).toBe(0)
  })

  it('returns noChatter verdict for empty/undefined data', () => {
    const result = computeBuzzSummary(undefined)
    expect(result.verdictKey).toBe('noChatter')
    expect(result.buzz).toBe(0)
    expect(result.sentiment).toBe(50)
    expect(result.delta).toBe(0)
    expect(result.platformCount).toBe(0)
  })

  it('classifies low buzz with neutral sentiment as quiet', () => {
    const result = computeBuzzSummary(
      makeSocial({
        buzzScore: 40,
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'neutral', engagement: '10K' },
        ],
      }),
    )
    expect(result.verdictKey).toBe('quiet')
  })

  it('classifies as mixed when buzz is low but sentiment is strongly polar', () => {
    const result = computeBuzzSummary(
      makeSocial({
        buzzScore: 50,
        recentPosts: [
          { date: '2026-05-25', platform: 'Twitter', summary: 'A', sentiment: 'negative', engagement: '5K' },
          { date: '2026-05-20', platform: 'Twitter', summary: 'B', sentiment: 'negative', engagement: '5K' },
        ],
      }),
    )
    expect(result.verdictKey).toBe('mixed')
  })

  it('normalizes sentiment to the 0..100 range', () => {
    const allPositive = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'positive', engagement: '1M' },
        ],
      }),
    )
    expect(allPositive.sentiment).toBeGreaterThanOrEqual(0)
    expect(allPositive.sentiment).toBeLessThanOrEqual(100)
    expect(allPositive.sentiment).toBe(100)

    const allNegative = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-25', platform: 'Twitter', summary: 'A', sentiment: 'negative', engagement: '5K' },
        ],
      }),
    )
    expect(allNegative.sentiment).toBe(0)

    const neutral = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'neutral', engagement: '10K' },
        ],
      }),
    )
    expect(neutral.sentiment).toBe(50)

    const mixed = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'positive', engagement: '1M' },
          { date: '2026-05-20', platform: 'Twitter', summary: 'B', sentiment: 'negative', engagement: '5K' },
        ],
      }),
    )
    expect(mixed.sentiment).toBe(50)
  })

  it('computes delta as (positive - negative) * 5 clamped to [-50, 50]', () => {
    const result = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-25', platform: 'Instagram', summary: 'A', sentiment: 'positive', engagement: '1M' },
          { date: '2026-05-20', platform: 'Twitter', summary: 'B', sentiment: 'positive', engagement: '500K' },
          { date: '2026-05-15', platform: 'Twitter', summary: 'C', sentiment: 'negative', engagement: '5K' },
        ],
      }),
    )
    // 2 positive - 1 negative = 1 * 5 = 5
    expect(result.delta).toBe(5)
  })

  it('counts distinct platforms', () => {
    const result = computeBuzzSummary(
      makeSocial({
        platforms: {
          instagram: { handle: '@a', followers: '1', recentEngagement: '1' },
          twitter: { handle: '@a', followers: '1', recentEngagement: '1' },
          tiktok: { handle: '@a', followers: '1', recentEngagement: '1' },
        },
      }),
    )
    expect(result.platformCount).toBe(3)
  })

  it('limits topPosts to 3 entries', () => {
    const result = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-30', platform: 'A', summary: 'A', sentiment: 'positive', engagement: '1' },
          { date: '2026-05-29', platform: 'B', summary: 'B', sentiment: 'positive', engagement: '1' },
          { date: '2026-05-28', platform: 'C', summary: 'C', sentiment: 'positive', engagement: '1' },
          { date: '2026-05-27', platform: 'D', summary: 'D', sentiment: 'positive', engagement: '1' },
        ],
      }),
    )
    expect(result.topPosts.length).toBe(3)
  })

  it('clamps future-dated post metadata to the current refresh time', () => {
    const result = computeBuzzSummary(
      makeSocial({
        recentPosts: [
          { date: '2026-05-30', platform: 'A', summary: 'Future', sentiment: 'positive', engagement: '1' },
          { date: '2026-05-10', platform: 'B', summary: 'Past', sentiment: 'neutral', engagement: '1' },
        ],
      }),
      NOW,
    )

    expect(result.lastUpdatedAt).toBe(NOW.toISOString())
  })
})
