import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from '@/i18n/locales'
import { getWorldCupSeoPaths } from '@/data/world-cup-seo-pages'
import {
  CORE_SITEMAP_PATHS,
  SITE_BASE_URL,
  getSitemapChunkCount,
  getSitemapEntries,
  sitemapEntriesToXml,
} from '@/lib/sitemap-utils'

function localizedUrl(locale: string, path: string): string {
  return `${SITE_BASE_URL}/${locale}${path}`
}

describe('focused sitemap batch', () => {
  it('limits submitted URLs to the first high-value World Cup 2026 pages', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)
    const expectedUrls = CORE_SITEMAP_PATHS.flatMap(({ path }) =>
      SUPPORTED_LOCALES.map((locale) => localizedUrl(locale, path))
    )

    expect(urls.sort()).toEqual(expectedUrls.sort())
    expect(getSitemapChunkCount()).toBe(1)
  })

  it('includes the validated keyword pages and excludes broad low-priority surfaces', () => {
    const urls = getSitemapEntries().map((entry) => entry.url)

    for (const path of getWorldCupSeoPaths()) {
      expect(urls).toContain(localizedUrl('en', path))
    }

    expect(urls).not.toContain(localizedUrl('en', '/schedule'))
    expect(urls).not.toContain(localizedUrl('en', '/travel/tickets'))
    expect(urls).not.toContain(localizedUrl('en', '/teams/argentina'))
    expect(urls).not.toContain(localizedUrl('en', '/blog/world-cup-2026-complete-guide'))
  })

  it('keeps hreflang alternates for the focused pages', () => {
    const xml = sitemapEntriesToXml(getSitemapEntries().slice(0, 1))

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain('hreflang="x-default"')
    expect(xml).toContain('hreflang="en"')
    expect(xml).toContain('hreflang="zh-Hans"')
  })
})
