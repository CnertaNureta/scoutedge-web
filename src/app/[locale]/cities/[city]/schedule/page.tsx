import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getCityBySlug } from '@/data/cities-data'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getAllVenues, getTeamBySlug } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import type { MatchFixture, Venue } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

/* ---------- Metadata ---------- */

interface SchedulePageProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: SchedulePageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}

  const venues = getAllVenues()
  const cityVenueNames = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)
    .map((v) => v.name)

  const cityFixtures = MATCH_FIXTURES.filter((f) => cityVenueNames.includes(f.venue))

  const title = `${city.name} Match Schedule — World Cup 2026`
  const description = `${cityFixtures.length} World Cup 2026 matches in ${city.name}. Full schedule with dates, kickoff times, teams, groups, and venue details.`
  const url = `https://kickoracle.com/cities/${slug}/schedule`

  return {
    title,
    description,
    keywords: `${city.name} World Cup schedule, ${city.name} match times, ${city.name} FIFA 2026, World Cup fixtures ${city.name}`,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

/* ---------- Helpers ---------- */

function formatMatchDate(utc: string, tz: string, locale: string): string {
  return new Date(utc).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  })
}

function formatMatchTime(utc: string, tz: string, locale: string): string {
  return new Date(utc).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: tz,
  })
}

function formatDateKey(utc: string, tz: string): string {
  return new Date(utc).toLocaleDateString('en-CA', { timeZone: tz })
}

interface EnrichedFixture extends MatchFixture {
  homeTeamName: string
  homeTeamFlag: string
  awayTeamName: string
  awayTeamFlag: string
}

function enrichFixture(fixture: MatchFixture): EnrichedFixture {
  const home = getTeamBySlug(fixture.homeTeamSlug)
  const away = getTeamBySlug(fixture.awayTeamSlug)

  return {
    ...fixture,
    homeTeamName: home?.name ?? fixture.homeTeamSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    homeTeamFlag: home?.flag ?? '',
    awayTeamName: away?.name ?? fixture.awayTeamSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    awayTeamFlag: away?.flag ?? '',
  }
}

function groupFixturesByDate(
  fixtures: EnrichedFixture[],
  tz: string,
  locale: string
): Map<string, { label: string; matches: EnrichedFixture[] }> {
  const groups = new Map<string, { label: string; matches: EnrichedFixture[] }>()

  for (const fixture of fixtures) {
    const key = formatDateKey(fixture.kickoffUtc, tz)
    if (!groups.has(key)) {
      groups.set(key, {
        label: formatMatchDate(fixture.kickoffUtc, tz, locale),
        matches: [],
      })
    }
    groups.get(key)!.matches.push(fixture)
  }

  return groups
}

/* ---------- Sub-components ---------- */

function ProbabilityBar({
  homeProb,
  drawProb,
  awayProb,
}: {
  homeProb: number
  drawProb: number
  awayProb: number
}) {
  const homePct = Math.round(homeProb * 100)
  const drawPct = Math.round(drawProb * 100)
  const awayPct = Math.round(awayProb * 100)

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">
        <span>Home {homePct}%</span>
        <span>Draw {drawPct}%</span>
        <span>Away {awayPct}%</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div
          className="bg-primary rounded-l-full transition-all"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-on-surface-variant/40 transition-all"
          style={{ width: `${drawPct}%` }}
        />
        <div
          className="bg-tertiary rounded-r-full transition-all"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  )
}

