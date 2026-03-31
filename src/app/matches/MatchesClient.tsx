'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import {
  getAllGroups,
  getAllVenues,
  getJetLagTier,
  getTeamBySlug,
  getTeamTimezone,
  getTeamsByGroup,
} from '@/lib/data-service'
import type { MatchFixture, Team, Venue } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import ProbabilityBar from '@/components/ui/ProbabilityBar'
import SectionHeader from '@/components/ui/SectionHeader'

const groups = getAllGroups()
const rounds = ['Match Day 1', 'Match Day 2', 'Match Day 3'] as const

type RoundName = typeof rounds[number]
type JetLagTier = 'none' | 'moderate' | 'significant' | 'extreme'

const ROUND_META: Record<RoundName, { accent: string; eyebrow: string; title: string; description: string }> = {
  'Match Day 1': {
    accent: '#a0d494',
    eyebrow: 'Opening pulse',
    title: 'First reads, first leverage',
    description: 'The opening wave sets the emotional pace of every group before points tables harden.',
  },
  'Match Day 2': {
    accent: '#e9c400',
    eyebrow: 'Separation week',
    title: 'Margins widen quickly',
    description: 'Second fixtures decide who can rotate, who must chase, and where the bracket starts to breathe.',
  },
  'Match Day 3': {
    accent: '#ffb4aa',
    eyebrow: 'Decision night',
    title: 'Qualification pressure peaks',
    description: 'The final group games compress everything into ninety minutes: survival, seeding, and volatility.',
  },
}

const venueLookup = new Map(getAllVenues().map((venue) => [venue.name, venue]))

const jetLagSeverity: Record<JetLagTier, number> = {
  none: 0,
  moderate: 1,
  significant: 2,
  extreme: 3,
}

const jetLagCopy: Record<JetLagTier, string> = {
  none: 'minimal adjustment',
  moderate: 'manageable adjustment',
  significant: 'high-travel adjustment',
  extreme: 'major jet-lag risk',
}

function formatKickoff(utc: string, timeZone = 'America/New_York') {
  const kickoff = new Date(utc)

  return {
    date: kickoff.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone,
    }),
    time: kickoff.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }),
  }
}

function getConfidenceLabel(fixture: MatchFixture) {
  const strongestEdge = Math.max(fixture.homeWinProb, fixture.awayWinProb)

  if (strongestEdge >= 0.64) return 'Heavy model edge'
  if (strongestEdge >= 0.54) return 'Clear lean'
  return 'Balanced read'
}

function getPressureLabel(round: RoundName) {
  if (round === 'Match Day 1') return 'Opening leverage'
  if (round === 'Match Day 2') return 'Table-shaping ninety'
  return 'Qualification pressure'
}

function getTravelContext(home: Team, away: Team) {
  const teamContexts = [home, away]
    .map((team) => ({
      team,
      tier: getJetLagTier(team.slug) as JetLagTier | undefined,
      timezone: getTeamTimezone(team.slug),
    }))
    .filter((entry) => entry.tier)

  if (teamContexts.length === 0) {
    return 'Travel load is relatively neutral for both squads.'
  }

  const highest = teamContexts.reduce((current, entry) => (
    jetLagSeverity[entry.tier!] > jetLagSeverity[current.tier!] ? entry : current
  ))

  const impactedTeams = teamContexts
    .filter((entry) => entry.tier === highest.tier)
    .map((entry) => entry.team.name)
    .join(' and ')

  const adjustmentHours = highest.timezone?.adjustmentHours

  if (adjustmentHours && adjustmentHours > 0) {
    return `${impactedTeams} arrive with ${adjustmentHours}-hour body-clock shift and ${jetLagCopy[highest.tier!]}.`
  }

  return `${impactedTeams} carry ${jetLagCopy[highest.tier!]} into kickoff.`
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
  const favorite = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking)[0]
  const chemistryLeader = [...teams].sort((a, b) => b.chemistry - a.chemistry)[0]
  const rankingSpread = Math.max(...teams.map((team) => team.fifaRanking)) - Math.min(...teams.map((team) => team.fifaRanking))

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
}: {
  team: Team
  role: 'home' | 'away'
  probability: number
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
            #{team.fifaRanking} FIFA rank · {team.confederation}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`font-label text-xs font-semibold uppercase tracking-widest ${role === 'home' ? 'text-primary' : 'text-secondary'}`}>
          {Math.round(probability * 100)}%
        </div>
        <div className="text-[11px] text-on-surface-variant">Chemistry {team.chemistry}</div>
      </div>
    </Link>
  )
}

