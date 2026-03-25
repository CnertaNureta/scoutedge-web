'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getAllGroups, getTeamBySlug, getTeamsByGroup } from '@/lib/data-service'
import type { MatchFixture, Team } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import ProbabilityBar from '@/components/ui/ProbabilityBar'

const groups = getAllGroups()
const rounds = ['Match Day 1', 'Match Day 2', 'Match Day 3'] as const

function formatKickoff(utc: string): { date: string; time: string } {
  const d = new Date(utc)
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  })
  return { date, time }
}

function TeamBadge({ team, align }: { team: Team; align: 'left' | 'right' }) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="flex items-center gap-2 group min-w-0"
      style={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}
    >
      <span className="text-3xl shrink-0">{team.flag}</span>
      <span
        className={`font-headline text-sm md:text-base font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        {team.name}
      </span>
    </Link>
  )
}

function MatchCard({ fixture }: { fixture: MatchFixture }) {
  const home = getTeamBySlug(fixture.homeTeamSlug)
  const away = getTeamBySlug(fixture.awayTeamSlug)
  if (!home || !away) return null

  const { date, time } = formatKickoff(fixture.kickoffUtc)

  return (
    <GlassCard className="p-5 md:p-6">
      {/* Date & Venue header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-primary font-bold uppercase tracking-widest">
            {date}
          </span>
          <span className="text-outline-variant">·</span>
          <span className="font-label text-xs text-on-surface-variant font-bold">
            {time}
          </span>
        </div>
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest truncate max-w-[200px]">
          {fixture.venue}, {fixture.city}
        </span>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <TeamBadge team={home} align="left" />
        <span className="font-headline text-lg font-black text-on-surface-variant tracking-tighter">
          VS
        </span>
        <TeamBadge team={away} align="right" />
      </div>

      {/* Probability bar */}
      <ProbabilityBar
        homeProb={fixture.homeWinProb}
        drawProb={fixture.drawProb}
        awayProb={fixture.awayWinProb}
        homeLabel={home.name}
        awayLabel={away.name}
      />
    </GlassCard>
  )
}

export default function MatchesClient() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const filteredFixtures = activeGroup
    ? MATCH_FIXTURES.filter((f) => f.group === activeGroup)
    : MATCH_FIXTURES

  // Group fixtures by group letter, then by round
  const fixturesByGroup: Record<string, Record<string, MatchFixture[]>> = {}
  for (const f of filteredFixtures) {
    if (!fixturesByGroup[f.group]) fixturesByGroup[f.group] = {}
    if (!fixturesByGroup[f.group][f.round]) fixturesByGroup[f.group][f.round] = []
    fixturesByGroup[f.group][f.round].push(f)
  }

  const sortedGroups = Object.keys(fixturesByGroup).sort()

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="primary" size="md">World Cup 2026</Badge>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter uppercase mt-4 mb-6">
            Group-Stage<br />
            <span className="text-primary">Matches</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            All 72 fixtures across 12 groups with AI-powered win probability predictions,
            venues, and kick-off times.
          </p>
        </div>
      </section>

      {/* Group Filter Tabs */}
      <section className="max-w-[1440px] mx-auto px-6 mb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-4 py-2 rounded-full font-label text-sm font-bold uppercase tracking-widest transition-all duration-200 ${
              activeGroup === null
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/10 hover:border-outline-variant/30'
            }`}
          >
            All Groups
          </button>
          {groups.map((g) => {
            const groupTeams = getTeamsByGroup(g)
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-4 py-2 rounded-full font-label text-sm font-bold uppercase tracking-widest transition-all duration-200 ${
                  activeGroup === g
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/10 hover:border-outline-variant/30'
                }`}
                title={groupTeams.map((t) => t.name).join(', ')}
              >
                <span className="hidden sm:inline">{groupTeams.map((t) => t.flag).join(' ')}</span>
                <span className="sm:ml-2">Group {g}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Fixtures by Group */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {sortedGroups.map((group) => {
          const groupTeams = getTeamsByGroup(group)
          return (
            <div key={group} className="mb-14">
              {/* Group Header */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-headline text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
                  <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
                    Group {group}
                  </span>
                </h2>
                <span className="text-on-surface-variant text-sm">
                  {groupTeams.map((t) => `${t.flag} ${t.name}`).join('  ·  ')}
                </span>
              </div>

              {/* Match Days */}
              {rounds.map((round) => {
                const matches = fixturesByGroup[group]?.[round]
                if (!matches || matches.length === 0) return null
                return (
                  <div key={round} className="mb-6">
                    <h3 className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-3 ml-1">
                      {round}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {matches.map((fixture) => (
                        <MatchCard
                          key={`${fixture.homeTeamSlug}-${fixture.awayTeamSlug}`}
                          fixture={fixture}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </section>
    </>
  )
}
