import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [
      'https://kickoracle.com/sitemap.xml',
      'https://kickoracle.com/news-sitemap.xml',
    ],
  }
}
