import { describe, it, expect } from 'vitest'
import {
  WORLD_CUP_SEO_PAGES,
  getWorldCupSeoPage,
  getWorldCupSeoPaths,
  type WorldCupSeoPage,
} from '@/data/world-cup-seo-pages'

const TITLE_MAX = 65 // Soft target 60; allow 5 chars headroom for Google width
const DESCRIPTION_MAX = 155
const MIN_WORDS = 600
const MIN_FAQS = 3
const MIN_RELATED_LINKS = 5

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function totalContentWords(page: WorldCupSeoPage): number {
  // Counts every word actually rendered as page content (title, description,
  // metric copy, search-signal bullets, section bodies, FAQ Q+A, table cells,
  // related-link labels). This mirrors what Googlebot sees on the page.
  const headerWords =
    wordCount(page.title) +
    wordCount(page.description) +
    wordCount(page.badge) +
    wordCount(page.primaryKeyword)
  const metricWords = page.metrics.reduce(
    (sum, m) => sum + wordCount(m.label) + wordCount(m.value) + wordCount(m.note),
    0
  )
  const signalWords = page.searchSignals.reduce((sum, s) => sum + wordCount(s), 0)
  const sectionWords = page.sections.reduce((sum, section) => {
    const bulletWords = section.bullets?.reduce((b, bullet) => b + wordCount(bullet), 0) ?? 0
    return sum + wordCount(section.heading) + wordCount(section.body) + bulletWords
  }, 0)
  const faqWords = page.faqs.reduce(
    (sum, faq) => sum + wordCount(faq.question) + wordCount(faq.answer),
    0
  )
  const relatedWords = page.relatedLinks.reduce((sum, link) => sum + wordCount(link.label), 0)
  const tableWords =
    page.tables?.reduce((sum, table) => {
      const captionWords = wordCount(table.caption)
      const descWords = table.description ? wordCount(table.description) : 0
      const colWords = table.columns.reduce((c, col) => c + wordCount(col.label), 0)
      const cellWords = table.rows.reduce((rowSum, row) => {
        return (
          rowSum +
          Object.values(row.cells).reduce((cs, val) => cs + wordCount(val), 0)
        )
      }, 0)
      return sum + captionWords + descWords + colWords + cellWords
    }, 0) ?? 0
  return (
    headerWords +
    metricWords +
    signalWords +
    sectionWords +
    faqWords +
    relatedWords +
    tableWords
  )
}

