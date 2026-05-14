import type { MetadataRoute } from 'next'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import { WORLD_CUP_SEO_PAGES } from '@/data/world-cup-seo-pages'
import { HOST_CITIES } from '@/data/cities-data'
import { TEAMS } from '@/data/teams-meta'
import { PLAYERS } from '@/data/players-data'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { ORIGIN_COUNTRIES } from '@/data/travel-data'
import { lingoCountries, lingoPlayers } from '@/data/lingo-data'
import { getAllPosts } from '@/lib/blog-service'
import { getAllMatchupSlugs } from '@/lib/compare-utils'

export const SITE_BASE_URL = 'https://kickoracle.com'
export const SITEMAP_CHUNK_SIZE = 2500

type SitemapEntry = MetadataRoute.Sitemap[number]
type ChangeFrequency = NonNullable<SitemapEntry['changeFrequency']>

interface EntryOpts {
  changeFrequency: ChangeFrequency
  priority: number
  lastModified?: Date
}

interface SitemapPath extends EntryOpts {
  path: string
}

let cachedEntries: MetadataRoute.Sitemap | null = null
let cachedPaths: SitemapPath[] | null = null

// ─────────────────────────────────────────────────────────────────────────
// Static path groups
// ─────────────────────────────────────────────────────────────────────────

/**
 * Hub / index / high-priority landing routes. Updated frequently with rotating
 * predictions, schedules, and editorial content.
 */
const HUB_PATHS: SitemapPath[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/teams', changeFrequency: 'daily', priority: 0.9 },
  { path: '/matches', changeFrequency: 'daily', priority: 0.9 },
  { path: '/schedule', changeFrequency: 'daily', priority: 0.9 },
  { path: '/predictions', changeFrequency: 'daily', priority: 0.9 },
  { path: '/upcoming', changeFrequency: 'daily', priority: 0.85 },
  { path: '/bracket', changeFrequency: 'daily', priority: 0.85 },
  { path: '/power-rankings', changeFrequency: 'daily', priority: 0.85 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.7 },
  { path: '/accuracy', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/countdown', changeFrequency: 'daily', priority: 0.8 },
  { path: '/cities', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/daily-briefing', changeFrequency: 'daily', priority: 0.85 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.85 },
  { path: '/lingo', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/lingo/countries', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/lingo/players', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/lingo/terms', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/travel', changeFrequency: 'weekly', priority: 0.75 },
  { path: '/travel/visa', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/travel/budget-calculator', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/travel/tickets', changeFrequency: 'weekly', priority: 0.75 },
  { path: '/formations', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/stadiums', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/schedule/converter', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/developers', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/docs/api', changeFrequency: 'monthly', priority: 0.5 },
]

/**
 * Interactive / game / fan tool routes. Lower-priority because they are
 * primarily product surfaces rather than indexable content, but still worth
 * advertising for discovery.
 */
const TOOL_PATHS: SitemapPath[] = [
  { path: '/play', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/play/quiz', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/play/pk-battle', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/quiz', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/simulator', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/fan-card', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/challenges', changeFrequency: 'weekly', priority: 0.45 },
  { path: '/gear', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/gear/jerseys', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/gear/ball', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/gear/wallpapers', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/stickers', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/stickers/tracker', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/stickers/cost-calculator', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/points', changeFrequency: 'weekly', priority: 0.4 },
]

/**
 * Paths that exist as routes but should be excluded from the sitemap:
 * user-state, auth-gated, transactional, legal, or otherwise low-value-for-SEO
 * routes. Kept here for documentation so future audits can confirm intent.
 */
export const NOINDEX_PATHS: readonly string[] = [
  '/dashboard',
  '/dashboard/api',
  '/predict',
  '/subscribe',
  '/share',
  '/store',
  '/volunteer',
  '/community',
  '/leagues',
  '/leagues/create',
  '/privacy-policy',
  '/terms-of-service',
  '/offline',
  '/not-found',
] as const

// ─────────────────────────────────────────────────────────────────────────
// Dynamic generators
// ─────────────────────────────────────────────────────────────────────────

const TEAM_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'daily',
  priority: 0.85,
}

const TEAM_QUALIFIED_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.6,
}

const PLAYER_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'daily',
  priority: 0.75,
}

