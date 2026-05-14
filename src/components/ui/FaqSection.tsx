import type { FaqEntry } from '@/data/faq-content'
import SectionHeader from './SectionHeader'

interface FaqSectionProps {
  heading?: string
  items: FaqEntry[]
  /** Optional CSS class applied to the wrapping <section>. */
  className?: string
}

/**
 * Visible FAQ block paired with the FAQPage JSON-LD on hub pages.
 *
 * Google requires FAQ content to be visible to users on the page (not only
 * present in structured data) — using <details>/<summary> gives a native
 * collapsible UX without pulling in a heavier accordion component.
 */
export default function FaqSection({
  heading = 'Frequently Asked Questions',
  items,
  className = '',
}: FaqSectionProps) {
  if (items.length === 0) return null
  return (
    <section className={`max-w-[1100px] mx-auto px-6 pb-20 ${className}`}>
      <SectionHeader className="mb-6">{heading}</SectionHeader>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-white/[0.08] bg-surface-container/60 backdrop-blur-sm px-5 py-4 md:px-6 md:py-5 transition-colors hover:border-primary/30"
          >
            <summary className="flex cursor-pointer items-start justify-between gap-4 font-label text-sm md:text-base font-semibold text-on-surface list-none [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="mt-1 text-primary text-lg leading-none transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-on-surface-variant text-sm md:text-base leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
