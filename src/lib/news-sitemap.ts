import { getAllPosts, type BlogPost } from '@/lib/blog-service'

const BASE_URL = 'https://kickoracle.com'
const NEWS_WINDOW_DAYS = 2
const MIN_NEWS_WORD_COUNT = 400

export const NEWS_SITEMAP_URL = `${BASE_URL}/news-sitemap.xml`

function getPublishDate(post: Pick<BlogPost, 'publishedAt' | 'date'>): Date | null {
  const value = post.publishedAt || post.date
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getRecentNewsPosts(posts: BlogPost[] = getAllPosts(), now = new Date()): BlogPost[] {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - NEWS_WINDOW_DAYS)

  return posts.filter((post) => {
    const published = getPublishDate(post)
    return Boolean(published && published >= cutoff && post.wordCount >= MIN_NEWS_WORD_COUNT)
  })
}

export function hasRecentNewsPosts(posts: BlogPost[] = getAllPosts(), now = new Date()): boolean {
  return getRecentNewsPosts(posts, now).length > 0
}

export function newsSitemapToXml(posts: BlogPost[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${posts
  .map((post) => {
    const published = getPublishDate(post) ?? new Date(post.date)

    return `  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>KickOracle</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${published.toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
      <news:keywords>${escapeXml(post.keywords.slice(0, 5).join(', '))}</news:keywords>
    </news:news>
  </url>`
  })
  .join('\n')}
</urlset>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
