import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { getAllVenues, getVenueById } from '@/lib/data-service'
import { getAllCities } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

interface Props {
  params: Promise<{ locale: string; stadium: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const venues = getAllVenues()
  return venues.map((v) => ({ stadium: v.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, stadium } = await params
  const venue = getVenueById(stadium)
  if (!venue) {
    return { title: 'Venue Not Found' }
  }

  const ogData = buildOGMeta({
    title: `${venue.name} — World Cup 2026 Venue Guide`,
    description: `Complete guide to ${venue.name} in ${venue.city}, ${venue.country}. Capacity: ${venue.capacity.toLocaleString()}, climate data, hosting rounds, and travel tips for the 2026 FIFA World Cup.`,
    url: canonicalForLocale(locale, `/stadiums/${stadium}`),
    type: 'article',
    section: 'Stadiums',
  })

  return {
    title: `${venue.name} — World Cup 2026 Venue Guide`,
    description: `Complete guide to ${venue.name} in ${venue.city}, ${venue.country}. Capacity: ${venue.capacity.toLocaleString()}, climate, and match schedule.`,
    alternates: buildAlternates(locale, `/stadiums/${stadium}`),
    ...ogData,
  }
}

function cToF(c: number): number {
  return Math.round(c * 9 / 5 + 32)
}

function findCitySlugForVenue(venueId: string): string | undefined {
  const cities = getAllCities()
  const city = cities.find((c) => c.venueIds.includes(venueId))
  return city?.slug
}

function getRoundVariant(round: string): 'primary' | 'secondary' | 'tertiary' | 'outline' {
  if (round.includes('Final') && !round.includes('Quarter') && !round.includes('Semi')) return 'tertiary'
  if (round.includes('Semi') || round.includes('Quarter')) return 'secondary'
  if (round.includes('Round of')) return 'primary'
  return 'outline'
}

export default async function StadiumPage({ params }: Props) {
  const { locale, stadium } = await params
  const venue = getVenueById(stadium)
  if (!venue) notFound()

  const citySlug = findCitySlugForVenue(venue.id)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Stadiums', url: canonicalForLocale(locale, '/stadiums') },
    { name: venue.name, url: canonicalForLocale(locale, `/stadiums/${stadium}`) },
  ])

  const countryFlag =
    venue.countryCode === 'US' ? '🇺🇸' :
    venue.countryCode === 'MX' ? '🇲🇽' :
    venue.countryCode === 'CA' ? '🇨🇦' : '🏟️'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">Venue</Badge>
          <h1 className="font-headline text-4xl md:text-7xl lg:text-8xl tracking-wide uppercase mt-4 mb-3">
            {venue.name}
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto">
            {countryFlag} {venue.city}, {venue.state} &middot; {venue.country}
          </p>
        </div>
      </section>

      {/* ── Key Stats ────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Capacity', value: venue.capacity.toLocaleString(), icon: '🏟️' },
            { label: 'Surface', value: venue.surface, icon: '🌱' },
            { label: 'Roof', value: venue.roofType, icon: '🏗️' },
            { label: 'Opened', value: String(venue.yearOpened), icon: '📅' },
            { label: 'Altitude', value: `${venue.altitudeMeters.toLocaleString()}m`, icon: '⛰️' },
          ].map((stat) => (
            <GlassCard key={stat.label} className="p-5 text-center">
              <span className="text-2xl block mb-2">{stat.icon}</span>
              <p className="font-mono text-xl md:text-2xl text-on-surface font-bold">{stat.value}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                {stat.label}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Hosting Rounds ────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Hosting Rounds</SectionHeader>
        <GlassCard className="p-6 md:p-8">
          <p className="text-on-surface-variant text-sm mb-5">
            Matches scheduled at {venue.name} during the 2026 FIFA World Cup:
          </p>
          <div className="flex flex-wrap gap-3">
            {venue.hostingRounds.map((round) => (
              <Badge key={round} variant={getRoundVariant(round)} size="md">
                {round}
              </Badge>
            ))}
          </div>
          {venue.hostingRounds.includes('Final') && (
            <div className="mt-6 p-4 rounded-xl bg-tertiary/10 border border-tertiary/20">
              <p className="text-tertiary font-label text-sm font-semibold uppercase tracking-wide">
                World Cup Final Venue
              </p>
              <p className="text-on-surface-variant text-sm mt-1">
                {venue.name} has been selected to host the 2026 FIFA World Cup Final.
              </p>
            </div>
          )}
        </GlassCard>
      </section>

      {/* ── Climate ────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader accentColor="#e9c400" className="mb-8">Climate &amp; Weather</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-xl uppercase tracking-tight mb-5">June</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">High</p>
                <p className="font-mono text-3xl text-primary font-bold">
                  {venue.climate.juneAvgHighC}&deg;C
                </p>
                <p className="font-mono text-sm text-on-surface-variant">{cToF(venue.climate.juneAvgHighC)}&deg;F</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Low</p>
                <p className="font-mono text-3xl text-on-surface font-bold">
                  {venue.climate.juneAvgLowC}&deg;C
                </p>
                <p className="font-mono text-sm text-on-surface-variant">{cToF(venue.climate.juneAvgLowC)}&deg;F</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-xl uppercase tracking-tight mb-5">July</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">High</p>
                <p className="font-mono text-3xl text-primary font-bold">
                  {venue.climate.julyAvgHighC}&deg;C
                </p>
                <p className="font-mono text-sm text-on-surface-variant">{cToF(venue.climate.julyAvgHighC)}&deg;F</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Low</p>
                <p className="font-mono text-3xl text-on-surface font-bold">
                  {venue.climate.julyAvgLowC}&deg;C
                </p>
                <p className="font-mono text-sm text-on-surface-variant">{cToF(venue.climate.julyAvgLowC)}&deg;F</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <GlassCard className="p-5 text-center">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Humidity</p>
            <p className="font-mono text-2xl text-on-surface font-bold">{venue.climate.humidityPercent}%</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Rainy Days / Month</p>
            <p className="font-mono text-2xl text-on-surface font-bold">{venue.climate.rainyDaysPerMonth}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Conditions</p>
            <p className="text-on-surface text-sm leading-relaxed">{venue.climate.description}</p>
          </GlassCard>
        </div>
      </section>

      {/* ── Location ────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Location</SectionHeader>
        <GlassCard className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Address</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">City</dt>
                  <dd className="text-on-surface">{venue.city}, {venue.state}</dd>
                </div>
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Metro Area</dt>
                  <dd className="text-on-surface">{venue.metro}</dd>
                </div>
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Country</dt>
                  <dd className="text-on-surface">{countryFlag} {venue.country}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Coordinates &amp; Time</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Coordinates</dt>
                  <dd className="font-mono text-on-surface text-sm">
                    {venue.coordinates.lat.toFixed(4)}&deg;N, {Math.abs(venue.coordinates.lng).toFixed(4)}&deg;W
                  </dd>
                </div>
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Timezone</dt>
                  <dd className="text-on-surface">{venue.timezone} (UTC{venue.utcOffset >= 0 ? '+' : ''}{venue.utcOffset})</dd>
                </div>
                <div>
                  <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Altitude</dt>
                  <dd className="text-on-surface">
                    {venue.altitudeMeters.toLocaleString()}m ({Math.round(venue.altitudeMeters * 3.281).toLocaleString()} ft)
                    {venue.altitudeMeters > 1500 && (
                      <span className="text-secondary text-xs ml-2">High altitude — acclimatization recommended</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ── Notes ────────────────────────────────────────────── */}
      {venue.notes && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <SectionHeader className="mb-8">Stadium Notes</SectionHeader>
          <GlassCard className="p-6 md:p-8">
            <p className="text-on-surface-variant leading-relaxed">{venue.notes}</p>
          </GlassCard>
        </section>
      )}

      {/* ── Navigation ────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap gap-4 justify-center">
          {citySlug && (
            <Link
              href={`/cities/${citySlug}`}
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-block"
            >
              {venue.metro} City Guide
            </Link>
          )}
          <Link
            href="/stadiums"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block"
          >
            All Stadiums
          </Link>
          <Link
            href="/travel"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block"
          >
            Travel Guide
          </Link>
        </div>
      </section>
    </>
  )
}
