import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAllCities, getCityBySlug, type HostCity } from '@/data/cities-data'
import { getAllVenues, getTeamBySlug } from '@/lib/data-service'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { buildOGMeta, jsonLdGraph } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import type { Venue } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

export const revalidate = 3600

/* ---------- Static params ---------- */

export function generateStaticParams() {
  return getAllCities().map((city) => ({ city: city.slug }))
}

/* ---------- Metadata ---------- */

interface CityPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} — World Cup 2026 Host City Guide`
  const description = `Fan guide to ${city.name} for the 2026 World Cup. ${city.description.slice(0, 120)}...`
  const alternates = buildAlternates(locale, `/cities/${city.slug}`)

  return {
    title,
    description,
    keywords: `${city.name} World Cup 2026, ${city.name} stadium, ${city.name} hotels, ${city.name} travel`,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

/* ---------- Helpers ---------- */

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

const PRICE_KEYS: Record<HostCity['food']['priceLevel'], 'priceBudget' | 'priceModerate' | 'priceExpensive'> = {
  budget: 'priceBudget',
  moderate: 'priceModerate',
  expensive: 'priceExpensive',
}

function safetyVariant(
  level: HostCity['safety']['level']
): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  const map: Record<string, 'primary' | 'tertiary' | 'secondary' | 'outline'> = {
    'very safe': 'primary',
    safe: 'tertiary',
    moderate: 'secondary',
    caution: 'outline',
  }
  return map[level] ?? 'outline'
}

function priceSymbol(level: HostCity['food']['priceLevel']): string {
  const map: Record<string, string> = { budget: '$', moderate: '$$', expensive: '$$$' }
  return map[level] ?? '$$'
}

function celsiusToFahrenheit(c: number): number {
  return Math.round(c * 1.8 + 32)
}

/* ---------- Sub-components ---------- */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className="text-on-surface font-label text-sm text-right max-w-[60%]">{value}</span>
    </div>
  )
}

interface VenueCardProps {
  venue: Venue
  labels: {
    venueBadge: string
    capacity: string
    opened: string
    surface: string
    roof: string
    hostingRounds: string
    altitudeWarning: React.ReactNode
  }
}

function VenueCard({ venue, labels }: VenueCardProps) {
  return (
    <GlassCard className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-headline text-2xl uppercase tracking-tight">{venue.name}</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            {venue.city}, {venue.state}
          </p>
        </div>
        <Badge variant="primary" size="md">{labels.venueBadge}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-2xl text-primary">{venue.capacity.toLocaleString()}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">{labels.capacity}</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-2xl text-tertiary">{venue.yearOpened}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">{labels.opened}</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-lg text-on-surface">{venue.surface}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">{labels.surface}</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-lg text-on-surface">{venue.roofType}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">{labels.roof}</p>
        </div>
      </div>

      {venue.hostingRounds.length > 0 && (
        <div>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-2">
            {labels.hostingRounds}
          </p>
          <div className="flex flex-wrap gap-2">
            {venue.hostingRounds.map((round) => (
              <span
                key={round}
                className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-label"
              >
                {round}
              </span>
            ))}
          </div>
        </div>
      )}

      {venue.altitudeMeters > 500 && (
        <div className="mt-4 p-3 rounded-xl bg-secondary/10 border border-secondary/20">
          <p className="text-secondary text-sm font-label">
            {labels.altitudeWarning}
          </p>
        </div>
      )}
    </GlassCard>
  )
}

interface QuickFactsProps {
  city: HostCity
  labels: {
    quickFacts: string
    country: string
    population: string
    currency: string
    language: string
    timezone: string
    safety: string
    safetyLevel: string
    priceLevel: string
    esim: string
    esimAvailable: string
    esimLimited: string
    findHotels: string
    getEsim: string
  }
}

function QuickFactsSidebar({ city, labels }: QuickFactsProps) {
  return (
    <GlassCard className="p-6 sticky top-24">
      <h3 className="font-headline text-lg uppercase tracking-tight mb-4">{labels.quickFacts}</h3>

      <InfoRow label={labels.country} value={
        <span className="inline-flex items-center gap-1.5">
          {COUNTRY_FLAG[city.countryCode]} {city.country}
        </span>
      } />
      <InfoRow label={labels.population} value={city.population} />
      <InfoRow label={labels.currency} value={city.currency} />
      <InfoRow label={labels.language} value={city.language} />
      <InfoRow label={labels.timezone} value={
        <span className="font-mono text-xs">{city.timezone} (UTC{city.utcOffset >= 0 ? '+' : ''}{city.utcOffset})</span>
      } />
      <InfoRow label={labels.safety} value={<Badge variant={safetyVariant(city.safety.level)}>{labels.safetyLevel}</Badge>} />
      <InfoRow label={labels.priceLevel} value={
        <span className="font-mono text-tertiary">{priceSymbol(city.food.priceLevel)}</span>
      } />
      <InfoRow label={labels.esim} value={city.esimAvailable ? labels.esimAvailable : labels.esimLimited} />

      <div className="mt-6 space-y-3">
        <a
          href="#"
          data-affiliate="hotel-booking"
          data-city={city.slug}
          className="block w-full text-center bg-primary text-on-primary py-2.5 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
        >
          {labels.findHotels}
        </a>
        {city.esimAvailable && (
          <a
            href="#"
            data-affiliate="esim"
            data-city={city.slug}
            className="block w-full text-center border border-primary/30 text-primary py-2.5 rounded-xl font-label font-semibold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors"
          >
            {labels.getEsim}
          </a>
        )}
      </div>
    </GlassCard>
  )
}

/* ---------- Page ---------- */

export default async function CityPage({ params }: CityPageProps) {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const t = await getTranslations('cityDetailPage')
  const venues = getAllVenues()
  const cityVenues = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)

  const flag = COUNTRY_FLAG[city.countryCode] ?? ''
  const safetyLabel = t(SAFETY_KEYS[city.safety.level])
  const priceLabel = t(PRICE_KEYS[city.food.priceLevel])

  const sidebarLabels = {
    quickFacts: t('quickFacts'),
    country: t('country'),
    population: t('population'),
    currency: t('currency'),
    language: t('language'),
    timezone: t('timezone'),
    safety: t('safety'),
    safetyLevel: safetyLabel,
    priceLevel: t('priceLevel'),
    esim: t('esim'),
    esimAvailable: t('esimAvailable'),
    esimLimited: t('esimLimited'),
    findHotels: t('findHotels'),
    getEsim: t('getEsim'),
  }

  // Cross-section linking data
  const cityFixtureNames = new Set([
    city.name,
    city.metro,
    ...cityVenues.map((v) => v.city),
    ...cityVenues.map((v) => v.metro),
  ])
  const cityFixtures = MATCH_FIXTURES.filter((f) => cityFixtureNames.has(f.city))
  const teamSlugsAtCity = Array.from(
    new Set(cityFixtures.flatMap((f) => [f.homeTeamSlug, f.awayTeamSlug]))
  )
  const fixtureCityLabel = cityVenues.length === 1 ? cityVenues[0].city : city.name
  const teamsAtCity = teamSlugsAtCity
    .map((s) => getTeamBySlug(s))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
  const otherCities = getAllCities()
    .filter((c) => c.slug !== city.slug)
    .slice(0, 6)

  const cityPath = `/cities/${city.slug}`
  const cityUrl = `https://kickoracle.com${cityPath}`
  const touristDestinationLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: `${city.name} — World Cup 2026 Host City`,
    url: cityUrl,
    description: city.description,
    containedInPlace: {
      '@type': 'Country',
      name: city.country,
      identifier: city.countryCode,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.state,
      addressCountry: city.countryCode,
    },
    touristType: 'Football fans, World Cup 2026 attendees',
    includesAttraction: cityVenues.map((v) => ({
      '@type': 'TouristAttraction',
      additionalType: 'https://schema.org/StadiumOrArena',
      name: v.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.name,
        addressCountry: city.countryCode,
      },
    })),
  }

  const graph = jsonLdGraph([touristDestinationLd])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Host Cities', href: '/cities' },
          { name: city.name, href: cityPath },
        ]}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">{t('heroBadge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {city.name}
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            {flag} {city.state}, {city.country}
          </p>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mt-3">
            {city.description}
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left column */}
          <div className="space-y-12">
            {/* Highlights */}
            <div>
              <SectionHeader className="mb-6">{t('highlights')}</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {city.highlights.map((h) => (
                  <span
                    key={h}
                    className="px-4 py-2 rounded-full glass-panel border border-white/[0.08] text-sm font-label text-on-surface"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Venue(s) */}
            {cityVenues.length > 0 && (
              <div>
                <SectionHeader className="mb-6">
                  {cityVenues.length === 1 ? t('stadium') : t('stadiums')}
                </SectionHeader>
                <div className="space-y-6">
                  {cityVenues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      labels={{
                        venueBadge: t('venueBadge'),
                        capacity: t('capacity'),
                        opened: t('opened'),
                        surface: t('surface'),
                        roof: t('roof'),
                        hostingRounds: t('hostingRounds'),
                        altitudeWarning: (
                          <>
                            <span className="font-bold">{t('altitudeWarningPrefix')}</span>{' '}
                            {t('altitudeWarning', { meters: venue.altitudeMeters }).replace(/^[^:]*:\s*/, '')}
                          </>
                        ),
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transport */}
            <div>
              <SectionHeader className="mb-6">{t('gettingAround')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">{t('airport')}</h4>
                    <p className="text-on-surface font-body">
                      {city.transport.airport}{' '}
                      <span className="font-mono text-on-surface-variant text-sm">
                        ({city.transport.airportCode})
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">{t('publicTransit')}</h4>
                    <p className="text-on-surface font-body">{city.transport.publicTransit}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">{t('walkability')}</h4>
                    <p className="text-on-surface font-body">{city.transport.walkability}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">{t('rideshare')}</h4>
                    <p className="text-on-surface font-body">
                      {city.transport.rideshare ? t('rideshareAvailable') : t('rideshareLimited')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Accommodation */}
            <div>
              <SectionHeader className="mb-6">{t('whereToStay')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="glass-panel rounded-xl border border-white/[0.08] p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">{t('budget')}</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.budgetRange}</p>
                  </div>
                  <div className="glass-panel rounded-xl border border-primary/20 p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-primary mb-2">{t('midRange')}</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.midRange}</p>
                  </div>
                  <div className="glass-panel rounded-xl border border-tertiary/20 p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-tertiary mb-2">{t('luxury')}</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.luxury}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">
                    {t.rich('averageNightly', {
                      amount: city.accommodation.avgNightlyUsd,
                      amt: (chunks) => <span className="font-mono text-on-surface">{chunks}</span>,
                    })}
                  </span>
                  {city.accommodation.fanZoneNearby && (
                    <Badge variant="primary">{t('fanZoneNearby')}</Badge>
                  )}
                </div>

                <a
                  href="#"
                  data-affiliate="hotel-search"
                  data-city={city.slug}
                  className="mt-6 block w-full text-center bg-primary text-on-primary py-3 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
                >
                  {t('searchHotelsIn', { city: city.name })}
                </a>
              </GlassCard>
            </div>

            {/* Food & Dining */}
            <div>
              <SectionHeader className="mb-6">{t('foodDining')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                      {t('localSpecialties')}
                    </h4>
                    <p className="text-on-surface font-body text-lg">{city.food.localSpecialty}</p>
                  </div>
                  <span className="font-mono text-3xl text-tertiary">{priceSymbol(city.food.priceLevel)}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-6 text-sm text-on-surface-variant">
                  <span>
                    {t.rich('priceLevelLabel', {
                      level: priceLabel,
                      val: (chunks) => <span className="text-on-surface">{chunks}</span>,
                    })}
                  </span>
                  <span>
                    {t.rich('tipLabel', {
                      amount: city.food.tipPercentage,
                      val: (chunks) => <span className="font-mono text-on-surface">{chunks}</span>,
                    })}
                  </span>
                </div>
              </GlassCard>
            </div>

            {/* Weather */}
            <div>
              <SectionHeader className="mb-6">{t('summerWeather')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="font-mono text-3xl text-secondary">
                      {city.weather.summerHighC}&deg;
                    </p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      {t('high', { f: celsiusToFahrenheit(city.weather.summerHighC) })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-3xl text-primary">
                      {city.weather.summerLowC}&deg;
                    </p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      {t('low', { f: celsiusToFahrenheit(city.weather.summerLowC) })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-on-surface">{city.weather.humidity}</p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      {t('humidity')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-on-surface">{city.weather.rainChance}</p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      {t('rain')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Safety */}
            <div>
              <SectionHeader className="mb-6">{t('safety')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={safetyVariant(city.safety.level)} size="md">
                    {safetyLabel}
                  </Badge>
                </div>
                <p className="text-on-surface-variant leading-relaxed">{city.safety.notes}</p>
              </GlassCard>
            </div>

            {/* Visa note */}
            <div>
              <SectionHeader className="mb-6">{t('visaEntry')}</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <p className="text-on-surface leading-relaxed">{city.visaNote}</p>
              </GlassCard>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            <QuickFactsSidebar city={city} labels={sidebarLabels} />
          </aside>
        </div>

        {/* Mobile quick facts (shown below content on small screens) */}
        <div className="lg:hidden mt-12">
          <SectionHeader className="mb-6">{t('quickFacts')}</SectionHeader>
          <QuickFactsSidebar city={city} labels={sidebarLabels} />
        </div>
      </section>

      {/* Teams playing at this city — cross-link to team pages */}
      {teamsAtCity.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <SectionHeader className="mb-6">Teams playing in {fixtureCityLabel}</SectionHeader>
          <div className="flex flex-wrap gap-3">
            {teamsAtCity.map((t) => (
              <Link
                key={t.slug}
                href={`/teams/${t.slug}`}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/30 px-5 py-2.5 rounded-full font-body text-sm transition-all hover:text-primary inline-flex items-center gap-2"
              >
                <span className="text-base" aria-hidden="true">{t.flag}</span>
                <span>{t.name} squad &amp; predictions</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Other host cities — cross-link to /cities/[city] siblings */}
      {otherCities.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <SectionHeader className="mb-6">Other World Cup 2026 host cities</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                href={`/cities/${c.slug}`}
                className="block p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-tertiary/40 transition-all group text-center"
              >
                <p className="font-headline text-sm font-bold tracking-tight group-hover:text-tertiary transition-colors">
                  {c.name}
                </p>
                <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                  {c.country}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom nav */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/cities"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('allHostCities')}
          </Link>
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
            {t('matchSchedule')}
          </Link>
        </div>
      </section>
    </>
  )
}
