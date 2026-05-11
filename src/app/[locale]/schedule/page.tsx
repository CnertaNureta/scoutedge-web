import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import SectionHeader from '@/components/ui/SectionHeader'
import HeroRegistrationCta from '@/components/ui/HeroRegistrationCta'
import ScheduleClient from './ScheduleClient'
import ScheduleLoading from './loading'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'schedulePage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords:
      'World Cup 2026 schedule, World Cup 2026 full calendar, World Cup 2026 knockout stage, World Cup 2026 final, World Cup 2026 all matches',
    alternates: buildAlternates(locale, '/schedule'),
    ...buildOGMeta({
      title: t('heading'),
      description: t('description'),
      url: canonicalForLocale(locale, '/schedule'),
      locale,
    }),
  }
}

export default async function SchedulePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('schedulePage')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'FIFA World Cup 2026 — Complete Match Schedule',
    description: 'All 104 matches from group stage through the Final at MetLife Stadium.',
    numberOfItems: 104,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: canonicalForLocale(locale, '/') },
        { name: 'Schedule', url: canonicalForLocale(locale, '/schedule') },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="hidden sm:block absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px]" aria-hidden="true" />
        <div className="hidden sm:block absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-tertiary/6 blur-[120px]" aria-hidden="true" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-secondary">
            {t('dateRange')}
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block gradient-text">{t('heading')}</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-6">
            {t('description')}
          </p>

          <HeroRegistrationCta
            headline={t('ctaText')}
            cta={t('ctaButton')}
            className="justify-center"
          />
        </div>
      </section>

      {/* Schedule Content */}
      <section className="page-container pb-24">
        <SectionHeader className="mb-8">{t('matchTimeline')}</SectionHeader>
        <Suspense fallback={<ScheduleLoading />}>
          <ScheduleClient />
        </Suspense>
      </section>
    </>
  )
}
