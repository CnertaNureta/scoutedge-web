import { getRecentNewsPosts, newsSitemapToXml } from '@/lib/news-sitemap'

export const dynamic = 'force-static'

export function GET() {
  const recentPosts = getRecentNewsPosts()

  if (recentPosts.length === 0) {
    return new Response('No recent news articles for the Google News sitemap.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }

  return new Response(newsSitemapToXml(recentPosts), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
