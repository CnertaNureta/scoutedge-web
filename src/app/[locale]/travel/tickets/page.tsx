import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import AffiliateSlot from '@/components/monetization/AffiliateSlot'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'

export const revalidate = 86400

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const alternates = buildAlternates(locale, '/travel/tickets')

  return {
    title: 'World Cup 2026 Tickets — FIFA Ballot, Resale & Hospitality',
    description:
      'How to get tickets to the 2026 FIFA World Cup: ballot timeline, price tiers, hospitality packages, and resale options.',
    keywords: 'World Cup 2026 tickets, FIFA ballot 2026, World Cup hospitality, World Cup resale',
    alternates,
    ...buildOGMeta({
      title: 'World Cup 2026 Tickets — FIFA Ballot, Resale & Hospitality',
      description:
        'How to get tickets to the 2026 FIFA World Cup. Ballot timeline, price tiers, hospitality packages, and trusted resale options.',
      url: alternates.canonical,
      locale,
    }),
  }
}

const TIMELINE = [
  { phase: 'Phase 1 — Random Draw', dates: 'Sept 2025', status: 'Closed', details: 'FIFA.com priority draw for Visa cardholders. Applications accepted; selections randomized.' },
  { phase: 'Phase 2 — Early Ticket Draw', dates: 'Oct – Dec 2025', status: 'Closed', details: 'General public draw before group stage is finalized. Buyers picked specific match categories, not specific teams.' },
  { phase: 'Phase 3 — Random Selection Draw', dates: 'Dec 2025 – Jan 2026', status: 'Closed', details: 'After the final group-stage draw. Fans bid on specific fixtures with known teams.' },
  { phase: 'Phase 4 — Last-Minute Sales', dates: 'April – July 2026', status: 'Active', details: 'First-come-first-served on remaining inventory and resale marketplace. Check FIFA resale daily.' },
]

const PRICE_TIERS = [
  { category: 'Cat 1 (Premium)', groupStage: '$250–$620', roundOf32: '$300–$950', final: '$2,030' },
  { category: 'Cat 2 (Mid)', groupStage: '$190–$410', roundOf32: '$230–$650', final: '$1,210' },
  { category: 'Cat 3 (Value)', groupStage: '$130–$290', roundOf32: '$170–$450', final: '$850' },
  { category: 'Cat 4 (Host Nation)', groupStage: '$60–$150', roundOf32: '$80–$250', final: '$460' },
]

const CHANNELS = [
  { name: 'FIFA.com Official', badge: 'Recommended', description: 'Primary ticket source. Always check here first before resale sites. Resale tab unlocks after group stage draw.', link: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/tickets' },
  { name: 'FIFA Hospitality', badge: 'Premium', description: 'Official matchday hospitality with suites, premium seating, and catering. Priced per match or tournament packages.', link: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/hospitality' },
  { name: 'FIFA Fan Pack', badge: 'Bundles', description: 'Multi-match tournament bundles following one team or one venue. Best value for dedicated fans.', link: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/tickets' },
]

export default async function TicketsPage({ params }: Props) {
  const { locale } = await params
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Travel', url: canonicalForLocale(locale, '/travel') },
    { name: 'Tickets', url: canonicalForLocale(locale, '/travel/tickets') },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1100px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Ticket Guide</Badge>
          <h1 className="font-headline text-5xl md:text-7xl tracking-wide uppercase mt-4 mb-4">
            World Cup 2026<br /><span className="gradient-text">Tickets</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            How to get tickets: FIFA ballot phases, price tiers by match category, and trusted hospitality packages.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Sales Timeline</SectionHeader>
        <div className="space-y-4">
          {TIMELINE.map((phase) => (
            <GlassCard key={phase.phase} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h3 className="font-headline text-lg uppercase tracking-tight">{phase.phase}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" size="sm">{phase.dates}</Badge>
                  <Badge variant={phase.status === 'Active' ? 'primary' : 'secondary'} size="sm">{phase.status}</Badge>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">{phase.details}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Price tiers */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Price Tiers (USD)</SectionHeader>
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-label uppercase tracking-widest text-xs text-on-surface-variant">Category</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-on-surface-variant">Group Stage</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-on-surface-variant">R32–QF</th>
                  <th className="px-4 py-3 text-right font-label uppercase tracking-widest text-xs text-on-surface-variant">Final</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_TIERS.map((tier) => (
                  <tr key={tier.category} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-on-surface">{tier.category}</td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{tier.groupStage}</td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface-variant">{tier.roundOf32}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">{tier.final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        <p className="text-xs text-on-surface-variant mt-3">
          Prices range based on match slot and venue. Cat 4 is reserved for residents of host countries. Final match tickets are the highest tier across the tournament.
        </p>
      </section>

      {/* Channels */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <SectionHeader className="mb-8">Where to Buy</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CHANNELS.map((c) => (
            <GlassCard key={c.name} className="p-6 flex flex-col" hover>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-headline text-base uppercase tracking-tight">{c.name}</h3>
                <Badge variant="primary" size="sm">{c.badge}</Badge>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-4">{c.description}</p>
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary/15 text-primary px-4 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
              >
                Open official page →
              </a>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Affiliate: resale + hospitality */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <AffiliateSlot id="tickets" placement="travel-tickets" />
      </section>

      {/* Scam warning */}
      <section className="max-w-[1100px] mx-auto px-6 mb-16">
        <GlassCard className="p-6 md:p-8 border border-red-500/20">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-headline text-lg uppercase tracking-tight mb-2">Avoid Ticket Scams</h3>
              <ul className="text-on-surface-variant text-sm space-y-2">
                <li>• Only buy from FIFA.com or verified resale partners listed on FIFA.com.</li>
                <li>• Tickets are issued as mobile QR codes; anyone selling printed tickets should be avoided.</li>
                <li>• Never wire money, use crypto, or send gift cards for tickets.</li>
                <li>• Always verify the seller&apos;s FIFA purchase is tied to your FIFA account before paying.</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-6 pb-20">
        <GlassCard className="p-8 text-center">
          <h2 className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-4">Plan the Rest of Your Trip</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/travel/visa" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Visa Guide
            </Link>
            <Link href="/travel/budget-calculator" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Budget Calculator
            </Link>
            <Link href="/cities" className="border border-white/20 px-6 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Host Cities
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
