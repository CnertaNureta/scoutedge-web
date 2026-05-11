import type { ComponentProps, ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'

type LinkHref = ComponentProps<typeof Link>['href']

export interface RelatedEntityLink {
  /**
   * The visible anchor text. Should be the entity NAME — never "click here"
   * or "more". The anchor text is the most important on-page SEO signal
   * for internal links.
   */
  label: string
  /**
   * Locale-relative path (e.g. `/teams/argentina`). The locale prefix is
   * applied automatically by next-intl's Link, so callers must NOT pre-
   * pend `/{locale}`.
   */
  href: LinkHref
  /** Short caption rendered below the label (e.g. role, group, country). */
  meta?: ReactNode
  /** Optional decoration rendered to the left of the label (flag, badge). */
  prefix?: ReactNode
}

export interface RelatedEntitiesSectionProps {
  /**
   * Section heading. Rendered as an `<h2>` so it counts as a real on-page
   * heading for search crawlers and assistive tech.
   */
  title: string
  /** Optional short blurb shown under the heading. */
  description?: string
  items: RelatedEntityLink[]
  /** Tailwind grid column classes. Defaults to a responsive 2/3/4 grid. */
  columnsClassName?: string
  /** Override the rendering for each card if a list-of-pills variant is desired. */
  variant?: 'card' | 'pill'
  className?: string
}

/**
 * Reusable server-rendered section for surfacing related entities. Lives in
 * the initial HTML payload so Googlebot can crawl every link without running
 * JavaScript, and uses the locale-aware next-intl `Link` so hreflang chains
 * are preserved.
 */
export default function RelatedEntitiesSection({
  title,
  description,
  items,
  columnsClassName = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  variant = 'card',
  className = '',
}: RelatedEntitiesSectionProps) {
  if (items.length === 0) return null

  return (
    <section className={`max-w-[1440px] mx-auto px-6 mb-16 ${className}`}>
      <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-2">
        {title}
      </h2>
      {description ? (
        <p className="text-on-surface-variant text-sm md:text-base mb-6 max-w-3xl">
          {description}
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {variant === 'pill' ? (
        <ul className="flex flex-wrap gap-3 list-none p-0">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`}>
              <Link
                href={item.href}
                className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/30 px-5 py-2.5 rounded-full font-body text-sm transition-all hover:text-primary"
              >
                {item.prefix ? <span aria-hidden="true">{item.prefix}</span> : null}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`grid ${columnsClassName} gap-3 list-none p-0`}>
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`}>
              <Link href={item.href} className="block group h-full">
                <GlassCard hover className="p-4 h-full">
                  <div className="flex items-start gap-3">
                    {item.prefix ? (
                      <span className="text-2xl shrink-0" aria-hidden="true">
                        {item.prefix}
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-headline text-base font-bold tracking-tight group-hover:text-primary transition-colors truncate">
                        {item.label}
                      </p>
                      {item.meta ? (
                        <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-widest mt-1">
                          {item.meta}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
