'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  getAllVenues,
  getJetLagTier,
  getTeamTimezone,
} from '@/lib/data-service'
import type { MatchFixture, Team, Venue } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import ProbabilityBar from '@/components/ui/ProbabilityBar'
import SectionHeader from '@/components/ui/SectionHeader'
import { BRAND } from '@/lib/brand-tokens'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { useWakeLock } from '@/hooks/useWakeLock'

const rounds = ['Match Day 1', 'Match Day 2', 'Match Day 3'] as const

type RoundName = typeof rounds[number]
type JetLagTier = 'none' | 'moderate' | 'significant' | 'extreme'

interface MatchesClientProps {
  fixtures: MatchFixture[]
  groups: string[]
  teamsByGroup: Record<string, Team[]>
  teamsBySlug: Record<string, Team>
}

const ROUND_ACCENT: Record<RoundName, string> = {
  'Match Day 1': BRAND.primary,
  'Match Day 2': BRAND.tertiary,
  'Match Day 3': BRAND.secondary,
}

const ROUND_META_KEYS: Record<RoundName, string> = {
  'Match Day 1': 'matchDay1',
  'Match Day 2': 'matchDay2',
  'Match Day 3': 'matchDay3',
}

function getRoundMeta(round: RoundName, t: (key: string) => string) {
  const key = ROUND_META_KEYS[round]
  return {
    accent: ROUND_ACCENT[round],
    eyebrow: t(`roundMeta.${key}.eyebrow`),
    title: t(`roundMeta.${key}.title`),
    description: t(`roundMeta.${key}.description`),
  }
}

const venueLookup = new Map(getAllVenues().map((venue) => [venue.name, venue]))

const jetLagSeverity: Record<JetLagTier, number> = {
  none: 0,
  moderate: 1,
  significant: 2,
  extreme: 3,
}

function getJetLagCopy(tier: JetLagTier, t: (key: string) => string): string {
  return t(`jetLag.${tier}`)
}

function formatKickoff(utc: string, locale: string, timeZone = 'America/New_York') {
  const kickoff = new Date(utc)

  return {
    date: kickoff.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone,
    }),
    time: kickoff.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }),
  }
}

function getConfidenceLabel(fixture: MatchFixture, t: (key: string) => string) {
  const strongestEdge = Math.max(fixture.homeWinProb, fixture.awayWinProb)

  if (strongestEdge >= 0.64) return t('confidence.heavy')
  if (strongestEdge >= 0.54) return t('confidence.clear')
  return t('confidence.balanced')
}

function getPressureLabel(round: RoundName, t: (key: string) => string) {
  const key = ROUND_META_KEYS[round]
  return t(`pressure.${key}`)
}

function getTravelContext(home: Team, away: Team, t: (key: string, values?: Record<string, string | number>) => string) {
  const teamContexts = [home, away]
    .map((team) => ({
      team,
      tier: getJetLagTier(team.slug) as JetLagTier | undefined,
      timezone: getTeamTimezone(team.slug),
    }))
    .filter((entry) => entry.tier)

  if (teamContexts.length === 0) {
    return t('travelNeutral')
  }

  const highest = teamContexts.reduce((current, entry) => (
    jetLagSeverity[entry.tier!] > jetLagSeverity[current.tier!] ? entry : current
  ))

  const impactedTeams = teamContexts
    .filter((entry) => entry.tier === highest.tier)
    .map((entry) => entry.team.name)
    .join(' and ')

  const adjustmentHours = highest.timezone?.adjustmentHours
  const absoluteAdjustmentHours =
    typeof adjustmentHours === 'number' ? Math.abs(adjustmentHours) : undefined

  if (absoluteAdjustmentHours && absoluteAdjustmentHours > 0) {
    return t('travelShift', { teams: impactedTeams, hours: absoluteAdjustmentHours, adjustment: getJetLagCopy(highest.tier!, t) })
  }

  return t('travelCarry', { teams: impactedTeams, adjustment: getJetLagCopy(highest.tier!, t) })
}

