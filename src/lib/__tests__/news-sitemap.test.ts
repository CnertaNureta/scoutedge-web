import { describe, expect, it } from 'vitest'
import type { BlogPost } from '@/lib/blog-service'
import { getRecentNewsPosts, newsSitemapToXml } from '@/lib/news-sitemap'

function post(overrides: Partial<BlogPost>): BlogPost {
  return {
    slug: 'world-cup-test',
    title: 'World Cup test',
    description: '',
    keywords: ['world cup', 'test'],
    date: '2026-04-30',
    lastUpdated: '2026-04-30',
    author: 'KickOracle AI',
    category: 'Article',
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

  it('keeps only recent long-form posts eligible for Google News', () => {
    const recent = post({ slug: 'recent', publishedAt: '2026-04-30T08:00:00.000Z' })
    const old = post({ slug: 'old', publishedAt: '2026-04-20T08:00:00.000Z' })
    const thin = post({ slug: 'thin', publishedAt: '2026-04-30T08:00:00.000Z', wordCount: 399 })

    expect(getRecentNewsPosts([recent, old, thin], now)).toEqual([recent])
  })

  it('serializes required Google News tags and escapes text', () => {
    const xml = newsSitemapToXml([
      post({
        slug: 'brazil-news',
        title: 'Brazil & Morocco <Preview>',
        keywords: ['Brazil', 'Morocco', 'World Cup', 'AI', 'Preview', 'Extra'],
        publishedAt: '2026-04-30T08:00:00.000Z',
      }),
    ])

    expect(xml).toContain('<loc>https://kickoracle.com/blog/brazil-news</loc>')
    expect(xml).toContain('<news:name>KickOracle</news:name>')
    expect(xml).toContain('<news:language>en</news:language>')
    expect(xml).toContain('<news:publication_date>2026-04-30T08:00:00.000Z</news:publication_date>')
    expect(xml).toContain('<news:title>Brazil &amp; Morocco &lt;Preview&gt;</news:title>')
    expect(xml).toContain('<news:keywords>Brazil, Morocco, World Cup, AI, Preview</news:keywords>')
  })
})
