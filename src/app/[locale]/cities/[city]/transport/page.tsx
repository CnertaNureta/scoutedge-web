import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getCityBySlug } from '@/data/cities-data'
import { getAllVenues } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import type { Venue } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

/* ---------- Metadata ---------- */

interface TransportPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: TransportPageProps): Promise<Metadata> {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} Transport Guide — Getting Around During World Cup 2026`
  const description = `Complete transport guide for ${city.name} during the 2026 FIFA World Cup. Airport transfers from ${city.transport.airportCode}, public transit, rideshare tips, walkability, and how to reach the stadium.`
  const alternates = buildAlternates(locale, `/cities/${slug}/transport`)

  return {
    title,
    description,
    keywords: `${city.name} transport, ${city.name} airport, ${city.transport.airportCode}, ${city.name} public transit, World Cup 2026 transport`,
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

/** Tips keyed by country code for context-aware advice */
const TRANSIT_APP_TIPS: Record<string, { apps: string[]; note: string }> = {
  US: {
    apps: ['Google Maps', 'Apple Maps', 'Transit App', 'Citymapper'],
    note: 'Download offline maps before match day. Cell service can be slow near packed stadiums.',
  },
  MX: {
    apps: ['Google Maps', 'Moovit', 'Uber'],
    note: 'Google Maps transit directions work well in Mexican cities. Consider a local eSIM for data.',
  },
  CA: {
    apps: ['Google Maps', 'Transit App', 'Citymapper'],
    note: 'Transit App has excellent real-time data for Canadian cities.',
  },
}

function getStadiumTips(venue: Venue, citySlug: string): string[] {
  const tips: string[] = []

  if (venue.roofType === 'Retractable' || venue.roofType === 'Fixed') {
    tips.push(`${venue.name} has a ${venue.roofType.toLowerCase()} roof — weather is less of a concern.`)
  } else {
    tips.push(`${venue.name} is an open-air venue — check the forecast and dress accordingly.`)
  }

  tips.push(`Capacity is ${venue.capacity.toLocaleString()} — expect significant crowds on approach routes.`)

  if (venue.altitudeMeters > 1500) {
    tips.push(`At ${venue.altitudeMeters.toLocaleString()}m altitude, stay hydrated and give yourself extra time walking.`)
  }

  if (venue.city !== venue.metro) {
    tips.push(`The stadium is in ${venue.city}, not central ${venue.metro}. Plan for extra travel time.`)
  }

  tips.push('Arrive at least 90 minutes before kickoff for security screening and finding your seat.')
  tips.push('FIFA World Cup events typically restrict parking — public transit or organized shuttles are strongly recommended.')

  return tips
}

/* ---------- Sub-components ---------- */

function InfoTile({
  label,
  value,
  accent = 'primary',
}: {
  label: string
  value: React.ReactNode
  accent?: 'primary' | 'secondary' | 'tertiary'
}) {
  const colorMap = {
    primary: 'text-primary border-primary/20',
    secondary: 'text-secondary border-secondary/20',
    tertiary: 'text-tertiary border-tertiary/20',
  }
  return (
    <div className={`glass-panel rounded-xl border ${colorMap[accent]} p-5`}>
      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </p>
      <div className="text-on-surface font-body">{value}</div>
    </div>
  )
}

function TipCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <span className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
        {icon}
      </span>
      <div>
        <h4 className="font-label text-sm font-semibold text-on-surface mb-1">{title}</h4>
        <p className="text-on-surface-variant text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

export default async function CityTransportPage({ params }: TransportPageProps) {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const venues = getAllVenues()
  const cityVenues = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)

  const flag = COUNTRY_FLAG[city.countryCode] ?? ''
  const transitApps = TRANSIT_APP_TIPS[city.countryCode] ?? TRANSIT_APP_TIPS.US

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Host Cities', url: canonicalForLocale(locale, '/cities') },
    { name: city.name, url: canonicalForLocale(locale, `/cities/${slug}`) },
    { name: 'Transport', url: canonicalForLocale(locale, `/cities/${slug}/transport`) },
  ])

  const airportCodes = city.transport.airportCode.split('/')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">Transport Guide</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            Getting Around
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            {flag} {city.name} &middot; {city.state}, {city.country}
          </p>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mt-3">
            Everything you need to navigate {city.name} during the 2026 FIFA World Cup &mdash;
            airports, public transit, rideshare, and stadium access.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="space-y-12">

          {/* Transport overview tiles */}
          <div>
            <SectionHeader className="mb-6">Transport at a Glance</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoTile label="Airport" accent="primary" value={
                <div>
                  <p className="font-body">{city.transport.airport}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {airportCodes.map((code) => (
                      <span
                        key={code}
                        className="font-mono text-xs px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary"
                      >
                        {code.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              } />
              <InfoTile label="Public Transit" accent="tertiary" value={
                <p className="font-body text-sm">{city.transport.publicTransit}</p>
              } />
              <InfoTile label="Rideshare" accent="secondary" value={
                <p className="font-body text-sm">
                  {city.transport.rideshare
                    ? 'Uber & Lyft available'
                    : 'Limited availability'}
                </p>
              } />
              <InfoTile label="Walkability" accent="primary" value={
                <p className="font-body text-sm">{city.transport.walkability}</p>
              } />
            </div>
          </div>

          {/* Airport section */}
          <div>
            <SectionHeader className="mb-6">Airport &amp; Arrivals</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-headline text-2xl uppercase tracking-tight">
                    {city.transport.airport}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {airportCodes.map((code) => (
                      <Badge key={code} variant="primary" size="md">{code.trim()}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <TipCard icon="&#9992;" title="Airport to City Center">
                    {city.countryCode === 'MX'
                      ? `Use authorized airport taxis or rideshare (Uber) from ${city.transport.airportCode}. Avoid unmarked taxis.`
                      : `Rideshare (Uber/Lyft) and airport shuttles are the most convenient options from ${city.transport.airportCode}. Check for dedicated World Cup shuttle services.`}
                  </TipCard>
                  <TipCard icon="&#128652;" title="Public Transit from Airport">
                    {city.transport.publicTransit}. Check schedules in advance as services may run extended hours during match days.
                  </TipCard>
                </div>
                <div className="space-y-4">
                  <TipCard icon="&#128176;" title="Currency & Payment">
                    Local currency is {city.currency}. Contactless payments are widely accepted.
                    {city.countryCode === 'MX' && ' ATMs are available in airport arrivals — withdraw pesos on arrival.'}
                    {city.countryCode === 'CA' && ' USD is not commonly accepted — exchange to CAD.'}
                  </TipCard>
                  <TipCard icon="&#128246;" title="SIM Card / eSIM">
                    {city.esimAvailable
                      ? `eSIM is available and recommended. Purchase before arrival for immediate data access at ${city.transport.airportCode}. Major carriers offer tourist plans.`
                      : `eSIM support may be limited. Consider purchasing a local SIM card at the airport on arrival.`}
                  </TipCard>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Public Transit section */}
          <div>
            <SectionHeader className="mb-6">Public Transit</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <p className="text-on-surface text-lg leading-relaxed mb-6">
                {city.transport.publicTransit}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl border border-white/[0.08] p-5">
                  <p className="text-xs font-label uppercase tracking-widest text-primary mb-2">Match Day Service</p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Expect extended service hours on match days. Follow FIFA and local transit authority announcements for special routes and schedules.
                  </p>
                </div>
                <div className="glass-panel rounded-xl border border-white/[0.08] p-5">
                  <p className="text-xs font-label uppercase tracking-widest text-tertiary mb-2">Fares &amp; Passes</p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {city.countryCode === 'MX'
                      ? 'Transit fares are very affordable. Carry small change or a rechargeable transit card.'
                      : city.countryCode === 'CA'
                        ? 'Contactless payment (tap) is accepted on most transit systems. Day passes offer the best value.'
                        : 'Most systems accept contactless payment. Look for multi-day passes or event-specific transit deals.'}
                  </p>
                </div>
                <div className="glass-panel rounded-xl border border-white/[0.08] p-5">
                  <p className="text-xs font-label uppercase tracking-widest text-secondary mb-2">Crowd Tips</p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Transit will be crowded 2 hours before and 1 hour after matches. Travel early or wait 30&ndash;45 minutes post-match for calmer services.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Rideshare section */}
          <div>
            <SectionHeader className="mb-6">Rideshare &amp; Taxis</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={city.transport.rideshare ? 'primary' : 'outline'} size="md">
                  {city.transport.rideshare ? 'Uber & Lyft Available' : 'Limited Rideshare'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-3">
                    Availability
                  </h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {city.transport.rideshare
                      ? `Uber and Lyft operate throughout ${city.name}. Expect surge pricing before and after matches — consider scheduling rides in advance or using designated pickup/drop-off zones.`
                      : `Rideshare availability is limited in ${city.name}. Use official taxi services or public transit where possible.`}
                  </p>
                </div>
                <div>
                  <h4 className="font-label text-xs uppercase tracking-widest text-tertiary mb-3">
                    Match Day Tips
                  </h4>
                  <ul className="space-y-2 text-on-surface-variant text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-tertiary mt-0.5 shrink-0">&bull;</span>
                      Set your pickup location to a nearby street rather than the stadium entrance
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tertiary mt-0.5 shrink-0">&bull;</span>
                      Expect 20&ndash;40 minute wait times after the final whistle
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tertiary mt-0.5 shrink-0">&bull;</span>
                      Walk 10&ndash;15 minutes from the venue before requesting a ride
                    </li>
                    {city.countryCode === 'MX' && (
                      <li className="flex items-start gap-2">
                        <span className="text-tertiary mt-0.5 shrink-0">&bull;</span>
                        Only use authorized taxis or ride-hailing apps &mdash; avoid street hails at night
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Walkability section */}
          <div>
            <SectionHeader className="mb-6">Walkability</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-on-surface text-lg leading-relaxed mb-4">
                    {city.transport.walkability}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-on-surface-variant text-sm">
                      <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                      Wear comfortable walking shoes &mdash; match days involve significant walking to and from transit stops and venues.
                    </div>
                    <div className="flex items-start gap-2 text-on-surface-variant text-sm">
                      <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                      {city.weather.summerHighC >= 32
                        ? `Summer highs reach ${city.weather.summerHighC}\u00B0C (${Math.round(city.weather.summerHighC * 1.8 + 32)}\u00B0F) — carry water and seek shade when walking long distances.`
                        : `Summer weather is generally pleasant for walking with highs around ${city.weather.summerHighC}\u00B0C (${Math.round(city.weather.summerHighC * 1.8 + 32)}\u00B0F).`}
                    </div>
                    <div className="flex items-start gap-2 text-on-surface-variant text-sm">
                      <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                      Fan zones and public viewing areas are typically located in walkable downtown districts.
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Getting to the Stadium */}
          {cityVenues.length > 0 && (
            <div>
              <SectionHeader className="mb-6">
                Getting to the {cityVenues.length === 1 ? 'Stadium' : 'Stadiums'}
              </SectionHeader>

              <div className="space-y-6">
                {cityVenues.map((venue) => {
                  const tips = getStadiumTips(venue, slug)
                  return (
                    <GlassCard key={venue.id} className="p-6 md:p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="font-headline text-2xl uppercase tracking-tight">
                            {venue.name}
                          </h3>
                          <p className="text-on-surface-variant text-sm mt-1">
                            {venue.city}, {venue.state}
                          </p>
                        </div>
                        <Badge variant="tertiary" size="md">Venue</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
                          <p className="font-mono text-2xl text-primary">
                            {venue.capacity.toLocaleString()}
                          </p>
                          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                            Capacity
                          </p>
                        </div>
                        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
                          <p className="font-mono text-lg text-on-surface">{venue.roofType}</p>
                          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                            Roof
                          </p>
                        </div>
                        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
                          <p className="font-mono text-sm text-on-surface">
                            {venue.coordinates.lat.toFixed(4)}&deg;N
                          </p>
                          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                            Latitude
                          </p>
                        </div>
                        <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
                          <p className="font-mono text-sm text-on-surface">
                            {Math.abs(venue.coordinates.lng).toFixed(4)}&deg;W
                          </p>
                          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
                            Longitude
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">
                          Stadium Access Tips
                        </h4>
                        {tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-on-surface-variant text-sm">
                            <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                            {tip}
                          </div>
                        ))}
                      </div>

                      {venue.notes && (
                        <div className="mt-6 p-4 rounded-xl bg-tertiary/8 border border-tertiary/20">
                          <p className="text-tertiary text-sm font-label">
                            <span className="font-bold">Note:</span> {venue.notes}
                          </p>
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transport Tips */}
          <div>
            <SectionHeader className="mb-6">Essential Transport Tips</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-5">
                  <TipCard icon="&#128241;" title="Navigation Apps">
                    Download {transitApps.apps.join(', ')} before your trip. {transitApps.note}
                  </TipCard>
                  <TipCard icon="&#128246;" title="Stay Connected">
                    {city.esimAvailable
                      ? 'An eSIM is the easiest way to get data on arrival. Purchase before you fly and activate when you land.'
                      : 'Consider buying a local SIM at the airport. Free Wi-Fi is available at most hotels and fan zones.'}
                    {' '}Reliable data is essential for navigation and live updates during match days.
                  </TipCard>
                  <TipCard icon="&#9200;" title="Time Zone">
                    {city.name} is in the <span className="font-mono text-primary">{city.timezone}</span> zone
                    (UTC{city.utcOffset >= 0 ? '+' : ''}{city.utcOffset}).
                    Set your phone to update automatically to avoid missing kickoff.
                  </TipCard>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <TipCard icon="&#127915;" title="Match Day Planning">
                    Plan your stadium route a day in advance. Save the venue coordinates offline.
                    Allow at least 2 hours from your accommodation to your seat.
                  </TipCard>
                  <TipCard icon="&#128179;" title="Payment & Fares">
                    {city.countryCode === 'MX'
                      ? 'Carry cash (pesos) for smaller transit fares and taxis. Credit cards work for Uber.'
                      : 'Contactless payment is widely accepted on transit. Keep a small amount of local cash as backup.'}
                  </TipCard>
                  <TipCard icon="&#128682;" title="Accessibility">
                    All World Cup venues offer accessible transport options.
                    Contact FIFA&apos;s accessibility team in advance for stadium-specific assistance.
                    Most public transit systems have accessible routes &mdash; check before travelling.
                  </TipCard>
                </div>
              </div>
            </GlassCard>
          </div>

        </div>
      </section>

      {/* Navigation */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/cities/${slug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {city.name} Guide
          </Link>
          <Link
            href={`/cities/${slug}/hotels`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Hotels
          </Link>
          <Link
            href={`/cities/${slug}/schedule`}
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Match Schedule
          </Link>
          <Link
            href={`/cities/${slug}/tickets`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Tickets
          </Link>
          <Link
            href="/cities"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            All Host Cities
          </Link>
        </div>
      </section>
    </>
  )
}