const PLAYER_IS_PLAYING_OPTS: EntryOpts = {
  changeFrequency: 'daily',
  priority: 0.55,
}

const MATCH_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'daily',
  priority: 0.85,
}

const COMPARE_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.6,
}

const CITY_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.7,
}

const CITY_SUBPAGE_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.6,
}

const CITY_FROM_OPTS: EntryOpts = {
  changeFrequency: 'monthly',
  priority: 0.5,
}

const TRAVEL_FROM_OPTS: EntryOpts = {
  changeFrequency: 'monthly',
  priority: 0.55,
}

const GROUP_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'daily',
  priority: 0.8,
}

const LINGO_COUNTRY_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.55,
}

const LINGO_PLAYER_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.55,
}

const BLOG_POST_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.65,
}

const STADIUM_DETAIL_OPTS: EntryOpts = {
  changeFrequency: 'weekly',
  priority: 0.6,
}

const CITY_SUBPAGES = [
  'tickets',
  'costs',
  'schedule',
  'transport',
  'hotels',
  'stadium',
  'food',
] as const

const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

function isConfirmedSlug(slug: string): boolean {
  return !slug.startsWith('tbd-')
}

function teamDetailPaths(): SitemapPath[] {
  return TEAMS.filter((team) => isConfirmedSlug(team.slug)).flatMap((team) => [
    { path: `/teams/${team.slug}`, ...TEAM_DETAIL_OPTS },
    { path: `/teams/${team.slug}/qualified`, ...TEAM_QUALIFIED_OPTS },
  ])
}

/**
 * Team-prefixed player detail pages. This is the canonical player URL for the
 * sitemap; the alternate `/players/[player]` route serves the same content and
 * is intentionally excluded to avoid duplication (it self-canonicalizes, so a
 * follow-up should retarget its canonical tag at the team-prefixed URL).
 */
function playerDetailPaths(): SitemapPath[] {
  return PLAYERS.filter((player) => isConfirmedSlug(player.teamSlug)).map(
    (player) => ({
      path: `/teams/${player.teamSlug}/players/${player.slug}`,
      ...PLAYER_DETAIL_OPTS,
    })
  )
}

/**
 * `/players/is-playing/[slug]` — a separate route with its own content
 * (fitness/status focused). Included because it is unique content, not a
 * duplicate of the canonical profile.
 */
function playerIsPlayingPaths(): SitemapPath[] {
  return PLAYERS.filter((player) => isConfirmedSlug(player.teamSlug)).map(
    (player) => ({
      path: `/players/is-playing/${player.slug}`,
      ...PLAYER_IS_PLAYING_OPTS,
    })
  )
}

function fixtureToMatchId(fixture: (typeof MATCH_FIXTURES)[number]): string {
  return `${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}-${fixture.group.toLowerCase()}`
}

function matchDetailPaths(): SitemapPath[] {
  return MATCH_FIXTURES.filter(
    (fixture) =>
      !fixture.homeTeamSlug.startsWith('tbd-') &&
      !fixture.awayTeamSlug.startsWith('tbd-')
  ).map((fixture) => {
    const matchId = fixtureToMatchId(fixture)
    return {
      path: `/matches/live/${matchId}`,
      ...MATCH_DETAIL_OPTS,
      lastModified: new Date(fixture.kickoffUtc),
    }
  })
}

function compareDetailPaths(): SitemapPath[] {
  return getAllMatchupSlugs()
    .filter((slug) => !slug.includes('tbd-playoff'))
    .map((slug) => ({
      path: `/compare/${slug}`,
      ...COMPARE_DETAIL_OPTS,
    }))
}

function cityDetailPaths(): SitemapPath[] {
  return HOST_CITIES.map((city) => ({
    path: `/cities/${city.slug}`,
    ...CITY_DETAIL_OPTS,
  }))
}

function citySubpagePaths(): SitemapPath[] {
  return HOST_CITIES.flatMap((city) =>
    CITY_SUBPAGES.map((sub) => ({
      path: `/cities/${city.slug}/${sub}`,
      ...CITY_SUBPAGE_OPTS,
    }))
  )
}

function cityFromCountryPaths(): SitemapPath[] {
  return ORIGIN_COUNTRIES.map((origin) => ({
    path: `/cities/from/${origin.slug}`,
    ...CITY_FROM_OPTS,
  }))
}

