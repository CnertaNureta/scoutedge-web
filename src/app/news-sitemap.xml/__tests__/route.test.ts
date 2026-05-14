import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/blog-service', () => ({
  getAllPosts: vi.fn(() => []),
}))

describe('GET /news-sitemap.xml', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 200 with application/xml even when there are no recent posts', async () => {
    const { GET } = await import('../route')
    const response = GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')

    const body = await response.text()
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain('<urlset')
    expect(body).toContain('</urlset>')
    expect(body).not.toContain('<url>')
  })

  it('emits a cache-control header', async () => {
    const { GET } = await import('../route')
    const response = GET()
    expect(response.headers.get('cache-control')).toMatch(/max-age=\d+/)
  })
})
