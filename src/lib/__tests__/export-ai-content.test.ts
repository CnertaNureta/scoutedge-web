import { describe, expect, it } from 'vitest'

describe('export-ai-content snapshot publishing', () => {
  it('updates duplicate-slug rows by id before falling back to slug', async () => {
    const { markSnapshotPublished } = await import('../../../scripts/export-ai-content.mjs')

    const publishedAt = '2026-04-04T00:00:00.000Z'
    const snapshot = {
      ai_content: [
        { id: 'ai-1', slug: 'daily-briefing', status: 'approved', published_at: null },
        { id: 'ai-2', slug: 'daily-briefing', status: 'approved', published_at: null },
      ],
      narratives: [
        { id: 'nar-1', slug: 'daily-briefing', status: 'approved', published_at: null },
        { id: 'nar-2', slug: 'daily-briefing', status: 'approved', published_at: null },
      ],
    }

    markSnapshotPublished(
      snapshot,
      {
        id: 'ai-2',
        slug: 'daily-briefing',
        source_narrative_id: 'nar-2',
      },
      publishedAt
    )

    expect(snapshot.ai_content).toEqual([
      { id: 'ai-1', slug: 'daily-briefing', status: 'approved', published_at: null },
      { id: 'ai-2', slug: 'daily-briefing', status: 'published', published_at: publishedAt },
    ])
    expect(snapshot.narratives).toEqual([
      { id: 'nar-1', slug: 'daily-briefing', status: 'approved', published_at: null },
      { id: 'nar-2', slug: 'daily-briefing', status: 'published', published_at: publishedAt },
    ])
  })
})
