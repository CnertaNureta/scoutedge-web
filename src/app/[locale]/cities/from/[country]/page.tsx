import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import AffiliateSlot from '@/components/monetization/AffiliateSlot'
import { getAllOriginCountries, getOriginCountry } from '@/data/travel-data'
import { getAllCities, getCityBySlug } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

interface FromCountryPageProps {
  params: Promise<{ country: string }>
}

export async function generateMetadata({ params }: FromCountryPageProps): Promise<Metadata> {
  const { country: slug } = await params
  const origin = getOriginCountry(slug)
  if (!origin) return {}

  const title = `${origin.name} to World Cup 2026 — Best Host Cities & Flight Tips`
  const description = `Fans traveling from ${origin.name} to the 2026 World Cup: recommended host cities, flight costs from ${origin.flightCostBudget === 0 ? 'domestic' : `$${origin.flightCostBudget}`}, and visa requirements.`
  const url = `https://kickoracle.com/cities/from/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

export default async function CitiesFromCountryPage({ params }: FromCountryPageProps) {
  const { country: slug } = await params
  const origin = getOriginCountry(slug)
  if (!origin) notFound()

  const recommendedCities = origin.nearestCities
    .map((citySlug) => getCityBySlug(citySlug))
    .filter(Boolean)

  const allCities = getAllCities()

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Host Cities', url: 'https://kickoracle.com/cities' },
    { name: `From ${origin.name}`, url: `https://kickoracle.com/cities/from/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Travel Guide</Badge>
          <p className="text-5xl md:text-6xl mt-4 mb-2">{origin.flag}</p>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mb-4">
            From <span className="gradient-text">{origin.name}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Best host cities, flight tips, and visa requirements for {origin.name} fans heading to the 2026 World Cup.
          </p>
        </div>
      </section>

      {/* Flight + Visa stats */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-4 mb-16 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl text-primary">${origin.flightCostBudget || '—'}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Budget Flight</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl text-tertiary">${origin.flightCostMidRange}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Mid-Range Flight</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl text-on-surface">{origin.flightHours}h</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Flight Time</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl text-on-surface">{origin.typicalStops === 0 ? 'Non-stop' : `${origin.typicalStops} stop`}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Typical Route</p>
          </GlassCard>
        </div>
      </section>

      {/* Visa + travel tip */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Visa Requirements</h3>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li className="flex items-center justify-between">
                <span>🇺🇸 USA</span>
                <Badge variant={origin.needsUsVisa ? 'secondary' : 'primary'} size="sm">
                  {origin.needsUsVisa ? 'Visa Required' : 'ESTA OK'}
                </Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>🇨🇦 Canada</span>
                <Badge variant={origin.needsCanadaVisa ? 'secondary' : 'primary'} size="sm">
                  {origin.needsCanadaVisa ? 'Visa Required' : 'eTA OK'}
                </Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>🇲🇽 Mexico</span>
                <Badge variant={origin.needsMexicoVisa ? 'secondary' : 'primary'} size="sm">
                  {origin.needsMexicoVisa ? 'Visa Required' : 'FMM OK'}
                </Badge>
              </li>
              {origin.fifaPassEligible && (
                <li className="mt-4 pt-4 border-t border-white/[0.08]">
                  <Badge variant="tertiary" size="sm">FIFA PASS Eligible</Badge>
                  <p className="text-xs mt-2">Expedited visa processing available via FIFA PASS.</p>
                </li>
              )}
            </ul>
          </GlassCard>

          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-3">Travel Tip</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{origin.travelTip}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-4 mb-2">Origin Airports</p>
            <div className="flex flex-wrap gap-2">
              {origin.airports.map((ap) => (
                <span key={ap} className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">{ap}</span>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Affiliate slot — flights */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <AffiliateSlot id="flights" placement="cities-from" context={origin.slug} />
      </section>

      {/* Recommended cities */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Recommended Host Cities</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedCities.map((city) => city && (
            <Link key={city.slug} href={`/cities/${city.slug}`} className="group">
              <GlassCard className="p-6 h-full" hover>
                <h3 className="font-headline text-lg uppercase tracking-tight mb-1 group-hover:text-primary transition-colors">
                  {city.name}
                </h3>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
                  {city.state}, {city.country}
                </p>
                <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3">
                  {city.description}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" size="sm">${city.accommodation.avgNightlyUsd}/night</Badge>
                  {city.accommodation.fanZoneNearby && <Badge variant="primary" size="sm">Fan Zone</Badge>}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* All cities fallback */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <GlassCard className="p-6 md:p-8">
          <h3 className="font-headline text-lg uppercase tracking-tight mb-3">All 16 Host Cities</h3>
          <div className="flex flex-wrap gap-2">
            {allCities.map((city) => (
              <Link
                key={city.slug}
                href={`/cities/${city.slug}`}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 hover:border-primary hover:text-primary transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>
    </>
  )
}