function buildMatchStory(fixture: MatchFixture, home: Team, away: Team, venue?: Venue) {
  const favorite = fixture.homeWinProb >= fixture.awayWinProb ? home : away
  const underdog = favorite.slug === home.slug ? away : home
  const favoriteWinProb = Math.max(fixture.homeWinProb, fixture.awayWinProb)
  const chemistryLeader = home.chemistry >= away.chemistry ? home : away
  const rankingGap = Math.abs(home.fifaRanking - away.fifaRanking)
  const venueHook = venue
    ? `${venue.metro} provides a ${venue.roofType.toLowerCase()}-roof stage`
    : `${fixture.city} hosts the latest shift in Group ${fixture.group}`

  if (fixture.round === 'Match Day 1') {
    return `${favorite.name} open with a ${Math.round(favoriteWinProb * 100)}% model edge, but ${chemistryLeader.name}'s ${chemistryLeader.chemistry} chemistry rating keeps this first read unstable. ${venueHook}.`
  }

  if (fixture.round === 'Match Day 2') {
    return `${favorite.name} control the median outcome, yet Match Day 2 usually decides who can play from strength. ${rankingGap <= 10 ? 'The ranking gap is narrow enough to make this a live table-turner.' : `${underdog.name} still have enough depth to disrupt the expected order.`} ${venueHook}.`
  }

  return `${favorite.name} enter decision night as the model favorite, but final-round matches rarely stay linear. ${chemistryLeader.name}'s cohesion and the pressure of simultaneous kickoffs turn this into a qualification stress test. ${venueHook}.`
}

function buildGroupNarrative(group: string, teams: Team[]) {
  if (teams.length === 0) {
    return {
      title: `Group ${group} is taking shape`,
      description: 'This board is waiting on the latest group context to settle into place.',
    }
  }

  const favorite = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking)[0]
  const chemistryLeader = [...teams].sort((a, b) => b.chemistry - a.chemistry)[0]
  const rankingSpread =
    Math.max(...teams.map((team) => team.fifaRanking)) -
    Math.min(...teams.map((team) => team.fifaRanking))

  if (rankingSpread <= 12) {
    return {
      title: `Group ${group} is a live race`,
      description: `${favorite.name} carry the best ranking, but ${chemistryLeader.name} own the strongest chemistry read. This section looks built for narrow margins rather than one runaway favorite.`,
    }
  }

  if (favorite.fifaRanking <= 5) {
    return {
      title: `Group ${group} bends around ${favorite.name}`,
      description: `${favorite.name} arrive as the clearest paper favorite, but ${chemistryLeader.name}'s cohesion gives the rest of the bracket a real way to drag the pace away from the default script.`,
    }
  }

  return {
    title: `Group ${group} rewards stability`,
    description: `${favorite.name} are the ranking reference point, while ${chemistryLeader.name} set the chemistry ceiling. Expect this group to tilt toward whoever handles the second matchday best.`,
  }
}

function TeamRow({
  team,
  role,
  probability,
  t,
}: {
  team: Team
  role: 'home' | 'away'
  probability: number
  t: (key: string) => string
}) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-white/20 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-3xl shrink-0">{team.flag}</span>
        <div className="min-w-0">
          <div className="font-headline text-lg uppercase tracking-wide text-on-surface group-hover:text-primary transition-colors truncate">
            {team.name}
          </div>
          <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            #{team.fifaRanking} {t('fifaRank')} · {team.confederation}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`font-label text-xs font-semibold uppercase tracking-widest ${role === 'home' ? 'text-primary' : 'text-secondary'}`}>
          {Math.round(probability * 100)}%
        </div>
        <div className="text-[11px] text-on-surface-variant">{t('chemistry')} {team.chemistry}</div>
      </div>
    </Link>
  )
}

function fixtureToMatchId(fixture: MatchFixture): string {
  return `${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}-${fixture.group.toLowerCase()}`
}

