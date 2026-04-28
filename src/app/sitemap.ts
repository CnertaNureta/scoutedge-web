import type { MetadataRoute } from 'next'
import { getAllTeams, getPlayersByTeam, getAllGroups } from '@/lib/data-service'
import { getAllMatchupSlugs } from '@/lib/compare-utils'
import { getAllPosts } from '@/lib/blog-service'
import { SUPPORTED_LOCALES, LOCALE_CONFIGS } from '@/i18n/locales'
import { lingoCountries, lingoPlayers } from '@/data/lingo-data'

export const dynamic = 'force-static'

const BASE = 'https://kickoracle.com'

/** Build the locale-prefixed URL for a path. Default locale (en) has no prefix. */
function localizedUrl(locale: string, path: string): string {
  return locale === 'en' ? `${BASE}${path}` : `${BASE}/${locale}${path}`
}

/** Build the hreflang alternates map for a path (used in <xhtml:link> alternates). */
function localizedAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = { 'x-default': localizedUrl('en', path) }
  for (const loc of SUPPORTED_LOCALES) {
    const cfg = LOCALE_CONFIGS[loc]
    out[cfg.hreflang] = localizedUrl(loc, path)
  }
  return out
}

interface EntryOpts {
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
  lastModified?: Date
}

/** Emit one sitemap entry per supported locale with reciprocal hreflang alternates. */
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

export default function sitemap(): MetadataRoute.Sitemap {
  const teams = getAllTeams()
  const groups = getAllGroups()
  const matchupSlugs = getAllMatchupSlugs()
  const blogPosts = getAllPosts()

  const entries: MetadataRoute.Sitemap = [
    // Core pages
    ...localizedEntries('', { changeFrequency: 'daily', priority: 1.0 }),
    ...localizedEntries('/teams', { changeFrequency: 'daily', priority: 0.95 }),
    ...localizedEntries('/matches', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/predictions', { changeFrequency: 'daily', priority: 0.95 }),
    ...localizedEntries('/power-rankings', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/daily-briefing', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/bracket', { changeFrequency: 'daily', priority: 0.85 }),

    // Tool / utility pages
    ...localizedEntries('/schedule', { changeFrequency: 'daily', priority: 0.9 }),
    ...localizedEntries('/countdown', { changeFrequency: 'daily', priority: 0.7 }),
    ...localizedEntries('/schedule/converter', { changeFrequency: 'weekly', priority: 0.7 }),
    ...localizedEntries('/compare', { changeFrequency: 'weekly', priority: 0.8 }),

    // Cities & travel hub
    ...localizedEntries('/cities', { changeFrequency: 'weekly', priority: 0.9 }),
    ...localizedEntries('/travel', { changeFrequency: 'weekly', priority: 0.85 }),
    ...localizedEntries('/travel/visa', { changeFrequency: 'monthly', priority: 0.75 }),
    ...localizedEntries('/travel/budget-calculator', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/travel/tickets', { changeFrequency: 'weekly', priority: 0.85 }),

    // Blog hub
    ...localizedEntries('/blog', { changeFrequency: 'daily', priority: 0.85 }),

    // Fan zone hubs
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

    // Play & community hubs
    ...localizedEntries('/play', { changeFrequency: 'weekly', priority: 0.7 }),
    ...localizedEntries('/play/quiz', { changeFrequency: 'monthly', priority: 0.6 }),
    ...localizedEntries('/play/pk-battle', { changeFrequency: 'monthly', priority: 0.55 }),
    ...localizedEntries('/leaderboard', { changeFrequency: 'daily', priority: 0.6 }),
    ...localizedEntries('/leagues', { changeFrequency: 'weekly', priority: 0.55 }),
    ...localizedEntries('/challenges', { changeFrequency: 'daily', priority: 0.55 }),

    // Account / commerce
    ...localizedEntries('/pricing', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/developers', { changeFrequency: 'monthly', priority: 0.5 }),
    ...localizedEntries('/fan-card', { changeFrequency: 'monthly', priority: 0.5 }),
    ...localizedEntries('/volunteer', { changeFrequency: 'monthly', priority: 0.4 }),

    // Legal
    ...localizedEntries('/privacy-policy', { changeFrequency: 'monthly', priority: 0.2 }),
    ...localizedEntries('/terms-of-service', { changeFrequency: 'monthly', priority: 0.2 }),

    // Group pages
    ...groups.flatMap((g) =>
      localizedEntries(`/groups/${g}`, { changeFrequency: 'weekly', priority: 0.8 })
    ),

    // Team pages
    ...teams.flatMap((t) =>
      localizedEntries(`/teams/${t.slug}`, { changeFrequency: 'daily', priority: 0.9 })
    ),

    // Team sub-pages: qualified status
    ...teams.flatMap((t) =>
      localizedEntries(`/teams/${t.slug}/qualified`, { changeFrequency: 'weekly', priority: 0.7 })
    ),

    // Player pages
    ...teams.flatMap((team) =>
      getPlayersByTeam(team.slug).flatMap((p) =>
        localizedEntries(`/teams/${team.slug}/players/${p.slug}`, {
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      )
    ),

    // Compare pages (1,128)
    ...matchupSlugs.flatMap((slug) =>
      localizedEntries(`/compare/${slug}`, { changeFrequency: 'weekly', priority: 0.6 })
    ),

    // Lingo dynamic pages
    ...lingoCountries.flatMap((c) =>
      localizedEntries(`/lingo/countries/${c.id}`, { changeFrequency: 'monthly', priority: 0.65 })
    ),
    ...lingoPlayers.flatMap((p) =>
      localizedEntries(`/lingo/players/${p.id}`, { changeFrequency: 'monthly', priority: 0.65 })
    ),

    // Blog posts
    ...blogPosts.flatMap((post) =>
      localizedEntries(`/blog/${post.slug}`, {
        changeFrequency: 'daily',
        priority: 0.85,
        lastModified: new Date(post.lastUpdated || post.date),
      })
    ),
  ]

  return entries
}
