/**
 * News service — fetches real World Cup 2026 news from Google News RSS at build time.
 * Falls back to empty array if fetch fails.
 */

export interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  relativeTime: string
}

const GOOGLE_NEWS_RSS =
  'https://news.google.com/rss/search?q=FIFA+World+Cup+2026&hl=en-US&gl=US&ceid=US:en'

const BBC_SPORT_RSS = 'https://feeds.bbci.co.uk/sport/football/rss.xml'

function parseRssItems(xml: string): Array<{ title: string; link: string; source: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; source: string; pubDate: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? block.match(/<title>(.*?)<\/title>/)?.[1]
      ?? ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
      ?? block.match(/<dc:creator>(.*?)<\/dc:creator>/)?.[1]
      ?? extractSourceFromTitle(title)

    if (title && !title.includes('[Removed]')) {
      items.push({ title: cleanHtml(title), link, source: cleanHtml(source), pubDate })
    }
  }

  return items
}

function cleanHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x20;/g, ' ')
    .trim()
}

function extractSourceFromTitle(title: string): string {
  const dash = title.lastIndexOf(' - ')
  if (dash > 0) return title.slice(dash + 3).trim()
  const pipe = title.lastIndexOf(' | ')
  if (pipe > 0) return title.slice(pipe + 3).trim()
  return ''
}

function getRelativeTime(pubDate: string): string {
  try {
    const published = new Date(pubDate)
    const now = new Date()
    const diffMs = now.getTime() - published.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    return published.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

async function fetchRss(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScoutEdge/1.0)' },
  })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  return res.text()
}

export async function fetchWorldCupNews(limit = 20): Promise<NewsItem[]> {
  try {
    const [googleXml, bbcXml] = await Promise.allSettled([
      fetchRss(GOOGLE_NEWS_RSS),
      fetchRss(BBC_SPORT_RSS),
    ])

    const allItems: Array<{ title: string; link: string; source: string; pubDate: string }> = []

    if (googleXml.status === 'fulfilled') {
      allItems.push(...parseRssItems(googleXml.value))
    }

    if (bbcXml.status === 'fulfilled') {
      const bbcItems = parseRssItems(bbcXml.value).filter(
        (item) =>
          item.title.toLowerCase().includes('world cup') ||
          item.title.toLowerCase().includes('2026') ||
          item.title.toLowerCase().includes('qualifier') ||
          item.title.toLowerCase().includes('play-off') ||
          item.title.toLowerCase().includes('playoff')
      )
      for (const item of bbcItems) {
        if (!item.source) item.source = 'BBC Sport'
      }
      allItems.push(...bbcItems)
    }

    // Deduplicate by title similarity
    const seen = new Set<string>()
    const unique = allItems.filter((item) => {
      const key = item.title.toLowerCase().slice(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by date (newest first)
    unique.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0
      const db = new Date(b.pubDate).getTime() || 0
      return db - da
    })

    return unique.slice(0, limit).map((item) => ({
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
      relativeTime: getRelativeTime(item.pubDate),
    }))
  } catch (e) {
    console.error('News fetch failed:', e)
    return []
  }
}
