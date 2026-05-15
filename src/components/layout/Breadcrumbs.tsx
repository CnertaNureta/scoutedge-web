import { Link } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'
import { breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'

export interface Crumb {
  /** Visible label */
  name: string
  /** Locale-relative path (e.g. `/teams/brazil`). Schema URL is built absolute. */
  href: string
}

interface BreadcrumbsProps {
  items: Crumb[]
  /** Optional class for layout tweaks per page */
  className?: string
}

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD.
 *
 * Pages should render this near the top of <main>, after the hero section,
 * so the schema-content match is unambiguous to Google.
 *
 * The first crumb should always be Home (`/`); the last item is the
 * current page and renders as plain text (not a link) with aria-current.
 */
export default async function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null

  const locale = await getLocale()
  const schemaItems = items.map((c) => ({
    name: c.name,
    url: canonicalForLocale(locale, c.href),
  }))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(schemaItems)) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`text-sm text-on-surface-variant ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-2 max-w-[1440px] mx-auto px-6 py-3">
          {items.map((c, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={`${c.href}-${i}`} className="flex items-center gap-2">
                {isLast ? (
                  <span aria-current="page" className="text-on-surface truncate max-w-[40ch]">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link
                      href={c.href}
                      className="hover:text-primary transition-colors truncate max-w-[30ch]"
                    >
                      {c.name}
                    </Link>
                    <span aria-hidden="true" className="opacity-40">
                      /
                    </span>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
