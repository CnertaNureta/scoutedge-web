import { getAllPosts, type BlogPost } from '@/lib/blog-service'
import { SUPPORTED_LOCALES, LOCALE_CONFIGS } from '@/i18n/locales'

const BASE_URL = 'https://kickoracle.com'

/**
 * Google News Sitemap spec:
 * - Only include articles published in the last 48 hours.
 * - Maximum 1,000 URLs per sitemap.
 * - <news:publication>, <news:publication_date>, <news:title> are required.
 *
 * Reference: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */
const NEWS_WINDOW_HOURS = 48
const MIN_NEWS_WORD_COUNT = 400
const MAX_NEWS_URLS = 1000

/** Default content types eligible for Google News (news-style content only). */
const NEWS_CONTENT_TYPES = new Set(['daily_briefing', 'news', 'editorial'])

export const NEWS_SITEMAP_URL = `${BASE_URL}/news-sitemap.xml`

export interface NewsSitemapOptions {
  /** Override the locale list. Defaults to all supported locales. */
  locales?: readonly string[]
  /** Limit to first N URLs (post × locale fanout). Defaults to MAX_NEWS_URLS. */
  maxUrls?: number
}

function getPublishDate(post: Pick<BlogPost, 'publishedAt' | 'date'>): Date | null {
  const value = post.publishedAt || post.date
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isNewsContent(post: BlogPost): boolean {
  // Treat any post with a recognised news contentType as news-eligible.
  // If a post has no contentType, fall back to category check.
  if (post.contentType && NEWS_CONTENT_TYPES.has(post.contentType)) return true
  if (!post.contentType && post.category?.toLowerCase().includes('briefing')) return true
  return false
}

export function getRecentNewsPosts(posts: BlogPost[] = getAllPosts(), now: Date = new Date()): BlogPost[] {
  const cutoff = new Date(now.getTime() - NEWS_WINDOW_HOURS * 60 * 60 * 1000)

  return posts.filter((post) => {
    if (!isNewsContent(post)) return false
    if (post.wordCount < MIN_NEWS_WORD_COUNT) return false
    const published = getPublishDate(post)
    return Boolean(published && published >= cutoff && published <= now)
  })
}

export function hasRecentNewsPosts(posts: BlogPost[] = getAllPosts(), now: Date = new Date()): boolean {
  return getRecentNewsPosts(posts, now).length > 0
}

interface NewsUrlEntry {
  loc: string
  language: string
  publicationDate: string
  title: string
  keywords: string
}

function buildEntries(
  posts: BlogPost[],
  locales: readonly string[],
  maxUrls: number,
): NewsUrlEntry[] {
  const entries: NewsUrlEntry[] = []

  for (const post of posts) {
    if (entries.length >= maxUrls) break
    const published = getPublishDate(post)
    if (!published) continue
    const publicationDate = published.toISOString()
    const keywords = post.keywords.slice(0, 5).join(', ')

    for (const locale of locales) {
      if (entries.length >= maxUrls) break
      const config = LOCALE_CONFIGS[locale as keyof typeof LOCALE_CONFIGS]
      const language = config?.hreflang ?? locale
      entries.push({
        loc: `${BASE_URL}/${locale}/blog/${post.slug}`,
        language,
        publicationDate,
        title: post.title,
        keywords,
      })
    }
  }

  return entries
}

export function newsSitemapToXml(
  posts: BlogPost[],
  options: NewsSitemapOptions = {},
): string {
  const locales = options.locales ?? SUPPORTED_LOCALES
  const maxUrls = options.maxUrls ?? MAX_NEWS_URLS
  const entries = buildEntries(posts, locales, maxUrls)

  const urlBlocks = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <news:news>
      <news:publication>
        <news:name>KickOracle</news:name>
        <news:language>${entry.language}</news:language>
      </news:publication>
      <news:publication_date>${entry.publicationDate}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>${
        entry.keywords ? `\n      <news:keywords>${escapeXml(entry.keywords)}</news:keywords>` : ''
      }
    </news:news>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${
    urlBlocks ? `\n${urlBlocks}\n` : '\n'
  }</urlset>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Internal exports for testing.
export const __NEWS_SITEMAP_CONSTANTS__ = {
  NEWS_WINDOW_HOURS,
  MIN_NEWS_WORD_COUNT,
  MAX_NEWS_URLS,
}