function MatchCard({
  fixture,
  timezone,
  locale,
}: {
  fixture: EnrichedFixture
  timezone: string
  locale: string
}) {
  return (
    <GlassCard className="p-5 md:p-6" hover>
      {/* Top row: time + group + round */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-sm text-primary">
          {formatMatchTime(fixture.kickoffUtc, timezone, locale)}
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">{fixture.round}</Badge>
          <Badge variant="primary" size="sm">Group {fixture.group}</Badge>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex-1 text-right">
          <p className="font-headline text-lg md:text-xl uppercase tracking-tight leading-tight">
            {fixture.homeTeamName}
          </p>
          <span className="text-2xl" aria-label={fixture.homeTeamName}>
            {fixture.homeTeamFlag}
          </span>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center shrink-0 px-3">
          <span className="font-headline text-2xl text-on-surface-variant/60 tracking-widest">
            VS
          </span>
        </div>

        {/* Away */}
        <div className="flex-1 text-left">
          <p className="font-headline text-lg md:text-xl uppercase tracking-tight leading-tight">
            {fixture.awayTeamName}
          </p>
          <span className="text-2xl" aria-label={fixture.awayTeamName}>
            {fixture.awayTeamFlag}
          </span>
        </div>
      </div>

      {/* Venue */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-on-surface-variant text-xs font-label">
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="uppercase tracking-widest">{fixture.venue}</span>
      </div>

      {/* Probability bar */}
      <ProbabilityBar
        homeProb={fixture.homeWinProb}
        drawProb={fixture.drawProb}
        awayProb={fixture.awayWinProb}
      />
    </GlassCard>
  )
}

/* ---------- Page ---------- */

export default async function CitySchedulePage({ params }: SchedulePageProps) {
  const { locale, city: slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const venues = getAllVenues()
  const cityVenues = city.venueIds
    .map((id) => venues.find((v) => v.id === id))
    .filter((v): v is Venue => v !== undefined)

  const cityVenueNames = cityVenues.map((v) => v.name)

  const cityFixtures = MATCH_FIXTURES
    .filter((f) => cityVenueNames.includes(f.venue))
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())

  const enrichedFixtures = cityFixtures.map(enrichFixture)
  const dateGroups = groupFixturesByDate(enrichedFixtures, city.timezone, locale)
  const matchCount = enrichedFixtures.length

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Host Cities', url: 'https://kickoracle.com/cities' },
    { name: city.name, url: `https://kickoracle.com/cities/${slug}` },
    { name: 'Schedule', url: `https://kickoracle.com/cities/${slug}/schedule` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Match Schedule</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {city.name}
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl mt-3 max-w-2xl mx-auto">
            {matchCount > 0 ? (
              <>
                <span className="font-mono text-primary text-2xl md:text-3xl font-bold">
                  {matchCount}
                </span>{' '}
                {matchCount === 1 ? 'match' : 'matches'} across{' '}
                {cityVenues.length === 1 ? '1 venue' : `${cityVenues.length} venues`}
              </>
            ) : (
              'Match schedule pending'
            )}
          </p>
          {cityVenues.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              {cityVenues.map((v) => (
                <span
                  key={v.id}
                  className="px-4 py-1.5 rounded-full glass-panel border border-white/[0.08] text-sm font-label text-on-surface-variant"
                >
                  {v.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Schedule */}
      <section className="max-w-[960px] mx-auto px-6 pb-20">
        {matchCount === 0 ? (
          <GlassCard className="p-10 text-center">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="font-headline text-2xl uppercase tracking-tight mb-2">
              Schedule Pending
            </h2>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Match assignments for this venue are pending. Check back soon for updated
              fixture dates and kickoff times.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-12">
            {[...dateGroups.entries()].map(([dateKey, { label, matches }]) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="glass-panel rounded-xl border border-white/[0.08] px-5 py-3">
                    <p className="font-headline text-lg md:text-xl uppercase tracking-tight text-on-surface">
                      {label}
                    </p>
                    <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-0.5">
                      {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                {/* Match cards for this date */}
                <div className="space-y-4">
                  {matches.map((fixture) => (
                    <MatchCard
                      key={`${fixture.homeTeamSlug}-${fixture.awayTeamSlug}`}
                      fixture={fixture}
                      timezone={city.timezone}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* City sub-page nav */}
      <section className="max-w-[960px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Explore {city.name}</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={`/cities/${slug}`}
            className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center hover:border-white/20 hover:bg-white/[0.04] transition-all"
          >
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Overview</p>
            <p className="font-headline text-sm uppercase tracking-tight text-on-surface">City Guide</p>
          </Link>
          <Link
            href={`/cities/${slug}/hotels`}
            className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center hover:border-white/20 hover:bg-white/[0.04] transition-all"
          >
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Stay</p>
            <p className="font-headline text-sm uppercase tracking-tight text-on-surface">Hotels</p>
          </Link>
          <Link
            href={`/cities/${slug}/transport`}
            className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center hover:border-white/20 hover:bg-white/[0.04] transition-all"
          >
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Travel</p>
            <p className="font-headline text-sm uppercase tracking-tight text-on-surface">Transport</p>
          </Link>
          <Link
            href={`/cities/${slug}/tickets`}
            className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center hover:border-white/20 hover:bg-white/[0.04] transition-all"
          >
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Tickets</p>
            <p className="font-headline text-sm uppercase tracking-tight text-on-surface">Match Tickets</p>
          </Link>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="max-w-[960px] mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/cities"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest text-sm hover:bg-white/[0.06] transition-colors"
          >
            All Host Cities
          </Link>
          <Link
            href="/schedule"
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
          >
            Full Schedule
          </Link>
        </div>
      </section>
    </>
  )
}
