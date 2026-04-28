import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllCities, getCityBySlug, type HostCity } from '@/data/cities-data'
import { getAllVenues } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd, jsonLdGraph } from '@/lib/og-utils'
import type { Venue } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

/* ---------- Static params ---------- */

export function generateStaticParams() {
  return getAllCities().map((city) => ({ city: city.slug }))
}

/* ---------- Metadata ---------- */

interface CityPageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} — World Cup 2026 Host City Guide`
  const description = `Fan guide to ${city.name} for the 2026 World Cup. ${city.description.slice(0, 120)}...`
  const url = `https://kickoracle.com/cities/${slug}`

  return {
    title,
    description,
    keywords: `${city.name} World Cup 2026, ${city.name} stadium, ${city.name} hotels, ${city.name} travel`,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

/* ---------- Helpers ---------- */

const COUNTRY_FLAG: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  MX: '\u{1F1F2}\u{1F1FD}',
  CA: '\u{1F1E8}\u{1F1E6}',
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

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-headline text-2xl uppercase tracking-tight">{venue.name}</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            {venue.city}, {venue.state}
          </p>
        </div>
        <Badge variant="primary" size="md">Venue</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-2xl text-primary">{venue.capacity.toLocaleString()}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Capacity</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-2xl text-tertiary">{venue.yearOpened}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Opened</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-lg text-on-surface">{venue.surface}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Surface</p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
          <p className="font-mono text-lg text-on-surface">{venue.roofType}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Roof</p>
        </div>
      </div>

      {venue.hostingRounds.length > 0 && (
        <div>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-2">
            Hosting Rounds
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
            <span className="font-bold">Altitude warning:</span> {venue.altitudeMeters}m above sea level.
            Players and fans may notice the thin air.
          </p>
        </div>
      )}
    </GlassCard>
  )
}

