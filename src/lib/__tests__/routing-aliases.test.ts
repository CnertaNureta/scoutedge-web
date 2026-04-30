import { describe, expect, it } from 'vitest'
import { getCityBySlug } from '@/data/cities-data'
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

  it('publishes canonical host city pages in the sitemap', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    expect(urls).toContain('https://kickoracle.com/cities/new-york')
  })
})
