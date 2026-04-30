import {
  escapeXml,
  getSitemapChunkCount,
  getSitemapChunkUrl,
} from '@/lib/sitemap-utils'
import { NEWS_SITEMAP_URL, hasRecentNewsPosts } from '@/lib/news-sitemap'

export const dynamic = 'force-static'
export const revalidate = 86400

export function GET() {
  const lastModified = new Date().toISOString()
  const chunkCount = getSitemapChunkCount()
  const sitemapUrls = [
    ...Array.from({ length: chunkCount }, (_, id) => getSitemapChunkUrl(id)),
    ...(hasRecentNewsPosts() ? [NEWS_SITEMAP_URL] : []),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (url) => `  <sitemap>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