function travelFromCountryPaths(): SitemapPath[] {
  return ORIGIN_COUNTRIES.map((origin) => ({
    path: `/travel/from/${origin.slug}`,
    ...TRAVEL_FROM_OPTS,
  }))
}

function groupDetailPaths(): SitemapPath[] {
  return GROUP_IDS.map((groupId) => ({
    path: `/groups/${groupId.toLowerCase()}`,
    ...GROUP_DETAIL_OPTS,
  }))
}

function lingoCountryPaths(): SitemapPath[] {
  return lingoCountries.map((country) => ({
    path: `/lingo/countries/${country.id}`,
    ...LINGO_COUNTRY_OPTS,
  }))
}

function lingoPlayerPaths(): SitemapPath[] {
  return lingoPlayers.map((player) => ({
    path: `/lingo/players/${player.id}`,
    ...LINGO_PLAYER_OPTS,
  }))
}

/**
 * Blog posts (including `daily-briefing` content type — they share the
 * `/blog/[slug]` route). Defensive: if the content directory is unavailable
 * at build time we fall back to an empty list rather than throwing.
 */
function blogPostPaths(): SitemapPath[] {
  let posts: ReturnType<typeof getAllPosts>
  try {
    posts = getAllPosts()
  } catch {
    return []
  }
  return posts.map((post) => {
    const lastModifiedSource = post.lastUpdated || post.publishedAt || post.date
    const lastModified = lastModifiedSource
      ? new Date(lastModifiedSource)
      : undefined
    return {
      path: `/blog/${post.slug}`,
      ...BLOG_POST_OPTS,
      ...(lastModified && !Number.isNaN(lastModified.getTime())
        ? { lastModified }
        : {}),
    }
  })
}

function stadiumDetailPaths(): SitemapPath[] {
  return HOST_CITIES.flatMap((city) =>
    city.venueIds.map((venueId) => ({
      path: `/stadiums/${venueId}`,
      ...STADIUM_DETAIL_OPTS,
    }))
  )
}

function worldCupSeoPaths(): SitemapPath[] {
  return WORLD_CUP_SEO_PAGES.map((page) => ({
    path: `/world-cup-2026/${page.slug}`,
    changeFrequency: page.sitemap.changeFrequency,
    priority: page.sitemap.priority,
    lastModified: new Date(`${page.updated}T00:00:00.000Z`),
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// Composition
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the full list of (locale-agnostic) sitemap paths. Each entry will be
 * expanded into one URL per supported locale by `getSitemapEntries`.
 *
 * Memoized — generation walks ~1100 players and ~100 blog posts, so we only
 * pay that cost once per process.
 */
export function buildCoreSitemapPaths(): SitemapPath[] {
  if (cachedPaths) return cachedPaths

  const deduped = new Map<string, SitemapPath>()
  const groups: SitemapPath[][] = [
    HUB_PATHS,
    TOOL_PATHS,
    worldCupSeoPaths(),
    compareDetailPaths(),
    teamDetailPaths(),
    playerDetailPaths(),
    playerIsPlayingPaths(),
    matchDetailPaths(),
    cityDetailPaths(),
    citySubpagePaths(),
    cityFromCountryPaths(),
    travelFromCountryPaths(),
    groupDetailPaths(),
    lingoCountryPaths(),
    lingoPlayerPaths(),
    blogPostPaths(),
    stadiumDetailPaths(),
  ]

  for (const group of groups) {
    for (const entry of group) {
      // First-write-wins: hub paths declared above take precedence over any
      // accidental dynamic duplicates.
      if (!deduped.has(entry.path)) {
        deduped.set(entry.path, entry)
      }
    }
  }

  cachedPaths = Array.from(deduped.values())
  return cachedPaths
}

/**
 * Kept as a named export for backward compatibility — the previous shape of
 * this module exposed `CORE_SITEMAP_PATHS` as a const. Existing imports
 * continue to work; new code should prefer `buildCoreSitemapPaths()`.
 */
export const CORE_SITEMAP_PATHS: SitemapPath[] = buildCoreSitemapPaths()

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

  cachedEntries = buildCoreSitemapPaths().flatMap(({ path, ...opts }) =>
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
