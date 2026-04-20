import type { Metadata } from 'next'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'

export const revalidate = 86400

const ogData = buildOGMeta({
  title: 'World Cup 2026 Travel Guide — Visa, Budget & Planning',
  description:
    'Plan your trip to the 2026 World Cup across the USA, Mexico, and Canada. Visa requirements, budget calculator, city guides, eSIM deals, and hotel recommendations.',
  url: 'https://kickoracle.com/travel',
})

export const metadata: Metadata = {
  title: 'World Cup 2026 Travel Guide — Visa, Budget & Planning',
  description:
    'Plan your trip to the 2026 World Cup. Visa requirements, budget calculator, city guides, and travel tips for USA, Canada, and Mexico.',
  keywords:
    'World Cup 2026 travel, World Cup 2026 visa, World Cup 2026 budget, World Cup 2026 trip planner, World Cup 2026 hotels',
  alternates: { canonical: 'https://kickoracle.com/travel' },
  ...ogData,
}

const QUICK_FACTS = [
  { label: 'Host Countries', value: '3', detail: 'USA, Mexico, Canada' },
  { label: 'Host Cities', value: '16', detail: 'Across North America' },
  { label: 'Stadiums', value: '16', detail: 'World-class venues' },
  { label: 'Tournament Dates', value: 'Jun–Jul', detail: '11 June – 19 July 2026' },
  { label: 'Total Matches', value: '104', detail: '48-team format' },
  { label: 'Currencies', value: '3', detail: 'USD, MXN, CAD' },
]

const TRAVEL_SECTIONS = [
  {
    href: '/travel/visa',
    icon: '🛂',
    title: 'Visa Information',
    description: 'ESTA, eTA, and visa requirements for all three host countries. Find out what documents you need.',
    badge: 'Essential',
    badgeVariant: 'secondary' as const,
  },
  {
    href: '/travel/budget-calculator',
    icon: '💰',
    title: 'Budget Calculator',
    description: 'Estimate your total trip cost. Interactive tool covering accommodation, food, transport, and match tickets.',
    badge: 'Interactive',
    badgeVariant: 'primary' as const,
  },
  {
    href: '/cities',
    icon: '🏙️',
    title: 'Host Cities',
    description: 'Detailed guides for all 16 host cities. Local tips, transport, accommodation, food, and safety info.',
    badge: '16 Cities',
    badgeVariant: 'tertiary' as const,
  },
]

export default function TravelPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Travel Guide', url: 'https://kickoracle.com/travel' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[160px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Fan Guide</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            Travel<br />
            <span className="gradient-text">Guide</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto">
            Everything you need to plan your World Cup 2026 trip across the USA, Mexico, and Canada.
            Visa info, budget tools, and city-by-city recommendations.
          </p>
        </div>
      </section>

      {/* ── Quick Facts ────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {QUICK_FACTS.map((fact) => (
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
        <SectionHeader className="mb-10">Travel Resources</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRAVEL_SECTIONS.map((section) => (
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
                  Explore &rarr;
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Travel Essentials ────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader accentColor="#e9c400" className="mb-10">Travel Essentials</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* eSIM */}
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📱</span>
              <h3 className="font-headline text-xl uppercase tracking-tight">Stay Connected</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
              An eSIM is the easiest way to get data across all three countries. Avoid roaming charges
              and stay connected for live scores, maps, and ride-hailing apps.
            </p>
            <a
              href="#"
              data-affiliate="esim"
              data-placement="travel-hub"
              className="inline-flex items-center gap-2 bg-primary/15 text-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
            >
              Compare eSIM Deals
            </a>
          </GlassCard>

          {/* Hotels */}
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏨</span>
              <h3 className="font-headline text-xl uppercase tracking-tight">Book Accommodation</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
              Hotels near stadiums fill up fast during the World Cup. Book early for the best rates,
              especially in New York, Los Angeles, and Mexico City.
            </p>
            <a
              href="#"
              data-affiliate="hotels"
              data-placement="travel-hub"
              className="inline-flex items-center gap-2 bg-primary/15 text-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
            >
              Search Hotels
            </a>
          </GlassCard>
        </div>
      </section>

      {/* ── Country Overview ────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-10">Host Countries</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              flag: '🇺🇸',
              name: 'United States',
              cities: 11,
              currency: 'USD',
              visa: 'ESTA / B1-B2 Visa',
              highlights: ['Final venue (MetLife)', 'Most host cities', 'Major airline hubs'],
            },
            {
              flag: '🇲🇽',
              name: 'Mexico',
              cities: 3,
              currency: 'MXN',
              visa: 'FMM Tourist Permit',
              highlights: ['Azteca (3rd World Cup)', 'Affordable prices', 'Rich football culture'],
            },
            {
              flag: '🇨🇦',
              name: 'Canada',
              cities: 2,
              currency: 'CAD',
              visa: 'eTA / Visitor Visa',
              highlights: ['Safest host cities', 'Mild summer climate', 'Multicultural atmosphere'],
            },
          ].map((country) => (
            <GlassCard key={country.name} className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{country.flag}</span>
                <div>
                  <h3 className="font-headline text-lg uppercase tracking-tight">{country.name}</h3>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {country.cities} {country.cities === 1 ? 'City' : 'Cities'} &middot; {country.currency}
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

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 md:p-12 text-center">
          <h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-4">
            Start Planning Your Trip
          </h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto mb-8">
            Use our budget calculator to estimate costs, check visa requirements, and explore
            all 16 host cities with detailed local guides.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/travel/budget-calculator"
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-block"
            >
              Budget Calculator
            </Link>
            <Link
              href="/travel/visa"
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-white/5 transition-colors inline-block"
            >
              Visa Guide
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
