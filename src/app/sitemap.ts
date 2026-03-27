import type { MetadataRoute } from 'next'
import { getAllTeams, getPlayersByTeam, getAllGroups } from '@/lib/data-service'
import { getAllMatchupSlugs } from '@/lib/compare-utils'
import { getAllPosts } from '@/lib/blog-service'
import { SUPPORTED_LOCALES } from '@/i18n/locales'

export const dynamic = 'force-static'

const BASE = 'https://scoutedge.ai'

export default function sitemap(): MetadataRoute.Sitemap {
  const teams = getAllTeams()
  const groups = getAllGroups()
  const matchupSlugs = getAllMatchupSlugs()
  const blogPosts = getAllPosts()

  // Team pages
  const teamUrls: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `${BASE}/teams/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // Player pages
  const playerUrls: MetadataRoute.Sitemap = []
  for (const team of teams) {
    const players = getPlayersByTeam(team.slug)
    for (const p of players) {
      playerUrls.push({
        url: `${BASE}/teams/${team.slug}/players/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  // Group pages
  const groupUrls: MetadataRoute.Sitemap = groups.map((g) => ({
    url: `${BASE}/groups/${g}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Compare pages (1128)
  const compareUrls: MetadataRoute.Sitemap = matchupSlugs.map((slug) => ({
    url: `${BASE}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Blog posts
  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.lastUpdated || post.date),
    changeFrequency: 'daily',
    priority: 0.85,
  }))

  return [
    // Core pages
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/teams`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${BASE}/matches`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/power-rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/daily-briefing`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },

    // Tool pages
    { url: `${BASE}/schedule`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/countdown`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/schedule/converter`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/community`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE}/predictions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },

    // Localized homepages (8 languages)
    ...SUPPORTED_LOCALES.map((locale) => ({
      url: `${BASE}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),

    // Legal
    { url: `${BASE}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/terms-of-service`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },

    // Dynamic pages
    ...groupUrls,
    ...teamUrls,
    ...playerUrls,
    ...compareUrls,
    ...blogUrls,
  ]
}
