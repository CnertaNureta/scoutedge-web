import { getRecentEditorialPages, getRecentNewsPosts, newsSitemapToXml } from '@/lib/news-sitemap'

export const dynamic = 'force-static'

export function GET() {
  const recentPosts = getRecentNewsPosts()
  const recentEditorialPages = getRecentEditorialPages()

  // Always return valid XML even when empty, per Google News spec:
  // a 404 on a sitemap URL advertised in robots.txt triggers GSC warnings.
  // hasRecentNewsItems() gates whether the URL is advertised at all.
  return new Response(newsSitemapToXml(recentPosts, { editorialPages: recentEditorialPages }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  })
}