function MatchCard({ fixture, accent }: { fixture: MatchFixture; accent: string }) {
  const home = getTeamBySlug(fixture.homeTeamSlug)
  const away = getTeamBySlug(fixture.awayTeamSlug)

  if (!home || !away) return null

  const venue = venueLookup.get(fixture.venue)
  const kickoff = formatKickoff(fixture.kickoffUtc, venue?.timezone)
  const story = buildMatchStory(fixture, home, away, venue)
  const venueLine = venue
    ? `${venue.metro}, ${venue.country} · ${venue.capacity.toLocaleString('en-US')} seats`
    : `${fixture.venue}, ${fixture.city}`
  const climateLine = venue
    ? `${venue.roofType} roof · ${venue.climate.description}`
    : 'Venue detail unavailable'

  return (
    <GlassCard hover className="h-full p-5 md:p-6">
      <NeonAccentBar color={accent} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="sm">Group {fixture.group}</Badge>
          <Badge variant="outline" size="sm">{fixture.round}</Badge>
        </div>
        <span
          className="rounded-full px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {getConfidenceLabel(fixture)}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <TeamRow team={home} role="home" probability={fixture.homeWinProb} />
        <TeamRow team={away} role="away" probability={fixture.awayWinProb} />
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
          { label: 'Kickoff', value: `${kickoff.date} · ${kickoff.time}` },
          { label: 'Venue', value: venueLine },
          { label: 'Narrative', value: getPressureLabel(fixture.round as RoundName) },
          { label: 'Travel watch', value: getTravelContext(home, away) },
          { label: 'Climate', value: climateLine },
          { label: 'Key insight', value: `${home.name}: ${home.keyInsight}` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
            <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
              {item.label}
            </div>
            <div className="text-sm text-on-surface leading-6">{item.value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

export default function MatchesClient() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const filteredFixtures = useMemo(
    () => (activeGroup ? MATCH_FIXTURES.filter((fixture) => fixture.group === activeGroup) : MATCH_FIXTURES),
    [activeGroup],
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

  const visibleGroups = activeGroup ? [activeGroup] : groups.filter((group) => fixturesByGroup[group])
  const hostCities = new Set(filteredFixtures.map((fixture) => fixture.city)).size

  const roundBriefings = useMemo(() => (
    rounds.map((round) => {
      const fixtures = filteredFixtures.filter((fixture) => fixture.round === round)
      const cities = new Set(fixtures.map((fixture) => fixture.city)).size
      const closestFixture = [...fixtures].sort((a, b) => (
        Math.abs(a.homeWinProb - a.awayWinProb) - Math.abs(b.homeWinProb - b.awayWinProb)
      ))[0]
      const strongestFavorite = [...fixtures].sort((a, b) => (
        Math.max(b.homeWinProb, b.awayWinProb) - Math.max(a.homeWinProb, a.awayWinProb)
      ))[0]
      const closestHome = closestFixture ? getTeamBySlug(closestFixture.homeTeamSlug) : undefined
      const closestAway = closestFixture ? getTeamBySlug(closestFixture.awayTeamSlug) : undefined
      const strongestHome = strongestFavorite ? getTeamBySlug(strongestFavorite.homeTeamSlug) : undefined
      const strongestAway = strongestFavorite ? getTeamBySlug(strongestFavorite.awayTeamSlug) : undefined
      const strongestTeam = strongestFavorite && strongestHome && strongestAway
        ? (strongestFavorite.homeWinProb >= strongestFavorite.awayWinProb ? strongestHome.name : strongestAway.name)
        : null

      return {
        round,
        fixtures: fixtures.length,
        cities,
        tensionLine: closestHome && closestAway
          ? `${closestHome.name} vs ${closestAway.name} is the closest model split on the board.`
          : 'The slate stays balanced across the board.',
        leverageLine: strongestTeam
          ? `${strongestTeam} carry the strongest single-match edge of the round.`
          : 'No dominant favorite emerges from the model.',
      }
    })
  ), [filteredFixtures])

  return (
    <>
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-[12%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-0 right-[10%] h-[320px] w-[320px] rounded-full bg-[#e9c400]/10 blur-[140px]" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />
        <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

        <div className="relative z-10 mx-auto max-w-[1440px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary-container/20 px-5 py-2 font-label text-xs font-semibold uppercase tracking-widest text-secondary mb-8">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse-slow" />
            Narrative-first match board
          </span>

          <h1 className="font-headline text-[clamp(3rem,9vw,7.5rem)] leading-[0.9] tracking-wide uppercase mb-6">
            <span className="block text-on-surface">World Cup 2026</span>
            <span className="block gradient-text">Group-Stage Stories</span>
          </h1>

          <p className="mx-auto max-w-3xl text-lg md:text-xl text-on-surface-variant leading-8 mb-10">
            ScoutEdge&apos;s match board now leads with context instead of clutter: where the leverage sits,
            which venues change the conditions, and how probability, travel, and chemistry reshape every group.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="primary" size="md">72 fixtures</Badge>
            <Badge variant="outline" size="md">12 groups</Badge>
            <Badge variant="outline" size="md">16 host cities</Badge>
            <Badge variant="outline" size="md">3 match days</Badge>
          </div>
        </div>
      </section>

      <section className="page-container -mt-10 relative z-20 mb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Fixtures on board', value: filteredFixtures.length.toString(), accent: '#a0d494' },
            { label: 'Groups in focus', value: visibleGroups.length.toString(), accent: '#bcf0ae' },
            { label: 'Host cities live', value: hostCities.toString(), accent: '#e9c400' },
            { label: 'Decision cadence', value: activeGroup ? '1 group' : '12 groups', accent: '#ffb4aa' },
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
            <SectionHeader className="mb-3">Matchday Narratives</SectionHeader>
            <p className="ml-4 max-w-3xl text-on-surface-variant">
              Read the tournament by rhythm: first impressions, second-match separation, then final-day pressure.
            </p>
          </div>
          <div className="hidden lg:block text-right text-sm text-on-surface-variant">
            {activeGroup ? `Focused on Group ${activeGroup}` : 'Scanning the full group-stage board'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {roundBriefings.map((briefing) => {
            const meta = ROUND_META[briefing.round]

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
                    { label: 'Fixtures', value: briefing.fixtures.toString() },
                    { label: 'Cities', value: briefing.cities.toString() },
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
              <SectionHeader className="mb-3">Group Board</SectionHeader>
              <p className="ml-4 max-w-3xl text-on-surface-variant">
                Filters stay available, but the board is framed as a reading surface for leverage, venue context,
                travel load, and chemistry rather than a bare schedule table.
              </p>
            </div>
            <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              {activeGroup ? `Showing Group ${activeGroup} only` : 'Showing all groups'}
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
              All Groups
            </button>
            {groups.map((group) => {
              const teams = getTeamsByGroup(group)

              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`rounded-full px-4 py-2 font-label text-sm font-semibold uppercase tracking-widest transition-all ${
                    activeGroup === group
                      ? 'bg-primary text-on-primary'
                      : 'border border-white/[0.08] bg-white/[0.03] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                  title={teams.map((team) => team.name).join(', ')}
                >
                  <span className="hidden sm:inline">{teams.map((team) => team.flag).join(' ')}</span>
                  <span className="sm:ml-2">Group {group}</span>
                </button>
              )
            })}
          </div>
        </GlassCard>
      </section>

      <section className="page-container pb-24 space-y-14">
        {visibleGroups.map((group) => {
          const groupTeams = getTeamsByGroup(group)
          const groupNarrative = buildGroupNarrative(group, groupTeams)
          const fixtures = fixturesByGroup[group]

          return (
            <div key={group}>
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <Badge variant="primary" size="md">Group {group}</Badge>
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
                    { label: 'Favorite', value: `#${Math.min(...groupTeams.map((team) => team.fifaRanking))}` },
                    { label: 'Top chemistry', value: `${Math.max(...groupTeams.map((team) => team.chemistry))}` },
                    { label: 'Fixtures', value: `${Object.values(fixtures).flat().length}` },
                    { label: 'Cities', value: `${new Set(Object.values(fixtures).flat().map((fixture) => fixture.city)).size}` },
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
                  const matches = fixtures[round]
                  const meta = ROUND_META[round]

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
                            accent={meta.accent}
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
