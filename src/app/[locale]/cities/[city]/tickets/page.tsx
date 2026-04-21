import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllCities, getCityBySlug } from '@/data/cities-data'
import { getAllVenues } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
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

interface TicketsPageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: TicketsPageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const title = `${city.name} Tickets — World Cup 2026 Pricing & How to Buy`
  const description = `Ticket categories, pricing estimates, and official purchase channels for World Cup 2026 matches in ${city.name}. Category 1–4 pricing, FIFA portal, and fan tips.`
  const url = `https://kickoracle.com/cities/${slug}/tickets`

  return {
    title,
    description,
    keywords: `${city.name} World Cup 2026 tickets, ${city.name} ticket prices, FIFA tickets ${city.name}, World Cup ticket categories`,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

/* ---------- Static ticket tier data ---------- */

interface TicketTier {
  category: number
  label: string
  description: string
  groupStage: string
  roundOf32: string
  roundOf16: string
  quarterFinal: string
  semiFinal: string
  final: string
  variant: 'primary' | 'tertiary' | 'secondary' | 'outline'
  accentBorder: string
  accentBg: string
  accentText: string
}

const TICKET_TIERS: TicketTier[] = [
  {
    category: 1,
    label: 'Premium Sideline',
    description: 'Best seats in the house. Center sideline, lower bowl with unobstructed views of the full pitch.',
    groupStage: '$300–$600',
    roundOf32: '$400–$750',
    roundOf16: '$500–$900',
    quarterFinal: '$600–$1,200',
    semiFinal: '$800–$1,500',
    final: '$1,000–$2,500',
    variant: 'primary',
    accentBorder: 'border-primary/30',
    accentBg: 'bg-primary/10',
    accentText: 'text-primary',
  },
  {
    category: 2,
    label: 'Upper Sideline',
    description: 'Upper-tier sideline seats. Elevated view of the action with good sight lines across the pitch.',
    groupStage: '$175–$350',
    roundOf32: '$225–$450',
    roundOf16: '$275–$525',
    quarterFinal: '$350–$700',
    semiFinal: '$500–$900',
    final: '$600–$1,500',
    variant: 'tertiary',
    accentBorder: 'border-tertiary/30',
    accentBg: 'bg-tertiary/10',
    accentText: 'text-tertiary',
  },
  {
    category: 3,
    label: 'Behind Goals',
    description: 'End sections behind each goal. Close to the action on set pieces and great atmosphere among vocal fans.',
    groupStage: '$100–$200',
    roundOf32: '$130–$260',
    roundOf16: '$160–$320',
    quarterFinal: '$200–$400',
    semiFinal: '$300–$550',
    final: '$400–$900',
    variant: 'secondary',
    accentBorder: 'border-secondary/30',
    accentBg: 'bg-secondary/10',
    accentText: 'text-secondary',
  },
  {
    category: 4,
    label: 'Limited View',
    description: 'Budget-friendly seats with partial or restricted sight lines. Ideal for fans who want to experience the atmosphere live.',
    groupStage: '$50–$100',
    roundOf32: '$65–$130',
    roundOf16: '$80–$160',
    quarterFinal: '$100–$200',
    semiFinal: '$150–$300',
    final: '$200–$500',
    variant: 'outline',
    accentBorder: 'border-white/20',
    accentBg: 'bg-white/[0.04]',
    accentText: 'text-on-surface-variant',
  },
]

const HOW_TO_BUY_STEPS = [
  {
    step: 1,
    title: 'FIFA Official Ticket Portal',
    description:
      'The primary sales channel. Visit FIFA.com/tickets to apply during official sales phases. Tickets are allocated via a randomized draw when demand exceeds supply.',
    badge: 'Recommended',
    variant: 'primary' as const,
  },
  {
    step: 2,
    title: 'Authorized Resellers',
    description:
      'FIFA appoints official hospitality and ticket resellers for each host country. These packages often include premium seating, lounge access, and catering.',
    badge: 'Hospitality',
    variant: 'tertiary' as const,
  },
  {
    step: 3,
    title: 'Stadium Box Office',
    description:
      'Limited last-minute tickets may be available at stadium box offices on match day, subject to availability. Arrive early and bring valid photo ID.',
    badge: 'Match Day',
    variant: 'secondary' as const,
  },
]

const IMPORTANT_TIPS = [
  {
    title: 'Buy Only From Official Channels',
    description:
      'Purchase tickets exclusively through FIFA.com or authorized resellers. Third-party sites may sell counterfeit or invalid tickets that will be denied at the gate.',
    icon: 'shield',
  },
  {
    title: 'Beware of Scams',
    description:
      'Scammers target major events aggressively. Never wire money, buy from social media sellers, or pay in cryptocurrency. If the price seems too good to be true, it is.',
    icon: 'alert',
  },
  {
    title: 'Carry Photo ID',
    description:
      'All ticket holders must present valid government-issued photo ID matching the name on the ticket. Ensure your ID is current and matches your booking details exactly.',
    icon: 'id',
  },
  {
    title: 'Accessible Seating',
    description:
      'Dedicated accessible seating and companion tickets are available through the FIFA portal. Apply during the designated accessibility window for priority allocation.',
    icon: 'accessible',
  },
]

/* ---------- Sub-components ---------- */

function TicketTierCard({ tier, isPremiumVenue }: { tier: TicketTier; isPremiumVenue: boolean }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <div className={`absolute top-0 left-0 w-full h-1 ${tier.accentBg}`} />

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`font-mono text-3xl font-bold ${tier.accentText}`}>
              {tier.category}
            </span>
            <div>
              <h3 className="font-headline text-xl uppercase tracking-tight">
                {tier.label}
              </h3>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm mt-2 max-w-md leading-relaxed">
            {tier.description}
          </p>
        </div>
        <Badge variant={tier.variant} size="md">Cat {tier.category}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
        <PriceCell label="Group Stage" price={tier.groupStage} accent={tier.accentText} />
        <PriceCell label="Round of 32" price={tier.roundOf32} accent={tier.accentText} />
        <PriceCell label="Round of 16" price={tier.roundOf16} accent={tier.accentText} />
        <PriceCell label="Quarter-Final" price={tier.quarterFinal} accent={tier.accentText} />
        <PriceCell label="Semi-Final" price={tier.semiFinal} accent={tier.accentText} />
        <PriceCell label="Final" price={tier.final} accent={tier.accentText} />
      </div>

      {isPremiumVenue && tier.category === 1 && (
        <div className="mt-4 p-3 rounded-xl bg-secondary/10 border border-secondary/20">
          <p className="text-secondary text-sm font-label">
            <span className="font-bold">Premium venue:</span> Final host city pricing may be
            1.5&ndash;3x higher than standard estimates.
          </p>
        </div>
      )}
    </GlassCard>
  )
}

