import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'
import {
  WORLD_CUP_SEO_PAGES,
  getWorldCupSeoPage,
  type WorldCupSeoPage,
  type SeoTable,
} from '@/data/world-cup-seo-pages'
import {
  buildOGMeta,
  breadcrumbJsonLd,
  canonicalForLocale,
  articleJsonLd,
  itemListJsonLd,
  faqPageJsonLd,
} from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

export const revalidate = 86400
export const dynamicParams = false

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

export function generateStaticParams() {
  return WORLD_CUP_SEO_PAGES.map((page) => ({
    slug: page.slug.split('/'),
  }))
}

function pagePath(page: WorldCupSeoPage): string {
  return `/world-cup-2026/${page.slug}`
}

function formatUpdated(value: string, locale: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function alignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

function SeoTableBlock({ table }: { table: SeoTable }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <h2 className="font-headline text-xl md:text-2xl uppercase tracking-wide text-on-surface">
        {table.caption}
      </h2>
      {table.description ? (
        <p className="mt-2 text-sm md:text-base text-on-surface-variant leading-relaxed">
          {table.description}
        </p>
      ) : null}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-sm md:text-base">
          <thead>
            <tr className="border-b border-white/[0.12]">
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-3 px-3 font-label text-[11px] uppercase tracking-widest text-on-surface-variant ${alignClass(col.align)}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr
                key={`${row.cells[table.columns[0].key]}-${rowIdx}`}
                className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.03] transition-colors"
              >
                {table.columns.map((col, colIdx) => {
                  const value = row.cells[col.key] ?? ''
                  const isFirstCol = colIdx === 0
                  const content = isFirstCol && row.href ? (
                    <Link
                      href={row.href}
                      className="text-on-surface hover:text-primary transition-colors font-label font-semibold"
                    >
                      {value}
                    </Link>
                  ) : (
                    value
                  )
                  return (
                    <td
                      key={col.key}
                      className={`py-3 px-3 text-on-surface-variant ${alignClass(col.align)}`}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const page = getWorldCupSeoPage(slug)
  if (!page) return {}

  const path = pagePath(page)
  const alternates = buildAlternates(locale, path)
  const isEditorial = page.contentType === 'editorial'

  return {
    title: page.metaTitle,
    description: page.description,
    keywords: [
      page.primaryKeyword,
      ...page.faqs.map((faq) => faq.question.toLowerCase()),
    ],
    alternates,
    ...buildOGMeta({
      title: page.metaTitle,
      description: page.description,
      url: alternates.canonical,
      locale,
      type: 'article',
      section: 'World Cup 2026',
      publishedTime: isEditorial ? page.publishedAt : undefined,
      modifiedTime: page.updated ? `${page.updated}T00:00:00.000Z` : undefined,
    }),
  }
}

export default async function WorldCupSeoPageRoute({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const page = getWorldCupSeoPage(slug)
  if (!page) notFound()

  const path = pagePath(page)
  const url = canonicalForLocale(locale, path)
  const updatedLabel = formatUpdated(page.updated, locale)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'World Cup 2026', url: canonicalForLocale(locale, '/world-cup-2026') },
    { name: page.title, url },
  ])

  const faqJsonLd = page.faqs.length > 0 ? faqPageJsonLd(page.faqs) : null

  // Emit ItemList JSON-LD whenever the page has a structured table (sortable list
  // of host cities, stadiums, etc). Use the first table as the primary list since
  // most pages only have one and it's the most representative.
  const primaryTable = page.tables?.[0]
  const itemListJson = primaryTable
    ? itemListJsonLd(
        primaryTable.rows.map((row) => ({
          name: row.cells[primaryTable.columns[0].key] ?? '',
          url: row.href
            ? canonicalForLocale(locale, row.href)
            : url,
        })),
        {
          name: primaryTable.caption,
          description: primaryTable.description,
          url,
        }
      )
    : null

  // Editorial pages emit Article JSON-LD as NewsArticle to qualify for Top Stories.
  // Reference pages get a generic WebPage schema (already emitted below).
  const isEditorial = page.contentType === 'editorial'
  const articleJson = isEditorial
    ? articleJsonLd({
        headline: page.title,
        description: page.description,
        url,
        type: 'NewsArticle',
        datePublished: page.publishedAt,
        dateModified: `${page.updated}T00:00:00.000Z`,
        keywords: page.primaryKeyword,
      })
    : null

  const webpageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url,
    dateModified: page.updated,
    inLanguage: locale,
    isPartOf: {
      '@type': 'WebSite',
      name: 'KickOracle',
      url: 'https://kickoracle.com',
    },
    about: {
      '@type': 'SportsEvent',
      name: 'FIFA World Cup 2026',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      {itemListJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJson) }}
        />
      ) : null}
      {articleJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJson) }}
        />
      ) : null}

      <section className="relative px-6 py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1160px] mx-auto">
          <div className="max-w-3xl">
            <Badge variant="tertiary" size="md">{page.badge}</Badge>
            <p className="mt-5 font-label text-xs font-semibold uppercase tracking-widest text-primary">
              Updated {updatedLabel} · Primary keyword: {page.primaryKeyword}
            </p>
            <h1 className="mt-4 font-headline text-4xl md:text-6xl lg:text-7xl uppercase tracking-wide leading-[0.95] text-on-surface">
              {page.title}
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-on-surface-variant">
              {page.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/world-cup-2026/predictions"
                className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-label text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                See predictions
              </Link>
              <Link
                href="/world-cup-2026/groups"
                className="border border-white/20 text-on-surface px-6 py-3 rounded-2xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
              >
                Track groups
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1160px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {page.metrics.map((metric) => (
            <GlassCard key={metric.label} className="p-5">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                {metric.label}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold text-primary">{metric.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{metric.note}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="max-w-[1160px] mx-auto px-6 pb-12">
        <GlassCard className="p-6 md:p-8">
          <SectionHeader className="mb-5">Search validation</SectionHeader>
          <ul className="grid gap-3 text-sm md:text-base text-on-surface-variant">
            {page.searchSignals.map((signal) => (
              <li key={signal} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      <section className="max-w-[1160px] mx-auto px-6 pb-12">
        <div className="space-y-5">
          {page.sections.map((section) => (
            <GlassCard key={section.heading} className="p-6 md:p-8">
              <h2 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-on-surface">
                {section.heading}
              </h2>
              <p className="mt-4 text-base md:text-lg leading-relaxed text-on-surface-variant">
                {section.body}
              </p>
              {section.bullets ? (
                <ul className="mt-5 grid gap-3 text-sm md:text-base text-on-surface-variant">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-tertiary shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </GlassCard>
          ))}
        </div>
      </section>

      {page.tables && page.tables.length > 0 ? (
        <section className="max-w-[1160px] mx-auto px-6 pb-12">
          <div className="space-y-5">
            {page.tables.map((table) => (
              <SeoTableBlock key={table.caption} table={table} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="max-w-[1160px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Frequently asked questions</SectionHeader>
        <div className="space-y-4">
          {page.faqs.map((faq) => (
            <GlassCard key={faq.question} className="p-5 md:p-6">
              <h2 className="font-label text-base font-semibold text-on-surface">
                {faq.question}
              </h2>
              <p className="mt-3 text-sm md:text-base leading-relaxed text-on-surface-variant">
                {faq.answer}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="max-w-[1160px] mx-auto px-6 pb-20">
        <GlassCard className="p-6 md:p-8">
          <SectionHeader className="mb-5">Next reads</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {page.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border border-white/10 rounded-2xl px-5 py-4 text-sm font-label font-semibold uppercase tracking-widest text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>
    </>
  )
}
