import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [
      'https://scoutedge.ai/sitemap.xml',
      'https://scoutedge.ai/news-sitemap.xml',
    ],
  }
}
