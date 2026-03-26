'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { KNOCKOUT_FIXTURES, getKnockoutTeamLabel, KNOCKOUT_ROUNDS } from '@/data/knockout-fixtures'
import { getAllTeams } from '@/lib/data-service'
import type { MatchFixture } from '@/lib/types'

const ALL_FIXTURES: MatchFixture[] = [...MATCH_FIXTURES, ...KNOCKOUT_FIXTURES]

type Phase = 'all' | 'group' | 'knockout'

const PHASE_COLORS: Record<string, string> = {
  'Match Day 1': '#a0d494',
  'Match Day 2': '#bcf0ae',
  'Match Day 3': '#a0d494',
  'Round of 32': '#e9c400',
  'Round of 16': '#ffb4aa',
  Quarterfinal: '#ff8a65',
  Semifinal: '#ce93d8',
  'Third Place': '#90caf9',
  Final: '#ffd700',
}

function getTeamInfo(slug: string) {
  if (slug.startsWith('tbd-')) {
    return { name: getKnockoutTeamLabel(slug), flag: '🏳️' }
  }
  const teams = getAllTeams()
  const team = teams.find((t) => t.slug === slug)
  return team ? { name: team.name, flag: team.flag } : { name: slug, flag: '🏳️' }
}

function formatDate(utc: string) {
  const d = new Date(utc)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(utc: string) {
  const d = new Date(utc)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function MatchCard({ match }: { match: MatchFixture }) {
  const home = getTeamInfo(match.homeTeamSlug)
  const away = getTeamInfo(match.awayTeamSlug)
  const color = PHASE_COLORS[match.round] || '#a0d494'
  const isKnockout = match.group === ''
  const maxProb = Math.max(match.homeWinProb, match.awayWinProb, match.drawProb)

  return (
    <div className="relative glass-panel rounded-xl border border-white/[0.06] p-4 overflow-hidden group hover:border-white/15 transition-all">
      <NeonAccentBar color={color} />

      {/* Round + Venue */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {match.round}
          {match.group && ` · Group ${match.group}`}
        </span>
        <span className="text-[10px] text-on-surface-variant truncate ml-2">{match.city}</span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xl">{home.flag}</span>
            <span className={`font-label text-sm font-semibold ${isKnockout ? 'text-on-surface-variant' : 'text-on-surface'}`}>
              {home.name}
            </span>
          </div>
          {!isKnockout && (
            <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${match.homeWinProb * 100}%`,
                  background: match.homeWinProb === maxProb ? color : 'rgba(255,255,255,0.15)',
                }}
              />
            </div>
          )}
        </div>

        <div className="px-3 text-center shrink-0">
          <div className="font-mono text-xs text-on-surface-variant font-bold">VS</div>
        </div>

        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className={`font-label text-sm font-semibold ${isKnockout ? 'text-on-surface-variant' : 'text-on-surface'}`}>
              {away.name}
            </span>
            <span className="text-xl">{away.flag}</span>
          </div>
          {!isKnockout && (
            <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full ml-auto transition-all"
                style={{
                  width: `${match.awayWinProb * 100}%`,
                  background: match.awayWinProb === maxProb ? color : 'rgba(255,255,255,0.15)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Time + Venue */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-on-surface-variant">
        <span>{formatTime(match.kickoffUtc)}</span>
        <span className="truncate mx-2">{match.venue}</span>
      </div>
    </div>
  )
}

export default function ScheduleClient() {
  const [phase, setPhase] = useState<Phase>('all')
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  // Group fixtures by date
  const grouped = useMemo(() => {
    let fixtures = ALL_FIXTURES
    if (phase === 'group') fixtures = MATCH_FIXTURES
    if (phase === 'knockout') fixtures = KNOCKOUT_FIXTURES
    if (selectedRound) fixtures = fixtures.filter((f) => f.round === selectedRound)

    const byDate: Record<string, MatchFixture[]> = {}
    for (const f of fixtures) {
      const dateKey = formatDate(f.kickoffUtc)
      if (!byDate[dateKey]) byDate[dateKey] = []
      byDate[dateKey].push(f)
    }

    return Object.entries(byDate).sort(
      ([, a], [, b]) => new Date(a[0].kickoffUtc).getTime() - new Date(b[0].kickoffUtc).getTime()
    )
  }, [phase, selectedRound])

  const totalMatches = phase === 'group' ? 72 : phase === 'knockout' ? 32 : 104
  const matchDates = grouped.length

  const allRounds = useMemo(() => {
    const rounds = new Set<string>()
    ALL_FIXTURES.forEach((f) => rounds.add(f.round))
    return Array.from(rounds)
  }, [])

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Matches', value: totalMatches.toString(), accent: '#a0d494' },
          { label: 'Match Days', value: matchDates.toString(), accent: '#e9c400' },
          { label: 'Host Cities', value: '16', accent: '#ffb4aa' },
        ].map((stat) => (
          <div key={stat.label} className="relative glass-panel p-4 rounded-2xl border border-white/[0.08] text-center overflow-hidden group">
            <NeonAccentBar color={stat.accent} />
            <div className="font-headline text-2xl md:text-3xl" style={{ color: stat.accent }}>{stat.value}</div>
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Phase Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'group', 'knockout'] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPhase(p); setSelectedRound(null); }}
            className={`px-5 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
              phase === p ? 'bg-primary text-on-primary' : 'bg-white/[0.05] text-on-surface-variant hover:bg-white/[0.08]'
            }`}
          >
            {p === 'all' ? `All 104` : p === 'group' ? '🏟️ Group Stage' : '🏆 Knockout'}
          </button>
        ))}
      </div>

      {/* Round Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setSelectedRound(null)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider transition-all ${
            !selectedRound ? 'bg-primary/20 text-primary' : 'bg-white/[0.04] text-on-surface-variant hover:bg-white/[0.06]'
          }`}
        >
          All Rounds
        </button>
        {allRounds
          .filter((r) => {
            if (phase === 'group') return r.startsWith('Match Day')
            if (phase === 'knockout') return !r.startsWith('Match Day')
            return true
          })
          .map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round === selectedRound ? null : round)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider transition-all ${
                selectedRound === round ? 'text-on-primary' : 'text-on-surface-variant hover:bg-white/[0.06]'
              }`}
              style={
                selectedRound === round
                  ? { background: PHASE_COLORS[round] || '#a0d494' }
                  : { background: `${PHASE_COLORS[round] || '#a0d494'}15` }
              }
            >
              {round}
            </button>
          ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

        {grouped.map(([date, matches]) => {
          const color = PHASE_COLORS[matches[0].round] || '#a0d494'
          return (
            <div key={date} className="relative mb-10">
              {/* Date marker */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="relative z-10 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${color}25`, border: `2px solid ${color}` }}
                >
                  <span className="font-mono text-[10px] md:text-xs font-bold" style={{ color }}>
                    {matches.length}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-lg md:text-xl uppercase tracking-wide text-on-surface">{date}</h3>
                  <span className="text-xs text-on-surface-variant">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>

              {/* Match cards for this date */}
              <div className="ml-12 md:ml-16 grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.map((match, i) => (
                  <MatchCard key={`${match.homeTeamSlug}-${match.awayTeamSlug}-${i}`} match={match} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <GlassCard className="p-6 mt-8">
        <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-4">Tournament Phases</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PHASE_COLORS).map(([round, color]) => (
            <span
              key={round}
              className="px-3 py-1.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider"
              style={{ background: `${color}20`, color }}
            >
              {round}
            </span>
          ))}
        </div>
      </GlassCard>
    </>
  )
}
