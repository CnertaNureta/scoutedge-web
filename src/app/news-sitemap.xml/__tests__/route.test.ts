import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/blog-service', () => ({
  getAllPosts: vi.fn(() => []),
}))

vi.mock('@/data/world-cup-seo-pages', () => ({
  WORLD_CUP_SEO_PAGES: [
    {
      slug: 'tickets',
      title: 'World Cup 2026 Tickets: Sale Dates, Prices and Buying Guide',
      metaTitle: 'World Cup 2026 Tickets',
      description: 'Track World Cup 2026 ticket sale phases and official FIFA channels.',
      badge: 'Ticket Guide',
      primaryKeyword: 'world cup 2026 tickets',
      updated: '2026-05-14',
      searchSignals: [],
      metrics: [],
      sections: [],
      faqs: [],
      relatedLinks: [],
      sitemap: { changeFrequency: 'daily', priority: 1 },
      contentType: 'editorial',
      publishedAt: '2026-05-14T08:00:00.000Z',
    },
  ],
}))

describe('GET /news-sitemap.xml', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns 200 with application/xml and recent editorial entries even when there are no recent posts', async () => {
    const { GET } = await import('../route')
    const response = GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')

    const body = await response.text()
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain('<urlset')
    expect(body).toContain('</urlset>')
    expect(body).toContain('<url>')
    expect(body).toContain('https://kickoracle.com/en/world-cup-2026/tickets')
  })

  it('emits a cache-control header', async () => {
    const { GET } = await import('../route')
    const response = GET()
    expect(response.headers.get('cache-control')).toMatch(/max-age=\d+/)
  })
})
