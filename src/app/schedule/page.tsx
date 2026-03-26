import type { Metadata } from 'next'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import SectionHeader from '@/components/ui/SectionHeader'
import ScheduleClient from './ScheduleClient'

export const metadata: Metadata = {
  title: 'World Cup 2026 Full Schedule: All 104 Matches from Groups to Final',
  description:
    'Complete World Cup 2026 schedule timeline covering all 104 matches — 72 group-stage fixtures plus 32 knockout rounds including Round of 32, Round of 16, Quarterfinals, Semifinals, and the Final at MetLife Stadium.',
  keywords:
    'World Cup 2026 schedule, World Cup 2026 full calendar, World Cup 2026 knockout stage, World Cup 2026 final, World Cup 2026 all matches',
  alternates: { canonical: 'https://scoutedge.ai/schedule' },
  ...buildOGMeta({
    title: 'World Cup 2026 Full Schedule — All 104 Matches',
    description: 'Complete tournament timeline from group stage through the Final at MetLife Stadium.',
    url: 'https://scoutedge.ai/schedule',
  }),
}

export default function SchedulePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'FIFA World Cup 2026 — Complete Match Schedule',
    description: 'All 104 matches from group stage through the Final at MetLife Stadium.',
    numberOfItems: 104,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://scoutedge.ai' },
        { name: 'Schedule', url: 'https://scoutedge.ai/schedule' },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px] animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[#e9c400]/6 blur-[120px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-secondary">
            June 11 — July 19, 2026
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block text-on-surface">Tournament</span>
            <span className="block gradient-text">Schedule</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
            All 104 matches across 39 days — from the opening game at Estadio Azteca
            to the Final at MetLife Stadium. Group stage, Round of 32, knockout rounds, and beyond.
          </p>
        </div>
      </section>

      {/* Schedule Content */}
      <section className="page-container pb-24">
        <SectionHeader className="mb-8">Match Timeline</SectionHeader>
        <ScheduleClient />
      </section>
    </>
  )
}
