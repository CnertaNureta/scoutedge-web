import { describe, expect, it } from 'vitest'
import { articleJsonLd, sportsEventJsonLd } from '@/lib/og-utils'

describe('sportsEventJsonLd', () => {
  it('does not emit a generic nested SportsEvent that Google validates as an incomplete event', () => {
    const event = sportsEventJsonLd({
      homeName: 'Brazil',
      awayName: 'Morocco',
      homeSlug: 'brazil',
      awaySlug: 'morocco',
      venue: 'MetLife Stadium',
      city: 'New York',
      countryCode: 'US',
      kickoffUtc: '2026-06-13T22:00:00Z',
    })

    expect(event).not.toHaveProperty('superEvent')
    expect(event).toMatchObject({
      '@type': 'SportsEvent',
      location: {
        '@type': 'Place',
        name: 'MetLife Stadium',
      },
    })
  })
})

describe('articleJsonLd', () => {
  it('defaults @type to Article when no type is provided', () => {
    const article = articleJsonLd({
      headline: 'Test',
      description: 'desc',
      url: 'https://kickoracle.com/blog/test',
    })
    expect(article['@type']).toBe('Article')
  })

  it('emits NewsArticle when type=NewsArticle', () => {
    const article = articleJsonLd({
      headline: 'Daily Briefing — May 11',
      description: 'World Cup briefing',
      url: 'https://kickoracle.com/en/blog/world-cup-2026-briefing-2026-05-11',
      type: 'NewsArticle',
      datePublished: '2026-05-11T08:00:00.000Z',
      authorName: 'KickOracle AI',
    })
    expect(article['@type']).toBe('NewsArticle')
    expect(article).toHaveProperty('datePublished', '2026-05-11T08:00:00.000Z')
    expect(article).toHaveProperty('author')
    expect(article).toHaveProperty('publisher')
    expect(article).toHaveProperty('mainEntityOfPage')
  })

  it('emits BlogPosting when type=BlogPosting', () => {
    const article = articleJsonLd({
      headline: 'Brazil preview',
      description: 'desc',
      url: 'https://kickoracle.com/en/blog/brazil-preview',
      type: 'BlogPosting',
    })
    expect(article['@type']).toBe('BlogPosting')
  })

  it('includes keywords and wordCount when provided', () => {
    const article = articleJsonLd({
      headline: 'h',
      description: 'd',
      url: 'https://kickoracle.com/en/blog/x',
      keywords: 'a, b, c',
      wordCount: 1234,
    })
    expect(article).toHaveProperty('keywords', 'a, b, c')
    expect(article).toHaveProperty('wordCount', 1234)
  })
})
