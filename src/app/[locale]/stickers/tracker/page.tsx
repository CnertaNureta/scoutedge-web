import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import Badge from '@/components/ui/Badge'
import { getAllTeams } from '@/lib/data-service'
import StickerTracker from './StickerTracker'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  return {
    title: 'Panini Sticker Collection Tracker — World Cup 2026',
    description:
      'Track which stickers you have, find duplicates, and monitor your completion progress for the 2026 World Cup Panini album.',
    alternates: buildAlternates(locale, '/stickers/tracker'),
  }
}

export default async function StickerTrackerPage() {
  const t = await getTranslations('stickerTrackerPage')
  const teams = getAllTeams().map((tm) => ({
    slug: tm.slug,
    name: tm.name,
    flag: tm.flag,
    group: tm.group,
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kickoracle.com' },
      { '@type': 'ListItem', position: 2, name: 'Stickers', item: 'https://kickoracle.com/stickers' },
      { '@type': 'ListItem', position: 3, name: 'Tracker', item: 'https://kickoracle.com/stickers/tracker' },
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
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/[0.06] blur-[180px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('badge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            {t('heroTitle1')}<br />
            <span className="gradient-text">{t('heroTitle2')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      {/* Tracker */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <StickerTracker teams={teams} />
      </section>

      {/* Navigation */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/stickers"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('allStickerTools')}
          </Link>
          <Link
            href="/stickers/cost-calculator"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            {t('costCalculator')}
          </Link>
        </div>
      </section>
    </>
  )
}
