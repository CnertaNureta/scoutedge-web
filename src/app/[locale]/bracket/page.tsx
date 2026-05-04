import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import HeroRegistrationCta from '@/components/ui/HeroRegistrationCta'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { KNOCKOUT_FIXTURES, KNOCKOUT_ROUNDS, getKnockoutTeamLabel } from '@/data/knockout-fixtures'
import type { MatchFixture } from '@/lib/types'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'bracketPage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords:
      'World Cup 2026 bracket, World Cup 2026 knockout stage, World Cup bracket 2026, tournament bracket, World Cup 2026 draw, Round of 32',
    alternates: { canonical: canonicalForLocale(locale, '/bracket') },
    ...buildOGMeta({
      title: t('heading'),
      description: t('description'),
      url: 'https://kickoracle.com/bracket',
    }),
  }
}

/* ───────── Round metadata ───────── */

const ROUND_META: Record<string, { short: string; color: string; badge: 'primary' | 'secondary' | 'tertiary' | 'outline'; matches: number }> = {
  'Round of 32': { short: 'R32', color: 'text-on-surface-variant', badge: 'outline', matches: 16 },
  'Round of 16': { short: 'R16', color: 'text-secondary', badge: 'secondary', matches: 8 },
  'Quarterfinal': { short: 'QF', color: 'text-tertiary', badge: 'tertiary', matches: 4 },
  'Semifinal': { short: 'SF', color: 'text-primary', badge: 'primary', matches: 2 },
  'Third Place': { short: '3RD', color: 'text-on-surface-variant', badge: 'outline', matches: 1 },
  'Final': { short: 'FINAL', color: 'text-tertiary', badge: 'tertiary', matches: 1 },
}

/* ───────── Helpers ───────── */

function getFixturesByRound(round: string): MatchFixture[] {
  return KNOCKOUT_FIXTURES.filter((f) => f.round === round)
}

