import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import AffiliateSlot from '@/components/monetization/AffiliateSlot'
import { getOriginCountry } from '@/data/travel-data'
import { getCityBySlug } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

interface TravelFromCountryPageProps {
  params: Promise<{ country: string }>
}

export async function generateMetadata({ params }: TravelFromCountryPageProps): Promise<Metadata> {
  const { country: slug } = await params
  const origin = getOriginCountry(slug)
  if (!origin) return {}

  const title = `World Cup 2026 Trip from ${origin.name} — Budget, Visa, Flights`
  const description = `Complete travel guide for ${origin.name} fans: flight costs, visa rules, budget estimates, and city recommendations for the 2026 World Cup.`
  const url = `https://kickoracle.com/travel/from/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

export default async function TravelFromCountryPage({ params }: TravelFromCountryPageProps) {
  const { country: slug } = await params
  const origin = getOriginCountry(slug)
  if (!origin) notFound()

  const cheapestNearestCity = origin.nearestCities
    .map((s) => getCityBySlug(s))
    .filter(Boolean)
    .sort((a, b) => (a!.accommodation.avgNightlyUsd - b!.accommodation.avgNightlyUsd))[0]

  const estimatedTotal = {
    budget: origin.flightCostBudget + 7 * 80 + 7 * 35,
    mid: origin.flightCostMidRange + 7 * 180 + 7 * 60,
    luxury: origin.flightCostLuxury + 7 * 450 + 7 * 150,
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Travel', url: 'https://kickoracle.com/travel' },
    { name: `From ${origin.name}`, url: `https://kickoracle.com/travel/from/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">From {origin.region}</Badge>
          <p className="text-5xl md:text-6xl mt-4 mb-2">{origin.flag}</p>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mb-4">
            Trip from <span className="gradient-text">{origin.name}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Budget, flights, visa, and city picks for World Cup 2026 travel from {origin.name}.
          </p>
        </div>
      </section>

      {/* 7-night estimate */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-4 mb-16 relative z-20">
        <SectionHeader className="mb-6">7-Night Trip Estimate</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6 text-center">
            <Badge variant="primary" size="sm">Budget</Badge>
            <p className="font-mono text-3xl md:text-4xl text-primary mt-3">${estimatedTotal.budget.toLocaleString()}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Flight + hostel + food</p>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <Badge variant="tertiary" size="sm">Mid-Range</Badge>
            <p className="font-mono text-3xl md:text-4xl text-tertiary mt-3">${estimatedTotal.mid.toLocaleString()}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Flight + hotel + food</p>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <Badge variant="secondary" size="sm">Luxury</Badge>
            <p className="font-mono text-3xl md:text-4xl text-secondary mt-3">${estimatedTotal.luxury.toLocaleString()}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Flight + premium hotel + fine dining</p>
          </GlassCard>
        </div>
        <p className="text-xs text-on-surface-variant mt-3 text-center">
          Estimates exclude match tickets. Use the{' '}
          <Link href="/travel/budget-calculator" className="text-primary hover:underline">
            budget calculator
          </Link>{' '}
          for a precise figure.
        </p>
      </section>

      {/* Affiliate slots: flights + insurance */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AffiliateSlot id="flights" placement="travel-from" context={origin.slug} />
          <AffiliateSlot id="insurance" placement="travel-from" context={origin.slug} />
        </div>
      </section>

      {/* Cheapest base + recommended */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-6">Best Base Cities</SectionHeader>
        {cheapestNearestCity && (
          <GlassCard className="p-6 md:p-8 mb-6">
            <Badge variant="primary" size="sm">Cheapest Base</Badge>
            <h3 className="font-headline text-2xl uppercase tracking-tight mt-3 mb-2">{cheapestNearestCity.name}</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
              Average ${cheapestNearestCity.accommodation.avgNightlyUsd}/night with {cheapestNearestCity.transport.publicTransit.toLowerCase()}.
            </p>
            <Link href={`/cities/${cheapestNearestCity.slug}`} className="inline-block bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-transform">
              View {cheapestNearestCity.name} guide →
            </Link>
          </GlassCard>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {origin.nearestCities.map((citySlug) => {
            const city = getCityBySlug(citySlug)
            if (!city) return null
            return (
              <Link key={city.slug} href={`/cities/${city.slug}`} className="group">
                <GlassCard className="p-4" hover>
                  <h4 className="font-headline text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{city.name}</h4>
                  <p className="text-xs text-on-surface-variant mt-1">${city.accommodation.avgNightlyUsd}/night avg</p>
                </GlassCard>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 text-center">
          <h2 className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-4">Plan the Rest of Your Trip</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/cities/from/${origin.slug}`} className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-transform">
              Cities from {origin.name}
            </Link>
            <Link href="/travel/visa" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Visa Guide
            </Link>
            <Link href="/travel/budget-calculator" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Budget Calculator
            </Link>
            <Link href="/travel/tickets" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Match Tickets
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
