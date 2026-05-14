import { describe, expect, it } from 'vitest'
import { getCityByFixtureCityName, getCityBySlug } from '@/data/cities-data'
import { getPlayerBySlug } from '@/lib/data-service'
import { getSitemapEntries } from '@/lib/sitemap-utils'

describe('routing aliases', () => {
  it('resolves externally documented player slugs to canonical player records', () => {
    const player = getPlayerBySlug('brazil', 'vinicius-junior')

    expect(player?.slug).toBe('vinicius-jr')
    expect(player?.name).toContain('Vin')
  })

  it('resolves stadium-city aliases to the canonical host city page', () => {
    const city = getCityBySlug('east-rutherford')

    expect(city?.slug).toBe('new-york')
    expect(city?.name).toBe('New York / New Jersey')
  })

  it.each([
    ['Arlington', 'dallas'],
    ['East Rutherford', 'new-york'],
    ['Foxborough', 'boston'],
    ['Inglewood', 'los-angeles'],
    ['Santa Clara', 'san-francisco'],
  ])('maps fixture venue city %s to canonical host city %s', (fixtureCity, citySlug) => {
    const city = getCityByFixtureCityName(fixtureCity)

    expect(city?.slug).toBe(citySlug)
  })

  it('publishes canonical host city pages in the sitemap', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    expect(urls).toContain('https://kickoracle.com/en/cities/new-york')
  })

  it('publishes the 46 confirmed team detail pages in the sitemap', () => {
    const teamUrls = getSitemapEntries()
      .map((entry) => entry.url)
      .filter((url) => /\/en\/teams\/[^/]+$/.test(url))

    expect(teamUrls.length).toBe(46)
    expect(teamUrls).toContain('https://kickoracle.com/en/teams/brazil')
    expect(teamUrls.some((url) => url.includes('tbd-playoff'))).toBe(false)
  })

  it('publishes all 12 group detail pages in the sitemap', () => {
    const groupUrls = getSitemapEntries()
      .map((entry) => entry.url)
      .filter((url) => /\/en\/groups\/[a-l]$/.test(url))

    expect(groupUrls.length).toBe(12)
  })

  it('publishes match detail pages keyed off real fixture slugs', () => {
    const matchUrls = getSitemapEntries()
      .map((entry) => entry.url)
      .filter((url) => url.includes('/en/matches/live/'))

    expect(matchUrls.length).toBeGreaterThan(50)
    expect(matchUrls.some((url) => url.includes('mexico-vs-south-africa-a'))).toBe(true)
  })

  it('covers all major route trees with substantially more URLs than the legacy set', () => {
    const entries = getSitemapEntries()
    const urls = entries.map((entry) => entry.url)

    expect(urls.some((url) => url.includes('/en/teams/brazil/players/'))).toBe(true)
    expect(urls.some((url) => url.includes('/en/cities/los-angeles/tickets'))).toBe(true)
    expect(urls.some((url) => url.includes('/en/travel/from/'))).toBe(true)
    expect(urls.some((url) => url.includes('/en/lingo/countries/'))).toBe(true)
    expect(entries.length).toBeGreaterThan(40000)
  })
})