function PriceCell({ label, price, accent }: { label: string; price: string; accent: string }) {
  return (
    <div className="glass-panel rounded-xl border border-white/[0.08] p-3 text-center">
      <p className={`font-mono text-lg ${accent}`}>{price}</p>
      <p className="text-on-surface-variant text-[10px] font-label uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  )
}

function StepCard({
  step,
}: {
  step: (typeof HOW_TO_BUY_STEPS)[number]
}) {
  return (
    <GlassCard className="p-6 md:p-8" hover>
      <div className="flex items-start gap-5">
        <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="font-mono text-xl text-primary font-bold">{step.step}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-headline text-xl uppercase tracking-tight">{step.title}</h3>
            <Badge variant={step.variant}>{step.badge}</Badge>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">{step.description}</p>
        </div>
      </div>
    </GlassCard>
  )
}

function TipIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, string> = {
    shield: '\u{1F6E1}\uFE0F',
    alert: '\u26A0\uFE0F',
    id: '\u{1FAAA}',
    accessible: '\u267F',
  }
  return (
    <span className="text-2xl" role="img" aria-hidden="true">
      {iconMap[icon] ?? '\u2139\uFE0F'}
    </span>
  )
}

function VenueCapacityCard({ venue }: { venue: Venue }) {
  return (
    <GlassCard className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-headline text-2xl uppercase tracking-tight">{venue.name}</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            {venue.city}, {venue.state}
          </p>
        </div>
        <Badge variant="primary" size="md">Venue</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl border border-primary/20 p-5 text-center">
          <p className="font-mono text-3xl text-primary">{venue.capacity.toLocaleString()}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
            Capacity
          </p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
          <p className="font-mono text-2xl text-on-surface">{venue.surface}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
            Surface
          </p>
        </div>
        <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
          <p className="font-mono text-2xl text-on-surface">{venue.roofType}</p>
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">
            Roof
          </p>
        </div>
      </div>

      {venue.hostingRounds.length > 0 && (
        <div className="mt-6">
          <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-3">
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
    </GlassCard>
  )
}

/* ---------- Page ---------- */

export default async function CityTicketsPage({ params }: TicketsPageProps) {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const venues = getAllVenues()
  const cityVenues = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)

  const isPremiumVenue = slug === 'new-york'
  const totalCapacity = cityVenues.reduce((sum, v) => sum + v.capacity, 0)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Host Cities', url: 'https://kickoracle.com/cities' },
    { name: city.name, url: `https://kickoracle.com/cities/${slug}` },
    { name: 'Tickets', url: `https://kickoracle.com/cities/${slug}/tickets` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Tickets</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {city.name} <span className="text-primary">Tickets</span>
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            World Cup 2026 Match Tickets
          </p>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mt-3">
            Estimated pricing, official purchase channels, and essential tips for securing your
            seats at {cityVenues.length === 1 ? cityVenues[0]?.name : 'venues in ' + city.name}.
          </p>
          {totalCapacity > 0 && (
            <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 glass-panel rounded-full border border-white/[0.08]">
              <span className="text-on-surface-variant text-sm font-label uppercase tracking-widest">
                Total Capacity
              </span>
              <span className="font-mono text-2xl text-primary font-bold">
                {totalCapacity.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20 space-y-16">

        {/* Venue & Capacity */}
        {cityVenues.length > 0 && (
          <div>
            <SectionHeader className="mb-6">
              {cityVenues.length === 1 ? 'Stadium' : 'Stadiums'}
            </SectionHeader>
            <div className="space-y-6">
              {cityVenues.map((venue) => (
                <VenueCapacityCard key={venue.id} venue={venue} />
              ))}
            </div>
          </div>
        )}

        {/* Ticket Categories */}
        <div>
          <SectionHeader className="mb-3">Ticket Categories</SectionHeader>
          <p className="text-on-surface-variant text-sm mb-8 ml-4 pl-1 max-w-2xl">
            Estimated per-match prices in USD. Knockout rounds carry premium multipliers.
            Final venue (MetLife / New York) commands the highest prices.
          </p>
          <div className="space-y-6">
            {TICKET_TIERS.map((tier) => (
              <TicketTierCard key={tier.category} tier={tier} isPremiumVenue={isPremiumVenue} />
            ))}
          </div>
        </div>

        {/* How to Buy */}
        <div>
          <SectionHeader className="mb-6">How to Buy</SectionHeader>
          <div className="space-y-4">
            {HOW_TO_BUY_STEPS.map((step) => (
              <StepCard key={step.step} step={step} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <a
              href="#"
              data-affiliate="fifa-tickets"
              className="inline-block bg-primary text-on-primary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest text-sm hover:scale-[1.03] transition-transform shadow-lg shadow-primary/20"
            >
              Visit FIFA Ticket Portal
            </a>
            <p className="text-on-surface-variant text-xs mt-3">
              Opens the official FIFA ticket sales platform
            </p>
          </div>
        </div>

        {/* Important Tips */}
        <div>
          <SectionHeader className="mb-6">Important Tips</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {IMPORTANT_TIPS.map((tip) => (
              <GlassCard key={tip.title} className="p-6" hover>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <TipIcon icon={tip.icon} />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg uppercase tracking-tight mb-2">
                      {tip.title}
                    </h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Hosting Rounds summary (across all venues) */}
        {cityVenues.some((v) => v.hostingRounds.length > 0) && (
          <div>
            <SectionHeader className="mb-6">Tournament Stages</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
                {city.name} is confirmed to host the following rounds of the 2026 FIFA World Cup.
                Ticket pricing scales with the stage of the tournament.
              </p>
              <div className="flex flex-wrap gap-3">
                {[...new Set(cityVenues.flatMap((v) => v.hostingRounds))].map((round) => (
                  <span
                    key={round}
                    className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-label font-semibold"
                  >
                    {round}
                  </span>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </section>

      {/* Bottom navigation */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/cities/${slug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {city.name} Guide
          </Link>
          <Link
            href="/cities"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            All Host Cities
          </Link>
          <Link
            href="/schedule"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Match Schedule
          </Link>
          <Link
            href="/travel"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Travel Guide
          </Link>
        </div>
      </section>
    </>
  )
}
