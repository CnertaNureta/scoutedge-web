import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { getAllCities, getCitiesByCountry, type HostCity } from '@/data/cities-data'
import { getAllVenues } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale, itemListJsonLd, jsonLdGraph, faqPageJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import FaqSection from '@/components/ui/FaqSection'
import { CITIES_FAQS } from '@/data/faq-content'

export const revalidate = 3600

const COUNTRY_FLAG: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  MX: '\u{1F1F2}\u{1F1FD}',
  CA: '\u{1F1E8}\u{1F1E6}',
}

const SAFETY_KEYS: Record<HostCity['safety']['level'], 'safetyVerySafe' | 'safetySafe' | 'safetyModerate' | 'safetyCaution'> = {
  'very safe': 'safetyVerySafe',
  safe: 'safetySafe',
  moderate: 'safetyModerate',
  caution: 'safetyCaution',
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const alternates = buildAlternates(locale, '/cities')
  return {
    title: 'World Cup 2026 Host Cities — Fan Guide to All 16 Venues',
    description:
      'Complete fan guide to all 16 World Cup 2026 host cities across the USA, Canada, and Mexico. Hotels, transport, match schedules, and travel tips.',
    keywords:
      'World Cup 2026 host cities, World Cup 2026 venues, World Cup 2026 stadiums, World Cup 2026 travel guide',
    alternates,
    ...buildOGMeta({
      title: 'World Cup 2026 Host Cities — Fan Guide to All 16 Venues',
      description:
        'Complete fan guide to all 16 World Cup 2026 host cities across the USA, Canada, and Mexico.',
      url: alternates.canonical,
      locale,
    }),
  }
}

function SafetyBadge({ level, label }: { level: HostCity['safety']['level']; label: string }) {
  const variant: Record<string, 'primary' | 'tertiary' | 'secondary' | 'outline'> = {
    'very safe': 'primary',
    safe: 'tertiary',
    moderate: 'secondary',
    caution: 'outline',
  }
  return <Badge variant={variant[level] ?? 'outline'}>{label}</Badge>
}

function PriceIndicator({ level }: { level: HostCity['food']['priceLevel'] }) {
  const symbols: Record<string, string> = {
    budget: '$',
    moderate: '$$',
    expensive: '$$$',
  }
  return (
    <span className="font-mono text-tertiary text-sm">{symbols[level] ?? '$$'}</span>
  )
}

function CityCard({
  city,
  venueName,
  safetyLabel,
}: {
  city: HostCity
  venueName: string | undefined
  safetyLabel: string
}) {
  const flag = COUNTRY_FLAG[city.countryCode] ?? ''

  return (
    <Link href={`/cities/${city.slug}`} className="group">
      <GlassCard
        className="p-6 h-full hover:bg-surface-bright transition-all duration-300 hover:-translate-y-1"
        hover
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-headline text-xl uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">
            {city.name}
          </h3>
          <span className="text-2xl ml-2 shrink-0" aria-label={city.country}>
            {flag}
          </span>
        </div>

        <p className="text-on-surface-variant text-sm mb-4">
          {city.state}, {city.country}
        </p>

        {venueName && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
            <svg
              className="w-3.5 h-3.5 text-primary shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2a2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2v1.5"
              />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>{venueName}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {city.highlights.slice(0, 3).map((h) => (
            <span
              key={h}
              className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-label text-on-surface-variant"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <SafetyBadge level={city.safety.level} label={safetyLabel} />
          <PriceIndicator level={city.food.priceLevel} />
        </div>
      </GlassCard>
    </Link>
  )
}

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('citiesPage')
  const allCities = getAllCities()
  const venues = getAllVenues()
  const venueMap = new Map(venues.map((v) => [v.id, v]))

  const groups: Array<{ code: 'US' | 'MX' | 'CA'; count: number }> = [
    { code: 'US', count: getCitiesByCountry('US').length },
    { code: 'MX', count: getCitiesByCountry('MX').length },
    { code: 'CA', count: getCitiesByCountry('CA').length },
  ]

  function getVenueName(city: HostCity): string | undefined {
    if (city.venueIds.length === 0) return undefined
    const venue = venueMap.get(city.venueIds[0])
    return venue?.name
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Host Cities', url: canonicalForLocale(locale, '/cities') },
  ])

  const citiesList = itemListJsonLd(
    allCities.map((c) => ({
      name: c.name,
      url: canonicalForLocale(locale, `/cities/${c.slug}`),
      description: `${c.state}, ${c.country} — World Cup 2026 host city`,
    })),
    {
      name: 'World Cup 2026 — Host Cities',
      description: 'All 16 host cities across the United States, Canada, and Mexico for the 2026 FIFA World Cup.',
      url: canonicalForLocale(locale, '/cities'),
    }
  )

  const jsonLd = jsonLdGraph([breadcrumbs, citiesList, faqPageJsonLd(CITIES_FAQS)])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('heroBadge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>

          {/* Country count pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {groups.map(({ code, count }) => (
              <span
                key={code}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/[0.08] text-sm font-label"
              >
                <span>{COUNTRY_FLAG[code]}</span>
                <span className="text-on-surface">{t(`country.${code}`)}</span>
                <span className="font-mono text-primary">({count})</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* City groups by country */}
      {groups.map(({ code, count }) => {
        const cities = getCitiesByCountry(code)
        return (
          <section key={code} className="max-w-[1440px] mx-auto px-6 pb-16">
            <SectionHeader className="mb-8">
              {COUNTRY_FLAG[code]} {t(`country.${code}`)}{' '}
              <span className="text-on-surface-variant text-2xl font-body font-normal normal-case tracking-normal">
                {t('cityCount', { count })}
              </span>
            </SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cities.map((city) => (
                <CityCard
                  key={city.slug}
                  city={city}
                  venueName={getVenueName(city)}
                  safetyLabel={t(SAFETY_KEYS[city.safety.level])}
                />
              ))}
            </div>
          </section>
        )
      })}

      <FaqSection items={CITIES_FAQS} heading="Host Cities — FAQ" />

      {/* Bottom CTAs */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20 text-center">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/travel"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            {t('travelGuide')}
          </Link>
          <Link
            href="/schedule"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('fullSchedule')}
          </Link>
        </div>
      </section>
    </>
  )
}