function QuickFactsSidebar({ city }: { city: HostCity }) {
  return (
    <GlassCard className="p-6 sticky top-24">
      <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Quick Facts</h3>

      <InfoRow label="Country" value={
        <span className="inline-flex items-center gap-1.5">
          {COUNTRY_FLAG[city.countryCode]} {city.country}
        </span>
      } />
      <InfoRow label="Population" value={city.population} />
      <InfoRow label="Currency" value={city.currency} />
      <InfoRow label="Language" value={city.language} />
      <InfoRow label="Timezone" value={
        <span className="font-mono text-xs">{city.timezone} (UTC{city.utcOffset >= 0 ? '+' : ''}{city.utcOffset})</span>
      } />
      <InfoRow label="Safety" value={<Badge variant={safetyVariant(city.safety.level)}>{city.safety.level}</Badge>} />
      <InfoRow label="Price Level" value={
        <span className="font-mono text-tertiary">{priceSymbol(city.food.priceLevel)}</span>
      } />
      <InfoRow label="eSIM" value={city.esimAvailable ? 'Available' : 'Limited'} />

      <div className="mt-6 space-y-3">
        <a
          href="#"
          data-affiliate="hotel-booking"
          data-city={city.slug}
          className="block w-full text-center bg-primary text-on-primary py-2.5 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
        >
          Find Hotels
        </a>
        {city.esimAvailable && (
          <a
            href="#"
            data-affiliate="esim"
            data-city={city.slug}
            className="block w-full text-center border border-primary/30 text-primary py-2.5 rounded-xl font-label font-semibold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors"
          >
            Get eSIM
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

  const venues = getAllVenues()
  const cityVenues = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)

  const flag = COUNTRY_FLAG[city.countryCode] ?? ''

  const cityUrl = `https://kickoracle.com/cities/${slug}`
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Host Cities', url: 'https://kickoracle.com/cities' },
    { name: city.name, url: cityUrl },
  ])

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
      '@type': 'StadiumOrArena',
      name: v.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.name,
        addressCountry: city.countryCode,
      },
    })),
  }

  const graph = jsonLdGraph([breadcrumbs, touristDestinationLd])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Host City</Badge>
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
              <SectionHeader className="mb-6">Highlights</SectionHeader>
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
                  {cityVenues.length === 1 ? 'Stadium' : 'Stadiums'}
                </SectionHeader>
                <div className="space-y-6">
                  {cityVenues.map((venue) => (
                    <VenueCard key={venue.id} venue={venue} />
                  ))}
                </div>
              </div>
            )}

            {/* Transport */}
            <div>
              <SectionHeader className="mb-6">Getting Around</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Airport</h4>
                    <p className="text-on-surface font-body">
                      {city.transport.airport}{' '}
                      <span className="font-mono text-on-surface-variant text-sm">
                        ({city.transport.airportCode})
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Public Transit</h4>
                    <p className="text-on-surface font-body">{city.transport.publicTransit}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Walkability</h4>
                    <p className="text-on-surface font-body">{city.transport.walkability}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Rideshare</h4>
                    <p className="text-on-surface font-body">
                      {city.transport.rideshare
                        ? 'Uber & Lyft available'
                        : 'Limited rideshare availability'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Accommodation */}
            <div>
              <SectionHeader className="mb-6">Where to Stay</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="glass-panel rounded-xl border border-white/[0.08] p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Budget</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.budgetRange}</p>
                  </div>
                  <div className="glass-panel rounded-xl border border-primary/20 p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-primary mb-2">Mid-Range</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.midRange}</p>
                  </div>
                  <div className="glass-panel rounded-xl border border-tertiary/20 p-5">
                    <p className="text-xs font-label uppercase tracking-widest text-tertiary mb-2">Luxury</p>
                    <p className="font-mono text-lg text-on-surface">{city.accommodation.luxury}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">
                    Average nightly rate:{' '}
                    <span className="font-mono text-on-surface">${city.accommodation.avgNightlyUsd}</span>
                  </span>
                  {city.accommodation.fanZoneNearby && (
                    <Badge variant="primary">Fan Zone Nearby</Badge>
                  )}
                </div>

                <a
                  href="#"
                  data-affiliate="hotel-search"
                  data-city={city.slug}
                  className="mt-6 block w-full text-center bg-primary text-on-primary py-3 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
                >
                  Search Hotels in {city.name}
                </a>
              </GlassCard>
            </div>

            {/* Food & Dining */}
            <div>
              <SectionHeader className="mb-6">Food &amp; Dining</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                      Local Specialties
                    </h4>
                    <p className="text-on-surface font-body text-lg">{city.food.localSpecialty}</p>
                  </div>
                  <span className="font-mono text-3xl text-tertiary">{priceSymbol(city.food.priceLevel)}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-6 text-sm text-on-surface-variant">
                  <span>
                    Price level: <span className="text-on-surface capitalize">{city.food.priceLevel}</span>
                  </span>
                  <span>
                    Tip: <span className="font-mono text-on-surface">{city.food.tipPercentage}%</span>
                  </span>
                </div>
              </GlassCard>
            </div>

            {/* Weather */}
            <div>
              <SectionHeader className="mb-6">Summer Weather</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="font-mono text-3xl text-secondary">
                      {city.weather.summerHighC}&deg;
                    </p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      High ({celsiusToFahrenheit(city.weather.summerHighC)}&deg;F)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-3xl text-primary">
                      {city.weather.summerLowC}&deg;
                    </p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      Low ({celsiusToFahrenheit(city.weather.summerLowC)}&deg;F)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-on-surface">{city.weather.humidity}</p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      Humidity
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-on-surface">{city.weather.rainChance}</p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                      Rain
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Safety */}
            <div>
              <SectionHeader className="mb-6">Safety</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={safetyVariant(city.safety.level)} size="md">
                    {city.safety.level}
                  </Badge>
                </div>
                <p className="text-on-surface-variant leading-relaxed">{city.safety.notes}</p>
              </GlassCard>
            </div>

            {/* Visa note */}
            <div>
              <SectionHeader className="mb-6">Visa &amp; Entry</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <p className="text-on-surface leading-relaxed">{city.visaNote}</p>
              </GlassCard>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            <QuickFactsSidebar city={city} />
          </aside>
        </div>

        {/* Mobile quick facts (shown below content on small screens) */}
        <div className="lg:hidden mt-12">
          <SectionHeader className="mb-6">Quick Facts</SectionHeader>
          <QuickFactsSidebar city={city} />
        </div>
      </section>

      {/* Bottom nav */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/cities"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            All Host Cities
          </Link>
          <Link
            href="/travel"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Travel Guide
          </Link>
          <Link
            href="/schedule"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Match Schedule
          </Link>
        </div>
      </section>
    </>
  )
}
