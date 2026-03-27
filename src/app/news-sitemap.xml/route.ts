import { getAllPosts } from '@/lib/blog-service'

const BASE = 'https://scoutedge.ai'

export const dynamic = 'force-static'

export function GET() {
  const posts = getAllPosts()

  // Google News sitemap includes articles published within the last 2 days
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const recentPosts = posts.filter((post) => new Date(post.date) >= twoDaysAgo)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentPosts
  .map(
    (post) => `  <url>
    <loc>${BASE}/blog/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>ScoutEdge</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.date).toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
      <news:keywords>${escapeXml(post.keywords.slice(0, 5).join(', '))}</news:keywords>
    </news:news>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
