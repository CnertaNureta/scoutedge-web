import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import Badge from '@/components/ui/Badge'
import CostCalculator from './CostCalculator'

export const metadata: Metadata = {
  title: 'Sticker Album Cost Calculator — World Cup 2026',
  description:
    'Calculate the expected cost to complete your 2026 World Cup Panini sticker album based on pack prices, collection size, and trading partners.',
  alternates: { canonical: 'https://kickoracle.com/stickers/cost-calculator' },
}

export default async function StickerCostCalculatorPage() {
  const t = await getTranslations('stickerCostCalculatorPage')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kickoracle.com' },
      { '@type': 'ListItem', position: 2, name: 'Stickers', item: 'https://kickoracle.com/stickers' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Cost Calculator',
        item: 'https://kickoracle.com/stickers/cost-calculator',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/[0.05] blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('badge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            {t('heroTitle1')}<br />
            <span className="gradient-text">{t('heroTitle2')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('heroDescription1')} <span className="text-primary font-semibold">{t('heroDescriptionEmphasis')}</span> {t('heroDescription2')}
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <CostCalculator />
      </section>

      {/* Navigation */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/stickers"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <span aria-hidden="true">&larr;</span> {t('allStickerTools')}
          </Link>
          <Link
            href="/stickers/tracker"
            className="btn-secondary inline-flex items-center gap-2"
          >
            {t('collectionTracker')} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </>
  )
}