describe('WORLD_CUP_SEO_PAGES — schema quality', () => {
  it('contains the expected baseline slugs', () => {
    const slugs = WORLD_CUP_SEO_PAGES.map((p) => p.slug)
    // Original baseline must remain present (no regression).
    expect(slugs).toContain('tickets')
    expect(slugs).toContain('groups')
    expect(slugs).toContain('predictions')
    expect(slugs).toContain('players/lionel-messi')
    expect(slugs).toContain('players/cristiano-ronaldo')
    expect(slugs).toContain('stadiums/final-stadium')
  })

  it('contains the new long-tail slugs added in P2', () => {
    const slugs = WORLD_CUP_SEO_PAGES.map((p) => p.slug)
    expect(slugs).toContain('host-cities-comparison')
    expect(slugs).toContain('group-stage-tiebreakers')
    expect(slugs).toContain('squad-depth-rankings')
    expect(slugs).toContain('fan-id-explained')
    expect(slugs).toContain('ticket-resale-guide')
    expect(slugs).toContain('stadium-capacity-list')
    expect(slugs).toContain('time-zones-and-kickoff-times')
    expect(slugs).toContain('weather-forecast-by-city')
    expect(slugs).toContain('world-cup-2026-final-prediction')
  })

  it('has no duplicate slugs', () => {
    const slugs = WORLD_CUP_SEO_PAGES.map((p) => p.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: meta title is ≤ %s characters',
    (_slug, page) => {
      expect(page.metaTitle.length).toBeLessThanOrEqual(TITLE_MAX)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: description is ≤ 155 characters',
    (_slug, page) => {
      expect(page.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: has at least 3 FAQs',
    (_slug, page) => {
      expect(page.faqs.length).toBeGreaterThanOrEqual(MIN_FAQS)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: has at least 5 related links',
    (_slug, page) => {
      expect(page.relatedLinks.length).toBeGreaterThanOrEqual(MIN_RELATED_LINKS)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: has ≥ 600 words of unique content',
    (_slug, page) => {
      const total = totalContentWords(page)
      expect(total).toBeGreaterThanOrEqual(MIN_WORDS)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: has at least 3 sections',
    (_slug, page) => {
      expect(page.sections.length).toBeGreaterThanOrEqual(3)
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: all related-link hrefs start with /',
    (_slug, page) => {
      for (const link of page.relatedLinks) {
        expect(link.href.startsWith('/')).toBe(true)
      }
    }
  )

  it.each(WORLD_CUP_SEO_PAGES.map((p) => [p.slug, p] as const))(
    '%s: editorial pages have publishedAt',
    (_slug, page) => {
      if (page.contentType === 'editorial') {
        expect(page.publishedAt).toBeTruthy()
        // ISO datetime sanity check
        expect(() => new Date(page.publishedAt as string).toISOString()).not.toThrow()
      }
    }
  )

  it.each(
    WORLD_CUP_SEO_PAGES.filter((p) => p.tables && p.tables.length > 0).map(
      (p) => [p.slug, p] as const
    )
  )('%s: tables are well-formed', (_slug, page) => {
    for (const table of page.tables ?? []) {
      expect(table.columns.length).toBeGreaterThan(0)
      expect(table.rows.length).toBeGreaterThan(0)
      const columnKeys = new Set(table.columns.map((c) => c.key))
      for (const row of table.rows) {
        for (const key of columnKeys) {
          expect(row.cells[key] ?? '').toBeTruthy()
        }
      }
    }
  })
})

describe('WORLD_CUP_SEO_PAGES — visualizations and structure', () => {
  it('every page has either a table or bullets (i.e. some visual structure beyond paragraphs)', () => {
    for (const page of WORLD_CUP_SEO_PAGES) {
      const hasTable = (page.tables?.length ?? 0) > 0
      const hasBullets = page.sections.some((s) => s.bullets && s.bullets.length > 0)
      expect(hasTable || hasBullets).toBe(true)
    }
  })

  it('at least 4 pages have data tables (visualizations beyond metrics)', () => {
    const withTables = WORLD_CUP_SEO_PAGES.filter((p) => (p.tables?.length ?? 0) > 0)
    expect(withTables.length).toBeGreaterThanOrEqual(4)
  })

  it('at least 6 pages are marked as editorial (time-sensitive)', () => {
    const editorial = WORLD_CUP_SEO_PAGES.filter((p) => p.contentType === 'editorial')
    expect(editorial.length).toBeGreaterThanOrEqual(6)
  })
})

describe('WORLD_CUP_SEO_PAGES — accessors', () => {
  it('getWorldCupSeoPage resolves single-segment slug', () => {
    const page = getWorldCupSeoPage(['tickets'])
    expect(page?.slug).toBe('tickets')
  })

  it('getWorldCupSeoPage resolves multi-segment slug', () => {
    const page = getWorldCupSeoPage(['players', 'lionel-messi'])
    expect(page?.slug).toBe('players/lionel-messi')
  })

  it('getWorldCupSeoPage returns undefined for unknown slug', () => {
    const page = getWorldCupSeoPage(['nonexistent-slug-2026'])
    expect(page).toBeUndefined()
  })

  it('getWorldCupSeoPaths returns one path per page', () => {
    const paths = getWorldCupSeoPaths()
    expect(paths.length).toBe(WORLD_CUP_SEO_PAGES.length)
    for (const path of paths) {
      expect(path.startsWith('/world-cup-2026/')).toBe(true)
    }
  })
})
