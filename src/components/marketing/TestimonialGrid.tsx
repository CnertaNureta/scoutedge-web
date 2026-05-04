import { useTranslations } from 'next-intl'
import testimonialsData from '@/data/testimonials.json'

interface Testimonial {
  name: string
  location: string
  quote: string
  tier: string
}

const testimonials = testimonialsData.items as Testimonial[]

export default function TestimonialGrid({
  limit,
  variant = 'full',
}: {
  limit?: number
  variant?: 'full' | 'compact'
}) {
  const t = useTranslations('testimonials')
  const items = limit ? testimonials.slice(0, limit) : testimonials

  return (
    <div>
      {variant === 'full' && (
        <div className="text-center mb-10">
          <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mb-3 text-on-surface">
            {t('heading')}
          </h2>
          <p className="text-on-surface-variant text-sm max-w-2xl mx-auto">{t('intro')}</p>
        </div>
      )}
      <div
        className={`grid gap-4 ${
          variant === 'compact'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {items.map((it, i) => (
          <figure
            key={i}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col"
          >
            <blockquote className="text-on-surface text-sm leading-relaxed mb-4 flex-1">
              &ldquo;{it.quote}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 border border-white/10 flex items-center justify-center font-bold text-on-surface text-sm"
                aria-hidden="true"
              >
                {it.name.charAt(0)}
              </span>
              <div className="leading-tight">
                <p className="text-on-surface text-xs font-bold">{it.name}</p>
                <p className="text-on-surface-variant text-[11px]">{it.location}</p>
                <p className="text-secondary text-[10px] font-label uppercase tracking-widest font-semibold mt-0.5">
                  {t('tierLabel', { tier: it.tier })}
                </p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
