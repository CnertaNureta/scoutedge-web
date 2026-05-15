import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from '@/i18n/locales'
import { getWorldCupSeoPaths } from '@/data/world-cup-seo-pages'
import {
  CORE_SITEMAP_PATHS,
  NOINDEX_PATHS,
  SITE_BASE_URL,
  SITEMAP_CHUNK_SIZE,
  SITEMAP_LOCALES,
  getSitemapChunkCount,
  getSitemapEntries,
  sitemapEntriesToXml,
} from '@/lib/sitemap-utils'

function localizedUrl(locale: string, path: string): string {
  return `${SITE_BASE_URL}/${locale}${path}`
}

describe('sitemap coverage', () => {
  it('emits one localized entry per (path, locale) pair for SITEMAP_LOCALES', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)
    const expectedUrls = CORE_SITEMAP_PATHS.flatMap(({ path }) =>
      SITEMAP_LOCALES.map((locale) => localizedUrl(locale, path))
    )

    expect(urls.sort()).toEqual(expectedUrls.sort())
    expect(getSitemapChunkCount()).toBeGreaterThan(1)
    expect(getSitemapChunkCount()).toBe(
      Math.ceil(urls.length / SITEMAP_CHUNK_SIZE)
    )
  })

  it('excludes non-core locales from sitemap submissions while keeping them supported', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)
    const nonCoreLocales = SUPPORTED_LOCALES.filter(
      (loc) => !SITEMAP_LOCALES.includes(loc)
    )
    for (const locale of nonCoreLocales) {
      expect(urls).not.toContain(localizedUrl(locale, '/teams/argentina'))
    }
  })

  it('includes the validated World Cup 2026 keyword pages', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    for (const path of getWorldCupSeoPaths()) {
      expect(urls).toContain(localizedUrl('en', path))
    }
  })

  it('includes the major dynamic route trees that drive organic discovery', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    // Hub pages
    expect(urls).toContain(localizedUrl('en', '/schedule'))
    expect(urls).toContain(localizedUrl('en', '/travel/tickets'))
    expect(urls).toContain(localizedUrl('en', '/predictions'))

    // Detail pages we explicitly want indexed
    expect(urls).toContain(localizedUrl('en', '/teams/argentina'))
    expect(urls).toContain(localizedUrl('en', '/matches/live/mexico-vs-south-africa-a'))
    expect(urls).toContain(localizedUrl('en', '/cities/new-york'))
    expect(urls).toContain(localizedUrl('en', '/groups/a'))
  })

  it('excludes unresolved match pages that would 404', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    expect(urls.some((url) => url.includes('/matches/live/') && url.includes('tbd-'))).toBe(false)
  })

  it('excludes user-state and legal routes via NOINDEX_PATHS', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    for (const path of NOINDEX_PATHS) {
      expect(urls).not.toContain(localizedUrl('en', path))
    }
  })

  it('keeps hreflang alternates on every emitted entry', () => {
    const xml = sitemapEntriesToXml(getSitemapEntries().slice(0, 1))

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain('hreflang="x-default"')
    expect(xml).toContain('hreflang="en"')
    expect(xml).toContain('hreflang="zh-Hans"')
  })
})
