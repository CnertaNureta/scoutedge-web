import type { MetadataRoute } from 'next'
import { getAllCities } from '@/data/cities-data'
import { lingoCountries, lingoPlayers } from '@/data/lingo-data'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import { routing } from '@/i18n/routing'
import { getAllPosts } from '@/lib/blog-service'
import { getAllMatchupSlugs } from '@/lib/compare-utils'
import {
  getAllGroups,
  getAllPlayers,
  getAllTeams,
  getTeamBySlug,
} from '@/lib/data-service'

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://kickoracle.com'
)

const MAX_URLS = 5000

type SitemapEntry = MetadataRoute.Sitemap[number]
type ChangeFreq = NonNullable<SitemapEntry['changeFrequency']>

interface EntryOpts {
  changeFrequency: ChangeFreq
  priority: number
  lastModified?: Date
}

function buildLocaleUrl(locale: string, path: string): string {
  const normalized = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}/${locale}${normalized}`
}

function entryFor(path: string, opts: EntryOpts): SitemapEntry {
  const languages: Record<string, string> = {
    'x-default': buildLocaleUrl(routing.defaultLocale, path),
  }
  for (const loc of SUPPORTED_LOCALES) {
    const cfg = LOCALE_CONFIGS[loc]
    languages[cfg.hreflang] = buildLocaleUrl(loc, path)
  }

  return {
    url: buildLocaleUrl(routing.defaultLocale, path),
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  entries.push(entryFor('/', { changeFrequency: 'monthly', priority: 1.0 }))

  const hubs: Array<[string, ChangeFreq, number]> = [
    ['/players', 'daily', 0.9],
    ['/teams', 'weekly', 0.9],
    ['/matches', 'daily', 0.9],
    ['/predictions', 'daily', 0.9],
    ['/power-rankings', 'daily', 0.9],
    ['/daily-briefing', 'daily', 0.85],
    ['/bracket', 'daily', 0.85],
    ['/schedule', 'daily', 0.85],
    ['/leaderboard', 'daily', 0.65],
    ['/compare', 'weekly', 0.8],
    ['/cities', 'weekly', 0.85],
    ['/travel', 'weekly', 0.8],
    ['/blog', 'daily', 0.8],
    ['/lingo', 'weekly', 0.75],
    ['/lingo/countries', 'monthly', 0.7],
    ['/lingo/players', 'monthly', 0.7],
    ['/lingo/terms', 'monthly', 0.7],
    ['/accuracy', 'weekly', 0.75],
    ['/pricing', 'monthly', 0.7],
    ['/countdown', 'daily', 0.65],
    ['/about', 'monthly', 0.6],
    ['/groups', 'weekly', 0.7],
    ['/leagues', 'weekly', 0.55],
    ['/gear', 'weekly', 0.65],
    ['/gear/ball', 'monthly', 0.6],
    ['/gear/jerseys', 'weekly', 0.7],
    ['/gear/wallpapers', 'monthly', 0.55],
    ['/stickers', 'weekly', 0.7],
    ['/play', 'weekly', 0.65],
    ['/play/quiz', 'monthly', 0.55],
    ['/play/pk-battle', 'monthly', 0.55],
    ['/challenges', 'daily', 0.55],
    ['/fan-card', 'monthly', 0.5],
    ['/developers', 'monthly', 0.5],
    ['/community', 'weekly', 0.5],
    ['/dashboard', 'monthly', 0.4],
    ['/predict', 'daily', 0.7],
    ['/upcoming', 'daily', 0.7],
    ['/quiz', 'monthly', 0.55],
    ['/formations', 'monthly', 0.6],
    ['/stadiums', 'weekly', 0.7],
    ['/share', 'monthly', 0.4],
    ['/subscribe', 'monthly', 0.5],
    ['/simulator', 'weekly', 0.6],
    ['/volunteer', 'monthly', 0.4],
    ['/points', 'monthly', 0.45],
    ['/store', 'weekly', 0.55],
    ['/travel/visa', 'monthly', 0.7],
    ['/travel/budget-calculator', 'monthly', 0.65],
    ['/travel/tickets', 'weekly', 0.75],
    ['/schedule/converter', 'weekly', 0.65],
    ['/stickers/cost-calculator', 'monthly', 0.55],
    ['/stickers/tracker', 'weekly', 0.6],
    ['/privacy-policy', 'monthly', 0.2],
    ['/terms-of-service', 'monthly', 0.2],
  ]
  for (const [path, freq, priority] of hubs) {
    entries.push(entryFor(path, { changeFrequency: freq, priority }))
  }

  for (const group of getAllGroups()) {
    entries.push(entryFor(`/groups/${group}`, { changeFrequency: 'weekly', priority: 0.75 }))
  }

  for (const team of getAllTeams()) {
    entries.push(entryFor(`/teams/${team.slug}`, { changeFrequency: 'weekly', priority: 0.9 }))
    entries.push(
      entryFor(`/teams/${team.slug}/qualified`, { changeFrequency: 'weekly', priority: 0.65 })
    )
  }

  for (const city of getAllCities()) {
    entries.push(entryFor(`/cities/${city.slug}`, { changeFrequency: 'weekly', priority: 0.8 }))
    for (const sub of ['/costs', '/food', '/hotels', '/schedule', '/stadium', '/tickets', '/transport']) {
      entries.push(
        entryFor(`/cities/${city.slug}${sub}`, { changeFrequency: 'weekly', priority: 0.65 })
      )
    }
  }

  const allPlayers = getAllPlayers()
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  for (const player of allPlayers) {
    const team = getTeamBySlug(player.teamSlug)
    if (!team) continue
    entries.push(
      entryFor(`/teams/${team.slug}/players/${player.slug}`, {
        changeFrequency: 'daily',
        priority: 0.7,
      })
    )
  }

  for (const slug of getAllMatchupSlugs()) {
    entries.push(entryFor(`/compare/${slug}`, { changeFrequency: 'weekly', priority: 0.6 }))
  }

  for (const c of lingoCountries) {
    entries.push(entryFor(`/lingo/countries/${c.id}`, { changeFrequency: 'monthly', priority: 0.6 }))
  }
  for (const p of lingoPlayers) {
    entries.push(entryFor(`/lingo/players/${p.id}`, { changeFrequency: 'monthly', priority: 0.6 }))
  }

  for (const post of getAllPosts()) {
    entries.push(
      entryFor(`/blog/${post.slug}`, {
        changeFrequency: 'daily',
        priority: 0.8,
        lastModified: new Date(post.lastUpdated || post.date),
      })
    )
  }

  return entries.slice(0, MAX_URLS)
}
