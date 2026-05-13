import type { MetadataRoute } from 'next'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import { WORLD_CUP_SEO_PAGES } from '@/data/world-cup-seo-pages'

export const SITE_BASE_URL = 'https://kickoracle.com'
export const SITEMAP_CHUNK_SIZE = 2500

type SitemapEntry = MetadataRoute.Sitemap[number]

interface EntryOpts {
  changeFrequency: NonNullable<SitemapEntry['changeFrequency']>
  priority: number
  lastModified?: Date
}

let cachedEntries: MetadataRoute.Sitemap | null = null

export const CORE_SITEMAP_PATHS = [
  {
    path: '',
    changeFrequency: 'daily' as const,
    priority: 1.0,
  },
  ...WORLD_CUP_SEO_PAGES.map((page) => ({
    path: `/world-cup-2026/${page.slug}`,
    changeFrequency: page.sitemap.changeFrequency,
    priority: page.sitemap.priority,
    lastModified: new Date(`${page.updated}T00:00:00.000Z`),
  })),
]

function localizedUrl(locale: string, path: string): string {
  return `${SITE_BASE_URL}/${locale}${path}`
}

function localizedAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = { 'x-default': localizedUrl('en', path) }
  for (const loc of SUPPORTED_LOCALES) {
    const cfg = LOCALE_CONFIGS[loc]
    out[cfg.hreflang] = localizedUrl(loc, path)
  }
  return out
}

function localizedEntries(path: string, opts: EntryOpts): MetadataRoute.Sitemap {
  const lastModified = opts.lastModified ?? new Date()
  const alternates = localizedAlternates(path)
  return SUPPORTED_LOCALES.map((locale) => ({
    url: localizedUrl(locale, path),
    lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages: alternates },
  }))
}

export function getSitemapEntries(): MetadataRoute.Sitemap {
  if (cachedEntries) return cachedEntries

  cachedEntries = CORE_SITEMAP_PATHS.flatMap(({ path, ...opts }) =>
    localizedEntries(path, opts)
  )

  return cachedEntries
}

export function getSitemapChunkCount(): number {
  return Math.ceil(getSitemapEntries().length / SITEMAP_CHUNK_SIZE)
}

export function getSitemapChunk(id: number): MetadataRoute.Sitemap | null {
  if (!Number.isInteger(id) || id < 0 || id >= getSitemapChunkCount()) {
    return null
  }

  const start = id * SITEMAP_CHUNK_SIZE
  return getSitemapEntries().slice(start, start + SITEMAP_CHUNK_SIZE)
}

export function getSitemapChunkUrl(id: number): string {
  return `${SITE_BASE_URL}/sitemaps/${id}.xml`
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const alternates = Object.entries(entry.alternates?.languages ?? {})
        .flatMap(([hreflang, href]) =>
          href
            ? [
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
              ]
            : []
        )
        .join('\n')

      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    ${entry.lastModified ? `<lastmod>${escapeXml(formatDate(entry.lastModified))}</lastmod>` : ''}
    ${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ''}
    ${typeof entry.priority === 'number' ? `<priority>${entry.priority.toFixed(2)}</priority>` : ''}
${alternates}
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`
}
