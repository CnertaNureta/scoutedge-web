import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import AffiliateSlot from '@/components/monetization/AffiliateSlot'
import { getAllCities, getCityBySlug } from '@/data/cities-data'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

export const revalidate = 3600

interface CostsPageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: CostsPageProps): Promise<Metadata> {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} Trip Cost Guide — Hotels, Food & Budget`
  const description = `7-night World Cup 2026 budget for ${city.name}. Hotels from ${city.accommodation.budgetRange}, food, transport, and full cost tiers.`
  const alternates = buildAlternates(locale, `/cities/${slug}/costs`)

  return {
    title,
    description,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

function parseMinUsd(range: string): number {
  const match = range.match(/\$(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function fmt(n: number, locale: string): string {
  return n.toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default async function CityCostsPage({ params }: CostsPageProps) {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const hotelBudget = parseMinUsd(city.accommodation.budgetRange)
  const hotelMid = parseMinUsd(city.accommodation.midRange)
  const hotelLux = parseMinUsd(city.accommodation.luxury)

  const foodPerDay = { budget: 40, moderate: 70, expensive: 120 }[city.food.priceLevel]
  const transportPerDay = city.food.priceLevel === 'expensive' ? 35 : 20
  const airportTransfer = city.food.priceLevel === 'expensive' ? 80 : 40

  const NIGHTS = 7
  const breakdown = [
    { label: `🏨 Hotel (${NIGHTS} nights)`, budget: hotelBudget * NIGHTS, mid: hotelMid * NIGHTS, lux: hotelLux * NIGHTS },
    { label: `🍽️ Food (${NIGHTS} days)`, budget: foodPerDay * NIGHTS, mid: foodPerDay * 1.8 * NIGHTS, lux: foodPerDay * 3.5 * NIGHTS },
    { label: `🚌 Transport (${NIGHTS} days)`, budget: transportPerDay * NIGHTS, mid: transportPerDay * 1.5 * NIGHTS, lux: transportPerDay * 2.5 * NIGHTS },
    { label: '✈️ Airport transfer (round trip)', budget: airportTransfer, mid: airportTransfer * 1.5, lux: airportTransfer * 3 },
  ]

  const totals = breakdown.reduce(
    (acc, row) => ({ budget: acc.budget + row.budget, mid: acc.mid + row.mid, lux: acc.lux + row.lux }),
    { budget: 0, mid: 0, lux: 0 },
  )

  const cheaperCities = getAllCities()
    .filter((c) => c.slug !== city.slug && c.accommodation.avgNightlyUsd < city.accommodation.avgNightlyUsd)
    .sort((a, b) => a.accommodation.avgNightlyUsd - b.accommodation.avgNightlyUsd)
    .slice(0, 3)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Cities', url: canonicalForLocale(locale, '/cities') },
    { name: city.name, url: canonicalForLocale(locale, `/cities/${slug}`) },
    { name: 'Trip Costs', url: canonicalForLocale(locale, `/cities/${slug}/costs`) },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Trip Cost Guide</Badge>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mt-4 mb-3">
            {city.name} <span className="gradient-text">Costs</span>
          </h1>
          <p className="text-on-surface-variant text-lg">7-night World Cup 2026 budget breakdown</p>
        </div>
      </section>

      {/* Tier quick cards */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-4 mb-12 relative z-20">
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-5 text-center">
            <Badge variant="primary" size="sm">Budget</Badge>
            <p className="font-mono text-3xl md:text-4xl text-primary mt-3">${hotelBudget}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">hotel/night</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <Badge variant="tertiary" size="sm">Mid-Range</Badge>
            <p className="font-mono text-3xl md:text-4xl text-tertiary mt-3">${hotelMid}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">hotel/night</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <Badge variant="secondary" size="sm">Luxury</Badge>
            <p className="font-mono text-3xl md:text-4xl text-secondary mt-3">${hotelLux}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">hotel/night</p>
          </GlassCard>
        </div>
      </section>

      {/* 7-night cost table */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-6">7-Night On-the-Ground Estimate</SectionHeader>
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-label uppercase tracking-widest text-xs text-on-surface-variant">Item</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-primary">Budget</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-tertiary">Mid</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-secondary">Luxury</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-on-surface">{row.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">{fmt(row.budget, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-tertiary">{fmt(row.mid, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-secondary">{fmt(row.lux, locale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/20 bg-white/[0.03]">
                  <td className="px-4 py-3 font-bold text-on-surface">Total (excl. flights & tickets)</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-primary">{fmt(totals.budget, locale)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-tertiary">{fmt(totals.mid, locale)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-secondary">{fmt(totals.lux, locale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      </section>

      {/* Affiliate: hotels */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <AffiliateSlot id="hotel" placement="city-costs" context={city.slug} />
      </section>

      {/* Cheaper alternatives */}
      {cheaperCities.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 mb-16">
          <SectionHeader className="mb-6">Cheaper Alternatives</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cheaperCities.map((c) => (
              <Link key={c.slug} href={`/cities/${c.slug}/costs`} className="group">
                <GlassCard className="p-5" hover>
                  <h3 className="font-headline text-base uppercase tracking-tight group-hover:text-primary transition-colors">{c.name}</h3>
                  <p className="font-mono text-lg text-primary mt-2">${c.accommodation.avgNightlyUsd}/night avg</p>
                  <p className="text-xs text-on-surface-variant mt-1">{c.accommodation.midRange}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sub-nav */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/cities/${city.slug}`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">City Overview</Link>
          <Link href={`/cities/${city.slug}/food`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Food</Link>
          <Link href={`/cities/${city.slug}/stadium`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Stadium</Link>
          <Link href={`/cities/${city.slug}/transport`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Transport</Link>
        </div>
      </section>
    </>
  )
}
