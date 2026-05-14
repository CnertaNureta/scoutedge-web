import { describe, expect, it } from 'vitest'
import type { BlogPost } from '@/lib/blog-service'
import {
  getRecentNewsPosts,
  hasRecentNewsPosts,
  newsSitemapToXml,
  NEWS_SITEMAP_URL,
} from '@/lib/news-sitemap'
import { SUPPORTED_LOCALES } from '@/i18n/locales'

function post(overrides: Partial<BlogPost>): BlogPost {
  return {
    slug: 'world-cup-test',
    title: 'World Cup test',
    description: '',
    keywords: ['world cup', 'test'],
    date: '2026-04-30',
    lastUpdated: '2026-04-30',
    author: 'KickOracle AI',
    category: 'Daily Briefing',
    contentType: 'daily_briefing',
    content: '',
    html: '',
    readingTime: 3,
    wordCount: 800,
    faqs: [],
    toc: [],
    ...overrides,
  }
}

describe('news sitemap helpers', () => {
  const now = new Date('2026-04-30T12:00:00.000Z')

  describe('getRecentNewsPosts', () => {
    it('keeps only recent long-form news posts eligible for Google News', () => {
      const recent = post({ slug: 'recent', publishedAt: '2026-04-30T08:00:00.000Z' })
      const old = post({ slug: 'old', publishedAt: '2026-04-20T08:00:00.000Z' })
      const thin = post({ slug: 'thin', publishedAt: '2026-04-30T08:00:00.000Z', wordCount: 399 })

      expect(getRecentNewsPosts([recent, old, thin], now)).toEqual([recent])
    })

    it('excludes posts older than the 48-hour window', () => {
      const justInside = post({ slug: 'inside', publishedAt: '2026-04-28T13:00:00.000Z' })
      const justOutside = post({ slug: 'outside', publishedAt: '2026-04-28T11:00:00.000Z' })

      const recent = getRecentNewsPosts([justInside, justOutside], now)
      expect(recent.map((p) => p.slug)).toEqual(['inside'])
    })

    it('excludes future-dated posts', () => {
      const future = post({ slug: 'future', publishedAt: '2026-05-01T08:00:00.000Z' })
      expect(getRecentNewsPosts([future], now)).toEqual([])
    })

    it('excludes posts that are not news content (regular blog posts)', () => {
      const regularBlog = post({
        slug: 'regular',
        publishedAt: '2026-04-30T08:00:00.000Z',
        category: 'Preview',
        contentType: 'preview',
      })
      expect(getRecentNewsPosts([regularBlog], now)).toEqual([])
    })

    it('accepts daily_briefing contentType', () => {
      const briefing = post({
        slug: 'briefing',
        publishedAt: '2026-04-30T08:00:00.000Z',
        contentType: 'daily_briefing',
      })
      expect(getRecentNewsPosts([briefing], now)).toEqual([briefing])
    })
  })

  describe('hasRecentNewsPosts', () => {
    it('returns true when there is at least one eligible post', () => {
      const recent = post({ slug: 'recent', publishedAt: '2026-04-30T08:00:00.000Z' })
      expect(hasRecentNewsPosts([recent], now)).toBe(true)
    })

    it('returns false when there are no eligible posts', () => {
      const old = post({ slug: 'old', publishedAt: '2026-04-20T08:00:00.000Z' })
      expect(hasRecentNewsPosts([old], now)).toBe(false)
    })

    it('returns false on empty input', () => {
      expect(hasRecentNewsPosts([], now)).toBe(false)
    })
  })

  describe('newsSitemapToXml', () => {
    it('serializes required Google News tags and escapes text', () => {
      const xml = newsSitemapToXml(
        [
          post({
            slug: 'brazil-news',
            title: 'Brazil & Morocco <Preview>',
            keywords: ['Brazil', 'Morocco', 'World Cup', 'AI', 'Preview', 'Extra'],
            publishedAt: '2026-04-30T08:00:00.000Z',
          }),
        ],
        { locales: ['en'] },
      )

      expect(xml).toContain('<loc>https://kickoracle.com/en/blog/brazil-news</loc>')
      expect(xml).toContain('<news:name>KickOracle</news:name>')
      expect(xml).toContain('<news:language>en</news:language>')
      expect(xml).toContain('<news:publication_date>2026-04-30T08:00:00.000Z</news:publication_date>')
      expect(xml).toContain('<news:title>Brazil &amp; Morocco &lt;Preview&gt;</news:title>')
      expect(xml).toContain('<news:keywords>Brazil, Morocco, World Cup, AI, Preview</news:keywords>')
    })

    it('emits one <url> per locale × post using locale-prefixed URLs', () => {
      const xml = newsSitemapToXml(
        [
          post({
            slug: 'multi-locale',
            publishedAt: '2026-04-30T08:00:00.000Z',
          }),
        ],
        { locales: ['en', 'es', 'fr'] },
      )

      expect(xml).toContain('<loc>https://kickoracle.com/en/blog/multi-locale</loc>')
      expect(xml).toContain('<loc>https://kickoracle.com/es/blog/multi-locale</loc>')
      expect(xml).toContain('<loc>https://kickoracle.com/fr/blog/multi-locale</loc>')
      expect(xml).toContain('<news:language>en</news:language>')
      expect(xml).toContain('<news:language>es</news:language>')
      expect(xml).toContain('<news:language>fr</news:language>')

      const urlCount = (xml.match(/<url>/g) ?? []).length
      expect(urlCount).toBe(3)
    })

    it('uses hreflang code for zh (zh-Hans, not zh)', () => {
      const xml = newsSitemapToXml(
        [post({ slug: 'cn', publishedAt: '2026-04-30T08:00:00.000Z' })],
        { locales: ['zh'] },
      )
      expect(xml).toContain('<news:language>zh-Hans</news:language>')
    })

    it('fans out across all 19 supported locales by default', () => {
      const xml = newsSitemapToXml([post({ slug: 'allloc', publishedAt: '2026-04-30T08:00:00.000Z' })])
      const urlCount = (xml.match(/<url>/g) ?? []).length
      expect(urlCount).toBe(SUPPORTED_LOCALES.length)
      expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(19)
    })

    it('caps total URLs at maxUrls (default 1000)', () => {
      // 60 posts × 19 locales = 1140 entries; should cap at 1000
      const posts = Array.from({ length: 60 }, (_, i) =>
        post({ slug: `post-${i}`, publishedAt: '2026-04-30T08:00:00.000Z' }),
      )
      const xml = newsSitemapToXml(posts)
      const urlCount = (xml.match(/<url>/g) ?? []).length
      expect(urlCount).toBeLessThanOrEqual(1000)
      expect(urlCount).toBe(1000)
    })

    it('respects custom maxUrls option', () => {
      const posts = Array.from({ length: 5 }, (_, i) =>
        post({ slug: `post-${i}`, publishedAt: '2026-04-30T08:00:00.000Z' }),
      )
      const xml = newsSitemapToXml(posts, { locales: ['en', 'es'], maxUrls: 3 })
      const urlCount = (xml.match(/<url>/g) ?? []).length
      expect(urlCount).toBe(3)
    })

    it('returns a valid empty urlset when given no posts', () => {
      const xml = newsSitemapToXml([])
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('</urlset>')
      expect(xml).not.toContain('<url>')
    })

    it('declares required XML namespaces', () => {
      const xml = newsSitemapToXml([post({ publishedAt: '2026-04-30T08:00:00.000Z' })], {
        locales: ['en'],
      })
      expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
      expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
    })
  })

  describe('NEWS_SITEMAP_URL', () => {
    it('points at the absolute /news-sitemap.xml URL', () => {
      expect(NEWS_SITEMAP_URL).toBe('https://kickoracle.com/news-sitemap.xml')
    })
  })
})
