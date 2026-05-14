import type { MetadataRoute } from 'next'
import { NEWS_SITEMAP_URL, hasRecentNewsItems } from '@/lib/news-sitemap'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  const sitemap = [
    'https://kickoracle.com/sitemap.xml',
    ...(hasRecentNewsItems() ? [NEWS_SITEMAP_URL] : []),
  ]

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/'],
    },
    sitemap,
    host: 'https://kickoracle.com',
  }
}
