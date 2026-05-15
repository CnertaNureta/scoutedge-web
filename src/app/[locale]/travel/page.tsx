import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale, faqPageJsonLd, jsonLdGraph } from '@/lib/og-utils'
import FaqSection from '@/components/ui/FaqSection'
import { TRAVEL_FAQS } from '@/data/faq-content'

export const revalidate = 86400

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const alternates = buildAlternates(locale, '/travel')

  return {
    title: 'World Cup 2026 Travel Guide — Visa, Budget & Planning',
    description:
      'Plan your trip to the 2026 World Cup. Visa requirements, budget calculator, city guides, and travel tips for USA, Canada, and Mexico.',
    keywords:
      'World Cup 2026 travel, World Cup 2026 visa, World Cup 2026 budget, World Cup 2026 trip planner, World Cup 2026 hotels',
    alternates,
    ...buildOGMeta({
      title: 'World Cup 2026 Travel Guide — Visa, Budget & Planning',
      description:
        'Plan your trip to the 2026 World Cup across the USA, Mexico, and Canada. Visa requirements, budget calculator, city guides, eSIM deals, and hotel recommendations.',
      url: alternates.canonical,
      locale,
    }),
  }
}

export default async function TravelPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('travelPage')

  const quickFacts = [
    { label: t('facts.hostCountries'), value: '3', detail: t('facts.hostCountriesDetail') },
    { label: t('facts.hostCities'), value: '16', detail: t('facts.hostCitiesDetail') },
    { label: t('facts.stadiums'), value: '16', detail: t('facts.stadiumsDetail') },
    { label: t('facts.tournamentDates'), value: t('facts.tournamentDatesValue'), detail: t('facts.tournamentDatesDetail') },
    { label: t('facts.totalMatches'), value: '104', detail: t('facts.totalMatchesDetail') },
    { label: t('facts.currencies'), value: '3', detail: t('facts.currenciesDetail') },
  ]

  const travelSections = [
    {
      href: '/travel/visa',
      icon: '🛂',
      title: t('sections.visaTitle'),
      description: t('sections.visaDescription'),
      badge: t('sections.visaBadge'),
      badgeVariant: 'secondary' as const,
    },
    {
      href: '/travel/budget-calculator',
      icon: '💰',
      title: t('sections.budgetTitle'),
      description: t('sections.budgetDescription'),
      badge: t('sections.budgetBadge'),
      badgeVariant: 'primary' as const,
    },
    {
      href: '/cities',
      icon: '🏙️',
      title: t('sections.citiesTitle'),
      description: t('sections.citiesDescription'),
      badge: t('sections.citiesBadge'),
      badgeVariant: 'tertiary' as const,
    },
  ]

  const countries = [
    {
      flag: '🇺🇸',
      name: t('country.usName'),
      cities: 11,
      currency: 'USD',
      visa: t('country.usVisa'),
      highlights: [t('country.usHighlight1'), t('country.usHighlight2'), t('country.usHighlight3')],
    },
    {
      flag: '🇲🇽',
      name: t('country.mxName'),
      cities: 3,
      currency: 'MXN',
      visa: t('country.mxVisa'),
      highlights: [t('country.mxHighlight1'), t('country.mxHighlight2'), t('country.mxHighlight3')],
    },
    {
      flag: '🇨🇦',
      name: t('country.caName'),
      cities: 2,
      currency: 'CAD',
      visa: t('country.caVisa'),
      highlights: [t('country.caHighlight1'), t('country.caHighlight2'), t('country.caHighlight3')],
    },
  ]

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Travel Guide', url: canonicalForLocale(locale, '/travel') },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph([breadcrumbs, faqPageJsonLd(TRAVEL_FAQS)])),
        }}
      />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('heroBadge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            {t('heroTitle1')}<br />
            <span className="gradient-text">{t('heroTitle2')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      {/* ── Quick Facts ────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickFacts.map((fact) => (
            <GlassCard key={fact.label} className="p-5 text-center">
              <p className="font-mono text-2xl md:text-3xl text-primary font-bold">{fact.value}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                {fact.label}
              </p>
              <p className="text-on-surface-variant text-xs mt-1">{fact.detail}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Travel Resources ────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">{t('resources')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {travelSections.map((section) => (
            <Link key={section.href} href={section.href} className="group">
              <GlassCard className="p-8 h-full flex flex-col" hover>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl block">{section.icon}</span>
                  <Badge variant={section.badgeVariant} size="sm">{section.badge}</Badge>
                </div>
                <h3 className="font-headline text-xl uppercase tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed flex-1">
                  {section.description}
                </p>
                <div className="mt-4 font-label text-xs uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('explore')}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Travel Essentials ────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader accentColor="#e9c400" className="mb-10">{t('essentials')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* eSIM */}
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📱</span>
              <h3 className="font-headline text-xl uppercase tracking-tight">{t('esimTitle')}</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
              {t('esimDescription')}
            </p>
            <a
              href="#"
              data-affiliate="esim"
              data-placement="travel-hub"
              className="inline-flex items-center gap-2 bg-primary/15 text-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
            >
              {t('esimCta')}
            </a>
          </GlassCard>

          {/* Hotels */}
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏨</span>
              <h3 className="font-headline text-xl uppercase tracking-tight">{t('hotelsTitle')}</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
              {t('hotelsDescription')}
            </p>
            <a
              href="#"
              data-affiliate="hotels"
              data-placement="travel-hub"
              className="inline-flex items-center gap-2 bg-primary/15 text-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
            >
              {t('hotelsCta')}
            </a>
          </GlassCard>
        </div>
      </section>

      {/* ── Country Overview ────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">{t('hostCountries')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {countries.map((country) => (
            <GlassCard key={country.name} className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{country.flag}</span>
                <div>
                  <h3 className="font-headline text-lg uppercase tracking-tight">{country.name}</h3>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {t('cityCount', { count: country.cities })} &middot; {country.currency}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <Badge variant="outline" size="sm">{country.visa}</Badge>
              </div>
              <ul className="space-y-2">
                {country.highlights.map((h) => (
                  <li key={h} className="text-on-surface-variant text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5 text-xs">&#9679;</span>
                    {h}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </section>

      <FaqSection items={TRAVEL_FAQS} heading="Travel Planning — FAQ" />

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 md:p-12 text-center">
          <h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-4">
            {t('ctaHeading')}
          </h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto mb-8">
            {t('ctaDescription')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/travel/budget-calculator"
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-block"
            >
              {t('budgetCalculator')}
            </Link>
            <Link
              href="/travel/visa"
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block"
            >
              {t('visaGuide')}
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