function formatDate(utc: string, locale: string): string {
  const d = new Date(utc)
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatTime(utc: string, locale: string): string {
  const d = new Date(utc)
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

function highestProb(fixture: MatchFixture): 'home' | 'draw' | 'away' {
  if (fixture.homeWinProb >= fixture.awayWinProb && fixture.homeWinProb >= fixture.drawProb) return 'home'
  if (fixture.awayWinProb >= fixture.homeWinProb && fixture.awayWinProb >= fixture.drawProb) return 'away'
  return 'draw'
}

/* ───────── Match Card ───────── */

function MatchCard({ fixture, compact, locale }: { fixture: MatchFixture; compact?: boolean; locale: string }) {
  const homeLabel = getKnockoutTeamLabel(fixture.homeTeamSlug)
  const awayLabel = getKnockoutTeamLabel(fixture.awayTeamSlug)
  const favored = highestProb(fixture)

  return (
    <div className="glass-panel rounded-xl border border-white/[0.08] overflow-hidden hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Venue + Date header */}
      <div className="px-3 py-1.5 bg-surface-container border-b border-white/[0.05] flex items-center justify-between gap-2">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider truncate">
          {fixture.venue}
        </span>
        <span className="font-mono text-[10px] text-on-surface-variant/70 shrink-0">
          {formatDate(fixture.kickoffUtc, locale)}
        </span>
      </div>

      {/* Teams */}
      <div className={compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'}>
        {/* Home team row */}
        <div className={`flex items-center justify-between gap-2 ${favored === 'home' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-label truncate flex-1`}>
            {homeLabel}
          </span>
          <span className={`font-mono ${compact ? 'text-[11px]' : 'text-xs'} font-bold tabular-nums ${favored === 'home' ? 'text-primary' : 'text-on-surface-variant/60'}`}>
            {(fixture.homeWinProb * 100).toFixed(0)}%
          </span>
        </div>

        {/* Divider with draw prob */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-mono text-[9px] text-on-surface-variant/40 shrink-0">
            Draw {(fixture.drawProb * 100).toFixed(0)}%
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Away team row */}
        <div className={`flex items-center justify-between gap-2 ${favored === 'away' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-label truncate flex-1`}>
            {awayLabel}
          </span>
          <span className={`font-mono ${compact ? 'text-[11px]' : 'text-xs'} font-bold tabular-nums ${favored === 'away' ? 'text-primary' : 'text-on-surface-variant/60'}`}>
            {(fixture.awayWinProb * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Probability bar at bottom */}
      <div className="h-1 flex">
        <div
          className="bg-primary/60 transition-all duration-500"
          style={{ width: `${fixture.homeWinProb * 100}%` }}
        />
        <div
          className="bg-on-surface-variant/20 transition-all duration-500"
          style={{ width: `${fixture.drawProb * 100}%` }}
        />
        <div
          className="bg-secondary/50 transition-all duration-500"
          style={{ width: `${fixture.awayWinProb * 100}%` }}
        />
      </div>
    </div>
  )
}

/* ───────── Connector Lines (desktop bracket flow) ───────── */

function BracketConnector({ matchCount }: { matchCount: number }) {
  return (
    <div className="hidden xl:flex flex-col justify-around py-4 w-8 shrink-0" aria-hidden="true">
      {Array.from({ length: matchCount / 2 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ height: `${100 / (matchCount / 2)}%` }}>
          <div className="w-full flex flex-col justify-between h-full">
            <div className="border-t border-r border-white/[0.12] h-1/2 rounded-tr-lg ml-0 mr-0" />
            <div className="border-b border-r border-white/[0.12] h-1/2 rounded-br-lg ml-0 mr-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────── Round Column ───────── */

function RoundColumn({ round, fixtures, compact, locale }: { round: string; fixtures: MatchFixture[]; compact?: boolean; locale: string }) {
  const meta = ROUND_META[round]
  const isFinalRounds = round === 'Third Place' || round === 'Final'

  return (
    <div className={`flex flex-col ${isFinalRounds ? 'xl:min-w-[220px]' : 'xl:min-w-[240px]'} shrink-0`}>
      {/* Round header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <Badge variant={meta.badge} size="sm">{meta.short}</Badge>
        <span className={`font-label text-xs uppercase tracking-wider ${meta.color}`}>
          {round}
        </span>
        <span className="font-mono text-[10px] text-on-surface-variant/40 ml-auto">
          {fixtures.length} {fixtures.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      {/* Match cards in the column */}
      <div className={`flex flex-col justify-around flex-1 ${isFinalRounds ? 'gap-4' : 'gap-2'}`}>
        {fixtures.map((fixture, idx) => (
          <MatchCard key={`${round}-${idx}`} fixture={fixture} compact={compact} locale={locale} />
        ))}
      </div>
    </div>
  )
}

/* ───────── Desktop Bracket View (horizontal flow) ───────── */

function DesktopBracket({ locale }: { locale: string }) {
  const r32 = getFixturesByRound('Round of 32')
  const r16 = getFixturesByRound('Round of 16')
  const qf = getFixturesByRound('Quarterfinal')
  const sf = getFixturesByRound('Semifinal')
  const thirdPlace = getFixturesByRound('Third Place')
  const final_ = getFixturesByRound('Final')

  return (
    <div className="hidden xl:block">
      <div className="flex items-stretch gap-0 overflow-x-auto pb-4 scrollbar-thin">
        {/* Round of 32 */}
        <RoundColumn round="Round of 32" fixtures={r32} compact locale={locale} />
        <BracketConnector matchCount={r32.length} />

        {/* Round of 16 */}
        <RoundColumn round="Round of 16" fixtures={r16} compact locale={locale} />
        <BracketConnector matchCount={r16.length} />

        {/* Quarterfinals */}
        <RoundColumn round="Quarterfinal" fixtures={qf} locale={locale} />
        <BracketConnector matchCount={qf.length} />

        {/* Semifinals */}
        <RoundColumn round="Semifinal" fixtures={sf} locale={locale} />

        {/* Final rounds */}
        <div className="flex flex-col gap-6 ml-6 justify-center shrink-0">
          <RoundColumn round="Final" fixtures={final_} locale={locale} />
          <RoundColumn round="Third Place" fixtures={thirdPlace} locale={locale} />
        </div>
      </div>
    </div>
  )
}

/* ───────── Mobile Bracket View (stacked rounds) ───────── */

function MobileBracket({ locale }: { locale: string }) {
  const rounds = KNOCKOUT_ROUNDS.filter((r) => r !== 'Third Place')
  const thirdPlace = getFixturesByRound('Third Place')

  return (
    <div className="xl:hidden space-y-10">
      {rounds.map((round) => {
        const fixtures = getFixturesByRound(round)
        const meta = ROUND_META[round]
        const isEarlyRound = round === 'Round of 32' || round === 'Round of 16'

        return (
          <div key={round}>
            {/* Round header */}
            <div className="flex items-center gap-3 mb-5">
              <Badge variant={meta.badge} size="md">{meta.short}</Badge>
              <div>
                <h3 className={`font-headline text-xl uppercase tracking-wide ${meta.color}`}>
                  {round}
                </h3>
                <span className="font-mono text-[10px] text-on-surface-variant/50">
                  {fixtures.length} {fixtures.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Grid of match cards */}
            <div className={`grid gap-3 ${isEarlyRound ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2'}`}>
              {fixtures.map((fixture, idx) => (
                <MatchCard key={`mobile-${round}-${idx}`} fixture={fixture} locale={locale} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Third Place as final section */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Badge variant="outline" size="md">3RD</Badge>
          <div>
            <h3 className="font-headline text-xl uppercase tracking-wide text-on-surface-variant">
              Third Place
            </h3>
            <span className="font-mono text-[10px] text-on-surface-variant/50">1 match</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {thirdPlace.map((fixture, idx) => (
            <MatchCard key={`mobile-3rd-${idx}`} fixture={fixture} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────── Stats summary ───────── */

function BracketStats() {
  const totalMatches = KNOCKOUT_FIXTURES.length
  const venues = [...new Set(KNOCKOUT_FIXTURES.map((f) => f.venue))]
  const cities = [...new Set(KNOCKOUT_FIXTURES.map((f) => f.city))]
  const firstDate = KNOCKOUT_FIXTURES.reduce((min, f) => f.kickoffUtc < min ? f.kickoffUtc : min, KNOCKOUT_FIXTURES[0].kickoffUtc)
  const lastDate = KNOCKOUT_FIXTURES.reduce((max, f) => f.kickoffUtc > max ? f.kickoffUtc : max, KNOCKOUT_FIXTURES[0].kickoffUtc)

  const stats = [
    { label: 'Knockout Matches', value: totalMatches.toString(), accent: 'text-primary' },
    { label: 'Venues', value: venues.length.toString(), accent: 'text-secondary' },
    { label: 'Host Cities', value: cities.length.toString(), accent: 'text-tertiary' },
    { label: 'Tournament Days', value: Math.ceil((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86400000).toString(), accent: 'text-primary' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
      {stats.map((stat) => (
        <GlassCard key={stat.label} className="p-4 text-center">
          <span className={`block font-mono text-3xl font-bold ${stat.accent} mb-1`}>
            {stat.value}
          </span>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
            {stat.label}
          </span>
        </GlassCard>
      ))}
    </div>
  )
}

/* ───────── Road to Final ───────── */

function RoadToFinal() {
  const roundOrder: (typeof KNOCKOUT_ROUNDS)[number][] = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final']

  return (
    <div className="flex items-center justify-center gap-1 md:gap-3 flex-wrap mb-12">
      {roundOrder.map((round, i) => {
        const meta = ROUND_META[round]
        return (
          <div key={round} className="flex items-center gap-1 md:gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center ${
                round === 'Final' ? 'border-tertiary bg-tertiary/15' : 'border-white/20 bg-surface-container'
              }`}>
                <span className={`font-mono text-[10px] md:text-xs font-bold ${round === 'Final' ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  {meta.matches}
                </span>
              </div>
              <span className="font-label text-[8px] md:text-[10px] text-on-surface-variant/60 uppercase tracking-wider mt-1">
                {meta.short}
              </span>
            </div>
            {i < roundOrder.length - 1 && (
              <div className="w-4 md:w-8 h-px bg-gradient-to-r from-white/20 to-white/5" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────── Page ───────── */

export default async function BracketPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bracketPage')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'FIFA World Cup 2026 — Complete Knockout Bracket',
    description: 'All 32 knockout-stage matches from Round of 32 through the Final at MetLife Stadium.',
    numberOfItems: KNOCKOUT_FIXTURES.length,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://kickoracle.com' },
        { name: 'Bracket', url: 'https://kickoracle.com/bracket' },
      ])) }} />

      {/* ── Hero ── */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="hidden sm:block absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px]" aria-hidden="true" />
        <div className="hidden sm:block absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-tertiary/6 blur-[120px]" aria-hidden="true" />
        <div className="hidden sm:block absolute top-1/2 right-1/6 w-[200px] h-[200px] rounded-full bg-secondary/5 blur-[100px]" aria-hidden="true" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-tertiary/10 border border-tertiary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-tertiary">
            {t('badge')}
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block text-on-surface">{t('heading')}</span>
            <span className="block gradient-text">{t('knockoutBracket')}</span>
          </h1>

          <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
            {t('description')}
          </p>

          <HeroRegistrationCta
            headline={t('ctaText')}
            cta={t('ctaButton')}
            className="justify-center mb-6"
          />

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/predictions"
              className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all"
            >
              {t('aiPredictions')}
            </Link>
            <Link
              href="/schedule"
              className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all"
            >
              {t('fullSchedule')}
            </Link>
            <Link
              href="/groups"
              className="px-6 py-3 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-white/20 transition-all"
            >
              {t('groupStage')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Road to Final ── */}
      <section className="max-w-[1440px] mx-auto px-6 pt-4 pb-2">
        <RoadToFinal />
      </section>

      {/* ── Stats Bar ── */}
      <section className="max-w-[1440px] mx-auto px-6">
        <BracketStats />
      </section>

      {/* ── Bracket Visualization ── */}
      <section className="max-w-[1920px] mx-auto px-4 xl:px-8 pb-20">
        <SectionHeader className="mb-8" withRule>
          {t('knockoutBracket')}
        </SectionHeader>

        {/* Desktop: horizontal bracket flow */}
        <DesktopBracket locale={locale} />

        {/* Mobile/Tablet: stacked rounds */}
        <MobileBracket locale={locale} />
      </section>

      {/* ── Key Venues ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-8" accentColor="#e9c400">
          {t('keyVenues')}
        </SectionHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { venue: 'MetLife Stadium', city: 'East Rutherford', role: 'Final & Semifinals', capacity: '82,500', highlight: true },
            { venue: 'AT&T Stadium', city: 'Arlington', role: 'Semifinals & Quarterfinals', capacity: '80,000', highlight: false },
            { venue: 'SoFi Stadium', city: 'Inglewood', role: 'Quarterfinals', capacity: '70,240', highlight: false },
            { venue: 'Hard Rock Stadium', city: 'Miami', role: 'Third Place & Quarterfinals', capacity: '64,767', highlight: false },
            { venue: 'Estadio Azteca', city: 'Mexico City', role: 'Round of 16', capacity: '87,523', highlight: false },
            { venue: 'Mercedes-Benz Stadium', city: 'Atlanta', role: 'Round of 16 & 32', capacity: '71,000', highlight: false },
          ].map((v) => (
            <GlassCard key={v.venue} hover className={`p-5 ${v.highlight ? 'border-tertiary/30' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className={`font-headline text-base ${v.highlight ? 'text-tertiary' : 'text-on-surface'}`}>
                    {v.venue}
                  </h3>
                  <span className="font-label text-xs text-on-surface-variant">{v.city}</span>
                </div>
                {v.highlight && <Badge variant="tertiary">Final</Badge>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">{v.role}</span>
                <span className="font-mono text-xs text-on-surface-variant/60">{v.capacity}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <GlassCard className="p-8 md:p-12 text-center">
          <h2 className="font-headline text-3xl md:text-4xl uppercase tracking-wide text-on-surface mb-4">
            {t('exploreTournament')}
          </h2>
          <p className="font-body text-on-surface-variant max-w-xl mx-auto mb-8">
            {t('exploreTournamentDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/teams"
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              {t('browseAllTeams')}
            </Link>
            <Link
              href="/simulator"
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
            >
              {t('tournamentSimulator')}
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
