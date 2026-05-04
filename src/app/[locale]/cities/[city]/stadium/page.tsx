import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { getCityBySlug } from '@/data/cities-data'
import { getAllVenues, getVenueById } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 3600

interface StadiumPageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: StadiumPageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const primaryVenue = getVenueById(city.venueIds[0])
  const venueName = primaryVenue?.name ?? 'stadium'

  const title = `${city.name} Stadium Guide — ${venueName} at World Cup 2026`
  const description = `Venue profile for ${venueName} in ${city.name}. Capacity, climate, matches, and getting there for World Cup 2026.`
  const url = `https://kickoracle.com/cities/${slug}/stadium`

  return {
    title,
    description,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

export default async function CityStadiumPage({ params }: StadiumPageProps) {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const venues = city.venueIds.map(getVenueById).filter(Boolean)
  const primary = venues[0]
  if (!primary) notFound()

  const allVenues = getAllVenues()
  const nearbyStadiums = allVenues.filter((v) => v.id !== primary.id && v.countryCode === primary.countryCode).slice(0, 3)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Cities', url: 'https://kickoracle.com/cities' },
    { name: city.name, url: `https://kickoracle.com/cities/${slug}` },
    { name: 'Stadium', url: `https://kickoracle.com/cities/${slug}/stadium` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Stadium Guide</Badge>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mt-4 mb-3">
            {primary.name}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {city.name} · {primary.country}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-[1100px] mx-auto px-6 -mt-4 mb-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl md:text-3xl text-primary">{primary.capacity.toLocaleString()}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Capacity</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-2xl md:text-3xl text-tertiary">{primary.yearOpened}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Opened</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-sm md:text-base text-on-surface">{primary.roofType}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Roof</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="font-mono text-sm md:text-base text-on-surface">{primary.surface.split('(')[0].trim()}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Surface</p>
          </GlassCard>
        </div>
      </section>

      {/* Climate + rounds */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Match Climate</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">June avg high</span>
                <span className="font-mono text-primary">{primary.climate.juneAvgHighC}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">July avg high</span>
                <span className="font-mono text-primary">{primary.climate.julyAvgHighC}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Humidity</span>
                <span className="font-mono text-on-surface">{primary.climate.humidityPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Rainy days/month</span>
                <span className="font-mono text-on-surface">{primary.climate.rainyDaysPerMonth}</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mt-4 pt-4 border-t border-white/[0.08]">
              {primary.climate.description}
            </p>
          </GlassCard>

          <GlassCard className="p-6 md:p-8">
            <h3 className="font-headline text-lg uppercase tracking-tight mb-4">Hosting</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {primary.hostingRounds.map((round) => (
                <Badge key={round} variant="outline" size="sm">{round}</Badge>
              ))}
            </div>
            {primary.notes && (
              <p className="text-on-surface-variant text-sm leading-relaxed">{primary.notes}</p>
            )}
          </GlassCard>
        </div>
      </section>

      {/* Getting there */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-6">Getting to the Stadium</SectionHeader>
        <GlassCard className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Nearest Airport</p>
              <p className="text-on-surface font-mono">{city.transport.airportCode}</p>
              <p className="text-on-surface-variant text-sm">{city.transport.airport}</p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Public Transit</p>
              <p className="text-on-surface-variant text-sm">{city.transport.publicTransit}</p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Walkability</p>
              <p className="text-on-surface-variant text-sm">{city.transport.walkability}</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Nearby venues */}
      {nearbyStadiums.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 mb-16">
          <SectionHeader className="mb-6">Other Venues in {primary.country}</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nearbyStadiums.map((v) => (
              <Link key={v.id} href={`/stadiums/${v.id}`} className="group">
                <GlassCard className="p-5" hover>
                  <h4 className="font-headline text-base uppercase tracking-tight group-hover:text-primary transition-colors">{v.name}</h4>
                  <p className="text-xs text-on-surface-variant mt-1">{v.metro}, {v.state}</p>
                  <p className="font-mono text-sm text-primary mt-2">{v.capacity.toLocaleString()} capacity</p>
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
          <Link href={`/cities/${city.slug}/costs`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Costs</Link>
          <Link href={`/cities/${city.slug}/food`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Food</Link>
          <Link href={`/cities/${city.slug}/transport`} className="border border-white/20 px-5 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">Transport</Link>
        </div>
      </section>
    </>
  )
}
