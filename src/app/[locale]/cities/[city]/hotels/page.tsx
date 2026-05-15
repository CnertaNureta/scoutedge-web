import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getCityBySlug, type HostCity } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

/* ---------- Metadata ---------- */

interface HotelPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} Hotels — World Cup 2026 Accommodation Guide`
  const description = `Best hotels near the ${city.name} World Cup 2026 venue. Budget from ${city.accommodation.budgetRange}, mid-range ${city.accommodation.midRange}, and luxury ${city.accommodation.luxury}. Average $${city.accommodation.avgNightlyUsd}/night.`
  const alternates = buildAlternates(locale, `/cities/${slug}/hotels`)

  return {
    title,
    description,
    keywords: `${city.name} hotels World Cup 2026, ${city.name} accommodation, where to stay ${city.name}, ${city.name} World Cup hotels, ${city.name} budget hotels`,
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

function priceSymbol(level: HostCity['food']['priceLevel']): string {
  const map: Record<string, string> = { budget: '$', moderate: '$$', expensive: '$$$' }
  return map[level] ?? '$$'
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

function tierIcon(tier: 'budget' | 'mid' | 'luxury'): string {
  const map = { budget: '$', mid: '$$', luxury: '$$$' }
  return map[tier]
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

function AccommodationTierCard({
  tier,
  label,
  range,
  description,
  borderColor,
  labelColor,
}: {
  tier: 'budget' | 'mid' | 'luxury'
  label: string
  range: string
  description: string
  borderColor: string
  labelColor: string
}) {
  return (
    <GlassCard className="p-6 md:p-8" hover>
      <div className="flex items-start justify-between mb-4">
        <span className={`text-xs font-label uppercase tracking-widest ${labelColor}`}>{label}</span>
        <span className={`font-mono text-2xl ${labelColor}`}>{tierIcon(tier)}</span>
      </div>
      <p className="font-mono text-lg text-on-surface mb-3">{range}</p>
      <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
      <div className={`mt-4 h-px w-full ${borderColor}`} />
    </GlassCard>
  )
}

function BookingTip({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-4 border-b border-white/[0.06] last:border-0">
      <h4 className="font-label text-sm font-bold text-on-surface uppercase tracking-wide mb-1">{title}</h4>
      <p className="text-on-surface-variant text-sm leading-relaxed">{text}</p>
    </div>
  )
}

/* ---------- Page ---------- */

export default async function CityHotelsPage({ params }: HotelPageProps) {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const flag = COUNTRY_FLAG[city.countryCode] ?? ''
  const isMexico = city.countryCode === 'MX'
  const isCanada = city.countryCode === 'CA'

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Host Cities', url: canonicalForLocale(locale, '/cities') },
    { name: city.name, url: canonicalForLocale(locale, `/cities/${slug}`) },
    { name: 'Hotels', url: canonicalForLocale(locale, `/cities/${slug}/hotels`) },
  ])

  const tippingNote = isMexico
    ? `Tipping ${city.food.tipPercentage}% is customary at restaurants. Porters and housekeeping appreciate 20-50 MXN.`
    : isCanada
      ? `Tipping ${city.food.tipPercentage}% is standard. Most places accept CAD cards but carry some cash for tips.`
      : `Tipping ${city.food.tipPercentage}% is standard for services. Hotel housekeeping typically receives $2-5/night.`

  const budgetDescription = isMexico
    ? 'Hostels, guesthouses, and budget hotels in central neighborhoods. Great value with authentic local atmosphere.'
    : isCanada
      ? 'Hostels, budget chains, and outer-neighborhood hotels. Book early as prices surge during tournament weeks.'
      : 'Hostels, budget chains, and suburban stays. Best for fans prioritizing match tickets over accommodation.'

  const midDescription = isMexico
    ? 'Well-located hotels in safe, walkable neighborhoods. Solid amenities and often include breakfast.'
    : isCanada
      ? 'Downtown hotels with good transit access. Expect modern amenities, concierge service, and stadium shuttle info.'
      : 'Downtown and stadium-area hotels with good transit access. The sweet spot for most fans traveling to matches.'

  const luxuryDescription = isMexico
    ? 'World-class resorts and boutique hotels in premier neighborhoods. Full-service amenities and concierge support.'
    : isCanada
      ? 'Premium downtown and waterfront properties. Full-service luxury with matchday concierge packages likely available.'
      : 'Top-tier properties with premium matchday packages, concierge, and the best locations near venues and fan zones.'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Accommodation Guide</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {city.name} <span className="text-primary">Hotels</span>
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            {flag} {city.state}, {city.country}
          </p>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mt-3">
            Where to stay for World Cup 2026 matches in {city.name}. Budget, mid-range, and luxury picks with booking tips.
          </p>
        </div>
      </section>

      {/* Average nightly rate hero stat */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-8 mb-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-3xl text-primary">${city.accommodation.avgNightlyUsd}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
              Avg / Night
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-3xl text-tertiary">{priceSymbol(city.food.priceLevel)}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
              City Price Level
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-2xl text-on-surface">{city.currency.split(' ')[0]}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
              Currency
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
            <p className="font-mono text-lg text-on-surface">
              {city.accommodation.fanZoneNearby ? 'Yes' : 'No'}
            </p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
              Fan Zone Nearby
            </p>
            {city.accommodation.fanZoneNearby && (
              <Badge variant="primary" size="sm">Confirmed</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left column */}
          <div className="space-y-12">
            {/* Accommodation Tiers */}
            <div>
              <SectionHeader className="mb-6">Accommodation Tiers</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AccommodationTierCard
                  tier="budget"
                  label="Budget"
                  range={city.accommodation.budgetRange}
                  description={budgetDescription}
                  borderColor="bg-gradient-to-r from-white/10 to-transparent"
                  labelColor="text-on-surface-variant"
                />
                <AccommodationTierCard
                  tier="mid"
                  label="Mid-Range"
                  range={city.accommodation.midRange}
                  description={midDescription}
                  borderColor="bg-gradient-to-r from-primary/30 to-transparent"
                  labelColor="text-primary"
                />
                <AccommodationTierCard
                  tier="luxury"
                  label="Luxury"
                  range={city.accommodation.luxury}
                  description={luxuryDescription}
                  borderColor="bg-gradient-to-r from-tertiary/30 to-transparent"
                  labelColor="text-tertiary"
                />
              </div>
            </div>

            {/* Booking Tips */}
            <div>
              <SectionHeader className="mb-6">Booking Tips</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <BookingTip
                  title="Book Early, Save Big"
                  text={`Hotel prices in ${city.name} are expected to surge 2-4x during World Cup match weeks. Book at least 6 months in advance for the best rates. Flexible cancellation policies are worth the small premium.`}
                />
                <BookingTip
                  title="Surge Pricing Warning"
                  text={`Expect peak pricing around match days, especially for knockout rounds. Weekday matches may offer slightly lower rates. Consider arriving a day early and staying a day after to avoid the worst of the price spikes.`}
                />
                <BookingTip
                  title="Neighborhood Strategy"
                  text={`Staying near the stadium is convenient but expensive. Properties along ${city.transport.publicTransit.split(';')[0] ?? 'public transit lines'} routes offer a good balance of access and value. A 20-30 minute transit ride can save you 30-50% on accommodation.`}
                />
                <BookingTip
                  title="Alternative Stays"
                  text="Short-term rentals (Airbnb, VRBO) can be cheaper for groups. Check local regulations as some cities enforce stricter short-term rental rules during major events. Hostels fill up fast for budget travelers."
                />
                <BookingTip
                  title="Refund Protection"
                  text="Always book with free cancellation when possible. Match schedules can shift, and you want the flexibility to adjust dates without losing your deposit. Travel insurance covering accommodation is strongly recommended."
                />
              </GlassCard>
            </div>

            {/* What to Know */}
            <div>
              <SectionHeader className="mb-6">What to Know</SectionHeader>
              <GlassCard className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Currency & Payment</h4>
                    <p className="text-on-surface font-body text-sm leading-relaxed">
                      Local currency is <span className="font-mono">{city.currency}</span>. Most hotels accept major credit cards.
                      {isMexico && ' ATMs are widely available. Some smaller properties may prefer cash. Watch exchange rates at airport kiosks.'}
                      {isCanada && ' US dollars are sometimes accepted but at poor exchange rates. Use a no-foreign-transaction-fee card.'}
                      {!isMexico && !isCanada && ' Contactless payments widely accepted. No need to carry large amounts of cash.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Tipping Customs</h4>
                    <p className="text-on-surface font-body text-sm leading-relaxed">{tippingNote}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Safety</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={safetyVariant(city.safety.level)} size="sm">{city.safety.level}</Badge>
                    </div>
                    <p className="text-on-surface font-body text-sm leading-relaxed">{city.safety.notes}</p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Getting to Your Hotel</h4>
                    <p className="text-on-surface font-body text-sm leading-relaxed">
                      Fly into <span className="font-mono text-on-surface-variant text-xs">{city.transport.airportCode}</span> ({city.transport.airport}).
                      {city.transport.rideshare
                        ? ' Uber and Lyft are available for airport transfers.'
                        : ' Use registered taxis or pre-booked transfers from the airport.'}
                      {' '}{city.transport.publicTransit.split(';')[0] ?? 'Public transit'} connects to most hotel areas.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Check-in Language</h4>
                    <p className="text-on-surface font-body text-sm leading-relaxed">
                      Primary language: <span className="font-mono">{city.language}</span>.
                      {isMexico && ' Most tourist-area hotels have English-speaking staff, but learning basic Spanish phrases is appreciated.'}
                      {isCanada && ' Service available in English and French in most properties.'}
                      {!isMexico && !isCanada && ' International hotel chains and most properties will have multilingual staff during the tournament.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-label text-xs uppercase tracking-widest text-primary mb-2">Connectivity</h4>
                    <p className="text-on-surface font-body text-sm leading-relaxed">
                      {city.esimAvailable
                        ? 'eSIM data plans are available for international travelers. Most hotels offer free Wi-Fi. Consider getting a local eSIM for reliable data during match days.'
                        : 'eSIM availability is limited. Check with your carrier about international roaming plans. Most hotels offer free Wi-Fi.'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* CTA Section */}
            <div>
              <GlassCard className="p-8 md:p-10 text-center">
                <h3 className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-3">
                  Ready to Book?
                </h3>
                <p className="text-on-surface-variant text-sm max-w-lg mx-auto mb-6">
                  Compare prices across hundreds of hotels in {city.name}. Prices shown are estimated averages
                  and will vary based on dates and availability.
                </p>
                <a
                  href="#"
                  data-affiliate="hotel-search"
                  data-city={slug}
                  className="inline-block bg-primary text-on-primary px-10 py-3.5 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
                >
                  Search Hotels in {city.name}
                </a>
                <p className="text-on-surface-variant text-xs mt-4">
                  Average nightly rate: <span className="font-mono text-on-surface">${city.accommodation.avgNightlyUsd}</span> &middot;
                  Prices expected to surge during match weeks
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            <GlassCard className="p-6 sticky top-24">
              <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Quick Reference</h3>

              <InfoRow label="Avg Nightly Rate" value={
                <span className="font-mono text-primary">${city.accommodation.avgNightlyUsd}</span>
              } />
              <InfoRow label="Budget Range" value={
                <span className="font-mono text-xs">{city.accommodation.budgetRange}</span>
              } />
              <InfoRow label="Mid-Range" value={
                <span className="font-mono text-xs">{city.accommodation.midRange}</span>
              } />
              <InfoRow label="Luxury" value={
                <span className="font-mono text-xs">{city.accommodation.luxury}</span>
              } />
              <InfoRow label="Fan Zone Nearby" value={
                city.accommodation.fanZoneNearby
                  ? <Badge variant="primary" size="sm">Yes</Badge>
                  : <span className="text-on-surface-variant">No</span>
              } />
              <InfoRow label="Currency" value={city.currency} />
              <InfoRow label="Safety" value={
                <Badge variant={safetyVariant(city.safety.level)} size="sm">{city.safety.level}</Badge>
              } />
              <InfoRow label="Price Level" value={
                <span className="font-mono text-tertiary">{priceSymbol(city.food.priceLevel)}</span>
              } />
              <InfoRow label="Airport" value={
                <span className="font-mono text-xs">{city.transport.airportCode}</span>
              } />

              <div className="mt-6 space-y-3">
                <a
                  href="#"
                  data-affiliate="hotel-search"
                  data-city={slug}
                  className="block w-full text-center bg-primary text-on-primary py-2.5 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
                >
                  Search Hotels
                </a>
                <Link
                  href={`/cities/${slug}`}
                  className="block w-full text-center border border-primary/30 text-primary py-2.5 rounded-xl font-label font-semibold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors"
                >
                  City Guide
                </Link>
              </div>
            </GlassCard>
          </aside>
        </div>

        {/* Mobile sidebar (shown below content on small screens) */}
        <div className="lg:hidden mt-12">
          <SectionHeader className="mb-6">Quick Reference</SectionHeader>
          <GlassCard className="p-6">
            <InfoRow label="Avg Nightly Rate" value={
              <span className="font-mono text-primary">${city.accommodation.avgNightlyUsd}</span>
            } />
            <InfoRow label="Budget Range" value={
              <span className="font-mono text-xs">{city.accommodation.budgetRange}</span>
            } />
            <InfoRow label="Mid-Range" value={
              <span className="font-mono text-xs">{city.accommodation.midRange}</span>
            } />
            <InfoRow label="Luxury" value={
              <span className="font-mono text-xs">{city.accommodation.luxury}</span>
            } />
            <InfoRow label="Fan Zone Nearby" value={
              city.accommodation.fanZoneNearby
                ? <Badge variant="primary" size="sm">Yes</Badge>
                : <span className="text-on-surface-variant">No</span>
            } />
            <InfoRow label="Currency" value={city.currency} />
            <InfoRow label="Safety" value={
              <Badge variant={safetyVariant(city.safety.level)} size="sm">{city.safety.level}</Badge>
            } />

            <div className="mt-6">
              <a
                href="#"
                data-affiliate="hotel-search"
                data-city={slug}
                className="block w-full text-center bg-primary text-on-primary py-2.5 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
              >
                Search Hotels
              </a>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/cities/${slug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {city.name} Guide
          </Link>
          <Link
            href={`/cities/${slug}/schedule`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Match Schedule
          </Link>
          <Link
            href={`/cities/${slug}/tickets`}
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Tickets
          </Link>
          <Link
            href={`/cities/${slug}/transport`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Transport
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