function MatchCard({
  fixture,
  teamsBySlug,
  accent,
  locale,
  t,
}: {
  fixture: MatchFixture
  teamsBySlug: Record<string, Team>
  accent: string
  locale: string
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const home = teamsBySlug[fixture.homeTeamSlug]
  const away = teamsBySlug[fixture.awayTeamSlug]

  if (!home || !away) return null

  const venue = venueLookup.get(fixture.venue)
  const kickoff = formatKickoff(fixture.kickoffUtc, locale, venue?.timezone)
  const story = buildMatchStory(fixture, home, away, venue)
  const venueLine = venue
    ? `${venue.metro}, ${venue.country} · ${t('seats', { capacity: venue.capacity.toLocaleString(locale) })}`
    : `${fixture.venue}, ${fixture.city}`
  const climateLine = venue
    ? `${venue.roofType} roof · ${venue.climate.description}`
    : t('venueDetailUnavailable')
  const matchId = fixtureToMatchId(fixture)

  return (
    <GlassCard hover className="h-full p-5 md:p-6">
      <NeonAccentBar color={accent} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="sm">{t('groupBadge', { group: fixture.group })}</Badge>
          <Badge variant="outline" size="sm">{fixture.round}</Badge>
        </div>
        <span
          className="rounded-full px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {getConfidenceLabel(fixture, t)}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <TeamRow team={home} role="home" probability={fixture.homeWinProb} t={t} />
        <TeamRow team={away} role="away" probability={fixture.awayWinProb} t={t} />
      </div>

      <p className="text-sm leading-7 text-on-surface mb-5">{story}</p>

      <ProbabilityBar
        homeProb={fixture.homeWinProb}
        drawProb={fixture.drawProb}
        awayProb={fixture.awayWinProb}
        homeLabel={home.name}
        awayLabel={away.name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        {[
          { label: t('kickoff'), value: `${kickoff.date} · ${kickoff.time}` },
          { label: t('venue'), value: venueLine },
          { label: t('narrative'), value: getPressureLabel(fixture.round as RoundName, t) },
          { label: t('travelWatch'), value: getTravelContext(home, away, t) },
          { label: t('climate'), value: climateLine },
          { label: t('keyInsight'), value: `${home.name}: ${home.keyInsight}` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
            <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
              {item.label}
            </div>
            <div className="text-sm text-on-surface leading-6">{item.value}</div>
          </div>
        ))}
      </div>

      <Link
        href={`/matches/live/${matchId}`}
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse-slow" />
        {t('livePredictions')}
      </Link>
    </GlassCard>
  )
}

export default function MatchesClient({
  fixtures,
  groups,
  teamsByGroup,
  teamsBySlug,
}: MatchesClientProps) {
  const locale = useLocale()
  const t = useTranslations('matchesPage')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const filterRef = useRef<HTMLDivElement>(null)

  // Derived group index for swipe navigation
  const groupList = [null, ...groups] // null = "All"
  const activeIdx = groupList.indexOf(activeGroup)

  // Pull-to-refresh — re-renders the fixture list to pick up any data changes
  const handleRefresh = useCallback(async () => {
    await new Promise<void>((r) => setTimeout(r, 600))
    setRefreshKey((k) => k + 1)
  }, [])

  const { isRefreshing, pullDistance } = usePullToRefresh({ onRefresh: handleRefresh })

  // Swipe left/right to cycle through group tabs
  useSwipeGesture({
    onSwipeLeft: () => {
      const next = Math.min(activeIdx + 1, groupList.length - 1)
      setActiveGroup(groupList[next])
    },
    onSwipeRight: () => {
      const prev = Math.max(activeIdx - 1, 0)
      setActiveGroup(groupList[prev])
    },
  })

  // Watch mode — keep screen on while viewing live match data
  const { isSupported: wakeLockSupported, isActive: watchMode, request: startWatch, release: stopWatch } = useWakeLock()

  const filteredFixtures = useMemo(
    () => (activeGroup ? fixtures.filter((fixture) => fixture.group === activeGroup) : fixtures),
    [activeGroup, fixtures]
  )

  const fixturesByGroup = useMemo(() => {
    const grouped: Record<string, Record<RoundName, MatchFixture[]>> = {}

    for (const fixture of filteredFixtures) {
      if (!grouped[fixture.group]) {
        grouped[fixture.group] = {
          'Match Day 1': [],
          'Match Day 2': [],
          'Match Day 3': [],
        }
      }

      grouped[fixture.group][fixture.round as RoundName].push(fixture)
    }

    return grouped
  }, [filteredFixtures])

  const visibleGroups = activeGroup
    ? [activeGroup]
    : groups.filter((group) => fixturesByGroup[group])
  const hostCities = new Set(filteredFixtures.map((fixture) => fixture.city)).size

  const roundBriefings = useMemo(
    () =>
      rounds.map((round) => {
        const roundFixtures = filteredFixtures.filter((fixture) => fixture.round === round)
        const cities = new Set(roundFixtures.map((fixture) => fixture.city)).size
        const closestFixture = [...roundFixtures].sort(
          (a, b) => Math.abs(a.homeWinProb - a.awayWinProb) - Math.abs(b.homeWinProb - b.awayWinProb)
        )[0]
        const strongestFavorite = [...roundFixtures].sort(
          (a, b) =>
            Math.max(b.homeWinProb, b.awayWinProb) - Math.max(a.homeWinProb, a.awayWinProb)
        )[0]
        const closestHome = closestFixture
          ? teamsBySlug[closestFixture.homeTeamSlug]
          : undefined
        const closestAway = closestFixture
          ? teamsBySlug[closestFixture.awayTeamSlug]
          : undefined
        const strongestHome = strongestFavorite
          ? teamsBySlug[strongestFavorite.homeTeamSlug]
          : undefined
        const strongestAway = strongestFavorite
          ? teamsBySlug[strongestFavorite.awayTeamSlug]
          : undefined
        const strongestTeam =
          strongestFavorite && strongestHome && strongestAway
            ? strongestFavorite.homeWinProb >= strongestFavorite.awayWinProb
              ? strongestHome.name
              : strongestAway.name
            : null

        return {
          round,
          fixtures: roundFixtures.length,
          cities,
          tensionLine:
            closestHome && closestAway
              ? `${closestHome.name} vs ${closestAway.name} is the closest model split on the board.`
              : 'The slate stays balanced across the board.',
          leverageLine: strongestTeam
            ? `${strongestTeam} carry the strongest single-match edge of the round.`
            : 'No dominant favorite emerges from the model.',
        }
      }),
    [filteredFixtures, teamsBySlug]
  )

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {(isRefreshing || pullDistance > 0) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-150 pointer-events-none"
          style={{ transform: `translateY(${isRefreshing ? 56 : pullDistance - 16}px)` }}
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-primary/20 shadow-lg ${isRefreshing ? 'animate-pulse' : ''}`}>
            <svg
              className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: isRefreshing ? undefined : `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-label text-xs text-primary font-bold">
              {isRefreshing ? t('refreshing') : t('pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-[12%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-0 right-[10%] h-[320px] w-[320px] rounded-full bg-tertiary/10 blur-[140px]" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

        <div className="relative z-10 mx-auto max-w-[1440px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary-container/20 px-5 py-2 font-label text-xs font-semibold uppercase tracking-widest text-secondary mb-8">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse-slow" />
            {t('narrativeBadge')}
          </span>

          <h1 className="font-headline text-[clamp(3rem,9vw,7.5rem)] leading-[0.9] tracking-wide uppercase mb-6">
            <span className="block text-on-surface">{t('heroTitle1')}</span>
            <span className="block gradient-text">{t('heroTitle2')}</span>
          </h1>

          <p className="mx-auto max-w-3xl text-lg md:text-xl text-on-surface-variant leading-8 mb-10">
            {t('heroDescription')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="primary" size="md">{t('heroBadgeFixtures')}</Badge>
            <Badge variant="outline" size="md">{t('heroBadgeGroups')}</Badge>
            <Badge variant="outline" size="md">{t('heroBadgeCities')}</Badge>
            <Badge variant="outline" size="md">{t('heroBadgeMatchDays')}</Badge>
          </div>

          {/* Watch Mode toggle */}
          {wakeLockSupported && (
            <button
              onClick={watchMode ? stopWatch : startWatch}
              className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                watchMode
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
              }`}
              aria-label={watchMode ? t('watchModeDisable') : t('watchModeEnable')}
            >
              <span>{watchMode ? '📺' : '👁'}</span>
              {watchMode ? t('watchModeOn') : t('watchMode')}
            </button>
          )}
        </div>
      </section>

      <section className="page-container -mt-10 relative z-20 mb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('fixturesOnBoard'), value: filteredFixtures.length.toString(), accent: BRAND.primary },
            { label: t('groupsInFocus'), value: visibleGroups.length.toString(), accent: BRAND.primaryFixed },
            { label: t('hostCitiesLive'), value: hostCities.toString(), accent: BRAND.tertiary },
            { label: t('decisionCadence'), value: activeGroup ? t('oneGroup') : t('twelveGroups'), accent: BRAND.secondary },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`relative glass-panel rounded-2xl border border-white/[0.08] p-5 text-center overflow-hidden animate-fade-in-up opacity-0 stagger-${Math.min(index + 1, 4)}`}
            >
              <NeonAccentBar color={stat.accent} />
              <div className="font-headline text-3xl md:text-4xl tracking-wide" style={{ color: stat.accent }}>
                {stat.value}
              </div>
              <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-container mb-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <SectionHeader className="mb-3">{t('matchdayNarratives')}</SectionHeader>
            <p className="ml-4 max-w-3xl text-on-surface-variant">
              {t('matchdayNarrativesDesc')}
            </p>
          </div>
          <div className="hidden lg:block text-right text-sm text-on-surface-variant">
            {activeGroup ? t('focusedOnGroup', { group: activeGroup }) : t('scanningFullBoard')}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {roundBriefings.map((briefing) => {
            const meta = getRoundMeta(briefing.round, t)

            return (
              <GlassCard key={briefing.round} hover className="h-full p-6">
                <NeonAccentBar color={meta.accent} />
                <div className="font-label text-[10px] uppercase tracking-widest mb-3" style={{ color: meta.accent }}>
                  {meta.eyebrow}
                </div>
                <h2 className="font-headline text-3xl uppercase tracking-wide mb-3">
                  {meta.title}
                </h2>
                <p className="text-on-surface-variant leading-7 mb-5">{meta.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: t('fixtures'), value: briefing.fixtures.toString() },
                    { label: t('cities'), value: briefing.cities.toString() },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
                      <div className="font-headline text-2xl" style={{ color: meta.accent }}>{item.value}</div>
                      <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 text-sm text-on-surface">
                  <p>{briefing.tensionLine}</p>
                  <p className="text-on-surface-variant">{briefing.leverageLine}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <section className="page-container mb-10">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionHeader className="mb-3">{t('groupBoard')}</SectionHeader>
              <p className="ml-4 max-w-3xl text-on-surface-variant">
                {t('groupBoardDesc')}
              </p>
            </div>
            <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              {activeGroup ? t('showingGroupOnly', { group: activeGroup }) : t('showingAllGroups')}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveGroup(null)}
              className={`rounded-full px-4 py-2 font-label text-sm font-semibold uppercase tracking-widest transition-all ${
                activeGroup === null
                  ? 'bg-primary text-on-primary'
                  : 'border border-white/[0.08] bg-white/[0.03] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              {t('allGroups')}
            </button>
            {groups.map((group) => {
              const groupTeams = teamsByGroup[group] ?? []

              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`rounded-full px-4 py-2 font-label text-sm font-semibold uppercase tracking-widest transition-all ${
                    activeGroup === group
                      ? 'bg-primary text-on-primary'
                      : 'border border-white/[0.08] bg-white/[0.03] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                  title={groupTeams.map((team) => team.name).join(', ')}
                >
                  <span className="hidden sm:inline">{groupTeams.map((team) => team.flag).join(' ')}</span>
                  <span className="sm:ml-2">{t('groupBadge', { group })}</span>
                </button>
              )
            })}
          </div>
        </GlassCard>
      </section>

      <section key={refreshKey} className="page-container pb-24 space-y-14">
        {visibleGroups.map((group) => {
          const groupTeams = teamsByGroup[group] ?? []
          const groupNarrative = buildGroupNarrative(group, groupTeams)
          const groupFixtures = fixturesByGroup[group]

          return (
            <div key={group}>
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <Badge variant="primary" size="md">{t('groupBadge', { group })}</Badge>
                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                      {groupTeams.map((team) => `${team.flag} ${team.name}`).join(' · ')}
                    </span>
                  </div>
                  <h2 className="font-headline text-4xl md:text-5xl uppercase tracking-wide mb-3">
                    {groupNarrative.title}
                  </h2>
                  <p className="max-w-3xl text-on-surface-variant leading-7">{groupNarrative.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: t('favorite'), value: `#${Math.min(...groupTeams.map((team) => team.fifaRanking))}` },
                    { label: t('topChemistry'), value: `${Math.max(...groupTeams.map((team) => team.chemistry))}` },
                    { label: t('fixtures'), value: `${Object.values(groupFixtures).flat().length}` },
                    { label: t('cities'), value: `${new Set(Object.values(groupFixtures).flat().map((fixture) => fixture.city)).size}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <div className="font-headline text-2xl text-primary">{item.value}</div>
                      <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                {rounds.map((round) => {
                  const matches = groupFixtures?.[round] ?? []
                  const meta = getRoundMeta(round, t)

                  if (!matches.length) return null

                  return (
                    <div key={round}>
                      <div className="mb-4 flex items-center gap-4">
                        <div
                          className="rounded-full px-4 py-1.5 font-label text-xs font-semibold uppercase tracking-widest"
                          style={{ backgroundColor: `${meta.accent}20`, color: meta.accent }}
                        >
                          {round}
                        </div>
                        <p className="text-sm text-on-surface-variant">{meta.description}</p>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        {matches.map((fixture) => (
                          <MatchCard
                            key={`${fixture.group}-${fixture.round}-${fixture.homeTeamSlug}-${fixture.awayTeamSlug}`}
                            fixture={fixture}
                            teamsBySlug={teamsBySlug}
                            accent={meta.accent}
                            locale={locale}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
