import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllVenues } from '@/lib/data-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import CountdownClient from './CountdownClient'

export const metadata: Metadata = {
  title: 'World Cup 2026 Countdown: Days Until Kickoff',
  description:
    'Live countdown to the 2026 FIFA World Cup opening match. Mexico vs South Africa kicks off June 11, 2026 at Estadio Azteca. Track every day, hour, minute, and second until the biggest World Cup in history.',
  keywords:
    'World Cup 2026 countdown, FIFA World Cup 2026 countdown, days until World Cup 2026, World Cup 2026 start date, World Cup 2026 opening match',
  alternates: { canonical: 'https://scoutedge.ai/countdown' },
}

const KEY_DATES = [
  { date: 'June 11, 2026', event: 'Opening Match', detail: 'Mexico vs South Africa — Estadio Azteca, Mexico City' },
  { date: 'June 11–26', event: 'Group Stage', detail: '72 matches across 12 groups in 16 host cities' },
  { date: 'June 27–30', event: 'Round of 32', detail: 'Top 2 from each group advance' },
  { date: 'July 1–4', event: 'Round of 16', detail: 'Knockout stage begins' },
  { date: 'July 5–6', event: 'Quarter-Finals', detail: '8 teams remaining' },
  { date: 'July 8–9', event: 'Semi-Finals', detail: '4 teams battle for the final' },
  { date: 'July 19, 2026', event: 'Final', detail: 'MetLife Stadium, New York / New Jersey' },
]

export default function CountdownPage() {
  const venues = getAllVenues()
  const openingVenue = venues.find((v) => v.name === 'Estadio Azteca')
  const finalVenue = venues.find((v) => v.id === 'metlife')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: '2026 FIFA World Cup',
    startDate: '2026-06-11T18:00:00Z',
    endDate: '2026-07-19T20:00:00Z',
    location: {
      '@type': 'Place',
      name: 'Multiple Venues — USA, Mexico & Canada',
    },
    description: 'The 2026 FIFA World Cup, the first with 48 teams, hosted across the United States, Mexico, and Canada.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[150px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Live Countdown</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            World Cup 2026<br />
            <span className="gradient-text">Countdown</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-12">
            The biggest FIFA World Cup in history kicks off with Mexico vs South Africa
            at Estadio Azteca, Mexico City.
          </p>

          <CountdownClient />

          <p className="text-on-surface-variant text-sm mt-8">
            Opening match: <span className="text-primary font-semibold">June 11, 2026 · 18:00 UTC</span>
          </p>
        </div>
      </section>

      {/* Key Dates Timeline */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">Key Dates</SectionHeader>
        <div className="grid gap-4">
          {KEY_DATES.map((item, i) => (
            <GlassCard key={i} className="p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <span className="font-label text-xs text-primary font-bold uppercase tracking-widest whitespace-nowrap min-w-[140px]">
                  {item.date}
                </span>
                <div>
                  <span className="font-headline text-lg uppercase tracking-wide">{item.event}</span>
                  <span className="text-on-surface-variant text-sm ml-0 sm:ml-3 block sm:inline">{item.detail}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Venue Highlights */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">Venue Highlights</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {openingVenue && (
            <GlassCard className="p-6">
              <Badge variant="primary" size="sm">Opening Match</Badge>
              <h3 className="font-headline text-2xl uppercase tracking-wide mt-3 mb-2">{openingVenue.name}</h3>
              <p className="text-on-surface-variant text-sm mb-3">{openingVenue.city}, {openingVenue.country}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Capacity</span>
                  <div className="font-headline text-xl text-primary">{openingVenue.capacity.toLocaleString()}</div>
                </div>
                <div>
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Surface</span>
                  <div className="font-headline text-xl">{openingVenue.surface}</div>
                </div>
              </div>
            </GlassCard>
          )}
          {finalVenue && (
            <GlassCard className="p-6">
              <Badge variant="tertiary" size="sm">Final</Badge>
              <h3 className="font-headline text-2xl uppercase tracking-wide mt-3 mb-2">{finalVenue.name}</h3>
              <p className="text-on-surface-variant text-sm mb-3">{finalVenue.metro}, {finalVenue.country}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Capacity</span>
                  <div className="font-headline text-xl text-tertiary">{finalVenue.capacity.toLocaleString()}</div>
                </div>
                <div>
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Surface</span>
                  <div className="font-headline text-xl">{finalVenue.surface}</div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20 text-center">
        <p className="text-on-surface-variant mb-6">Explore all 48 teams, AI predictions, and match previews.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/teams"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Explore Teams
          </Link>
          <Link
            href="/matches"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Match Schedule
          </Link>
        </div>
      </section>
    </>
  )
}
