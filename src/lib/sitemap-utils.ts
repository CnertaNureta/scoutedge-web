import type { MetadataRoute } from 'next'
import { getAllCities } from '@/data/cities-data'
import { lingoCountries, lingoPlayers } from '@/data/lingo-data'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import { getAllPosts } from '@/lib/blog-service'
import { getAllMatchupSlugs } from '@/lib/compare-utils'
import { getAllGroups, getAllTeams, getPlayersByTeam } from '@/lib/data-service'

export const SITE_BASE_URL = 'https://kickoracle.com'
export const SITEMAP_CHUNK_SIZE = 2500

type SitemapEntry = MetadataRoute.Sitemap[number]

interface EntryOpts {
  changeFrequency: NonNullable<SitemapEntry['changeFrequency']>
  priority: number
  lastModified?: Date
}

let cachedEntries: MetadataRoute.Sitemap | null = null

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

  const teams = getAllTeams()
  const groups = getAllGroups()
  const cities = getAllCities()
  const matchupSlugs = getAllMatchupSlugs()
  const blogPosts = getAllPosts()

  cachedEntries = [
    ...localizedEntries('', { changeFrequency: 'daily', priority: 1.0 }),
    ...localizedEntries('/about', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/accuracy', { changeFrequency: 'weekly', priority: 0.85 }),
    ...localizedEntries('/pricing', { changeFrequency: 'weekly', priority: 0.9 }),
    ...localizedEntries('/teams', { changeFrequency: 'daily', priority: 0.95 }),
    ...localizedEntries('/matches', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/predictions', { changeFrequency: 'daily', priority: 0.95 }),
    ...localizedEntries('/power-rankings', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/daily-briefing', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/bracket', { changeFrequency: 'daily', priority: 0.85 }),
    ...localizedEntries('/schedule', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/countdown', { changeFrequency: 'daily', priority: 0.7 }),
    ...localizedEntries('/schedule/converter', { changeFrequency: 'weekly', priority: 0.7 }),
    ...localizedEntries('/compare', { changeFrequency: 'weekly', priority: 0.8 }),
    ...localizedEntries('/cities', { changeFrequency: 'weekly', priority: 0.9 }),
    ...localizedEntries('/travel', { changeFrequency: 'weekly', priority: 0.85 }),
    ...localizedEntries('/travel/visa', { changeFrequency: 'monthly', priority: 0.75 }),
    ...localizedEntries('/travel/budget-calculator', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/travel/tickets', { changeFrequency: 'weekly', priority: 0.85 }),
    ...localizedEntries('/blog', { changeFrequency: 'daily', priority: 0.85 }),
    ...localizedEntries('/lingo', { changeFrequency: 'weekly', priority: 0.85 }),
    ...localizedEntries('/lingo/countries', { changeFrequency: 'monthly', priority: 0.75 }),
    ...localizedEntries('/lingo/players', { changeFrequency: 'monthly', priority: 0.75 }),
    ...localizedEntries('/lingo/terms', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/gear', { changeFrequency: 'weekly', priority: 0.7 }),
    ...localizedEntries('/gear/ball', { changeFrequency: 'monthly', priority: 0.65 }),
    ...localizedEntries('/gear/jerseys', { changeFrequency: 'weekly', priority: 0.75 }),
    ...localizedEntries('/gear/wallpapers', { changeFrequency: 'monthly', priority: 0.6 }),
    ...localizedEntries('/stickers', { changeFrequency: 'weekly', priority: 0.75 }),
    ...localizedEntries('/stickers/cost-calculator', { changeFrequency: 'monthly', priority: 0.6 }),
    ...localizedEntries('/stickers/tracker', { changeFrequency: 'weekly', priority: 0.65 }),
    ...localizedEntries('/play', { changeFrequency: 'weekly', priority: 0.7 }),
    ...localizedEntries('/play/quiz', { changeFrequency: 'monthly', priority: 0.6 }),
    ...localizedEntries('/play/pk-battle', { changeFrequency: 'monthly', priority: 0.55 }),
    ...localizedEntries('/leaderboard', { changeFrequency: 'daily', priority: 0.6 }),
    ...localizedEntries('/leagues', { changeFrequency: 'weekly', priority: 0.55 }),
    ...localizedEntries('/challenges', { changeFrequency: 'daily', priority: 0.55 }),
    ...localizedEntries('/pricing', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/developers', { changeFrequency: 'monthly', priority: 0.5 }),
    ...localizedEntries('/fan-card', { changeFrequency: 'monthly', priority: 0.5 }),
    ...localizedEntries('/volunteer', { changeFrequency: 'monthly', priority: 0.4 }),
    ...localizedEntries('/privacy-policy', { changeFrequency: 'monthly', priority: 0.2 }),
    ...localizedEntries('/terms-of-service', { changeFrequency: 'monthly', priority: 0.2 }),
    ...groups.flatMap((g) =>
      localizedEntries(`/groups/${g}`, { changeFrequency: 'weekly', priority: 0.8 })
    ),
    ...teams.flatMap((t) =>
      localizedEntries(`/teams/${t.slug}`, { changeFrequency: 'daily', priority: 0.9 })
    ),
    ...teams.flatMap((t) =>
      localizedEntries(`/teams/${t.slug}/qualified`, { changeFrequency: 'weekly', priority: 0.7 })
    ),
    ...cities.flatMap((city) =>
      localizedEntries(`/cities/${city.slug}`, { changeFrequency: 'weekly', priority: 0.8 })
    ),
    ...teams.flatMap((team) =>
      getPlayersByTeam(team.slug).flatMap((p) =>
        localizedEntries(`/teams/${team.slug}/players/${p.slug}`, {
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      )
    ),
    ...matchupSlugs.flatMap((slug) =>
      localizedEntries(`/compare/${slug}`, { changeFrequency: 'weekly', priority: 0.6 })
    ),
    ...lingoCountries.flatMap((c) =>
      localizedEntries(`/lingo/countries/${c.id}`, { changeFrequency: 'monthly', priority: 0.65 })
    ),
    ...lingoPlayers.flatMap((p) =>
      localizedEntries(`/lingo/players/${p.id}`, { changeFrequency: 'monthly', priority: 0.65 })
    ),
    ...blogPosts.flatMap((post) =>
      localizedEntries(`/blog/${post.slug}`, {
        changeFrequency: 'daily',
        priority: 0.85,
        lastModified: new Date(post.lastUpdated || post.date),
      })
    ),
  ]

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
