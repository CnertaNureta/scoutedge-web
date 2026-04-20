import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

export interface FAQ {
  question: string
  answer: string
}

export interface TOCItem {
  id: string
  text: string
  level: number
}

export interface BlogPost {
  slug: string
  title: string
  description: string
  keywords: string[]
  date: string
  lastUpdated: string
  author: string
  category: string
  content: string
  html: string
  readingTime: number
  wordCount: number
  faqs: FAQ[]
  toc: TOCItem[]
  contentType?: string
  sourceDate?: string
  publishedAt?: string
  factCount?: number
}

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog')

function getSortTimestamp(post: Pick<BlogPost, 'publishedAt' | 'lastUpdated' | 'date' | 'sourceDate'>): number {
  const candidates = [post.publishedAt, post.lastUpdated, post.date, post.sourceDate]

  for (const value of candidates) {
    if (!value) continue
    const timestamp = new Date(value).getTime()
    if (Number.isFinite(timestamp)) {
      return timestamp
    }
  }

  return 0
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

function extractTOC(html: string): TOCItem[] {
  const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/g
  const items: TOCItem[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    items.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, ''),
    })
  }
  return items
}

function parseFAQs(content: string): FAQ[] {
  // Extract FAQ section from markdown (everything after "## FAQ" or "## Frequently Asked Questions")
  const faqMatch = content.match(/## (?:FAQ|Frequently Asked Questions)\s*\n([\s\S]*?)(?=\n## |\n---|\s*$)/)
  if (!faqMatch) return []

  const faqBlock = faqMatch[1]
  const faqs: FAQ[] = []
  const qBlocks = faqBlock.split(/\n### /).filter(Boolean)

  for (const block of qBlocks) {
    const lines = block.trim().split('\n')
    const question = lines[0].replace(/^\*\*|\*\*$/g, '').replace(/\??\s*$/, '?').trim()
    const answer = lines.slice(1).join(' ').replace(/^\s*\n*/, '').trim()
    if (question && answer) {
      faqs.push({ question, answer })
    }
  }
  return faqs
}

export function getAllPosts(): BlogPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'))
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
      const { data, content } = matter(raw)

      // Configure marked to add IDs to headings for TOC
      const renderer = new marked.Renderer()
      renderer.heading = function ({ text, depth }: { text: string; depth: number }) {
        const cleanText = text.replace(/<[^>]*>/g, '')
        const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      }

      const html = marked.parse(content, { renderer }) as string
      const wordCount = content.split(/\s+/).length

      return {
        slug: data.slug ?? file.replace(/\.md$/, ''),
        title: data.title ?? 'Untitled',
        description: data.description ?? '',
        keywords: data.keywords ?? [],
        date: data.date ?? '',
        lastUpdated: data.lastUpdated ?? data.date ?? '',
        author: data.author ?? 'KickOracle AI',
        category: data.category ?? 'Article',
        content,
        html,
        readingTime: estimateReadingTime(content),
        wordCount,
        faqs: parseFAQs(content),
        toc: extractTOC(html),
        contentType: typeof data.contentType === 'string' ? data.contentType : undefined,
        sourceDate: typeof data.sourceDate === 'string' ? data.sourceDate : undefined,
        publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : undefined,
        factCount: typeof data.factCount === 'number' ? data.factCount : undefined,
      }
    })
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a))
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getLatestNarrativePost(contentType: string): BlogPost | undefined {
  return getAllPosts()
    .filter((post) => post.contentType === contentType)
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a))[0]
}
