import type { MetadataRoute } from 'next'
import { getAllTeams, getPlayersByTeam } from '@/lib/data-service'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const teams = getAllTeams()

  const teamUrls: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `https://scoutedge.ai/teams/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  const playerUrls: MetadataRoute.Sitemap = []
  for (const team of teams) {
    const players = getPlayersByTeam(team.slug)
    for (const p of players) {
      playerUrls.push({
        url: `https://scoutedge.ai/teams/${team.slug}/players/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  }

  return [
    { url: 'https://scoutedge.ai', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://scoutedge.ai/teams', lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    ...teamUrls,
    ...playerUrls,
  ]
}
