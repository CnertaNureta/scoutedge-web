'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getAllGroups, getTeamBySlug, getTeamsByGroup } from '@/lib/data-service'
import type { MatchFixture, Team } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import ProbabilityBar from '@/components/ui/ProbabilityBar'

const COMMON_TIMEZONES = [
  { label: 'US Eastern (ET)', value: 'America/New_York' },
  { label: 'US Central (CT)', value: 'America/Chicago' },
  { label: 'US Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'Mexico City (CST)', value: 'America/Mexico_City' },
  { label: 'Toronto (ET)', value: 'America/Toronto' },
  { label: 'London (BST)', value: 'Europe/London' },
  { label: 'Paris / Berlin (CEST)', value: 'Europe/Paris' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Beijing / Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'Riyadh (AST)', value: 'Asia/Riyadh' },
]

const groups = getAllGroups()

function formatInTz(utc: string, tz: string, locale: string): { date: string; time: string; tzAbbr: string } {
  const d = new Date(utc)
  const date = d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  })
  const time = d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  })
  const tzAbbr = d.toLocaleTimeString(locale, {
    timeZoneName: 'short',
    timeZone: tz,
  }).split(' ').pop() || ''
  return { date, time, tzAbbr }
}

function MatchCard({ fixture, tz, locale }: { fixture: MatchFixture; tz: string; locale: string }) {
  const home = getTeamBySlug(fixture.homeTeamSlug)
  const away = getTeamBySlug(fixture.awayTeamSlug)
  if (!home || !away) return null

  const { date, time, tzAbbr } = formatInTz(fixture.kickoffUtc, tz, locale)

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-primary font-bold uppercase tracking-widest">{date}</span>
          <span className="text-outline-variant">·</span>
          <span className="font-label text-xs text-on-surface-variant font-bold">{time} {tzAbbr}</span>
        </div>
        <Badge variant="outline" size="sm">Group {fixture.group}</Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
        <Link href={`/teams/${home.slug}`} className="flex items-center gap-2 group min-w-0">
          <span className="text-2xl shrink-0">{home.flag}</span>
          <span className="font-headline text-sm uppercase tracking-tight group-hover:text-primary transition-colors truncate">{home.name}</span>
        </Link>
        <span className="font-headline text-sm font-black text-on-surface-variant">VS</span>
        <Link href={`/teams/${away.slug}`} className="flex items-center gap-2 group min-w-0 flex-row-reverse">
          <span className="text-2xl shrink-0">{away.flag}</span>
          <span className="font-headline text-sm uppercase tracking-tight group-hover:text-primary transition-colors truncate text-right">{away.name}</span>
        </Link>
      </div>
      <ProbabilityBar
        homeProb={fixture.homeWinProb}
        drawProb={fixture.drawProb}
        awayProb={fixture.awayWinProb}
        homeLabel={home.name}
        awayLabel={away.name}
      />
      <div className="mt-2 text-right">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{fixture.venue}, {fixture.city}</span>
      </div>
    </GlassCard>
  )
}

export default function ConverterClient() {
  const locale = useLocale()
  const [tz, setTz] = useState('America/New_York')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected) setTz(detected)
    } catch {}
  }, [])

  const filteredFixtures = useMemo(() => {
    let fixtures = [...MATCH_FIXTURES]
    if (filterGroup) fixtures = fixtures.filter((f) => f.group === filterGroup)
    return fixtures.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
  }, [filterGroup])

  // Group by local date
  const byDate = useMemo(() => {
    const map: Record<string, MatchFixture[]> = {}
    for (const f of filteredFixtures) {
      const { date } = formatInTz(f.kickoffUtc, tz, locale)
      if (!map[date]) map[date] = []
      map[date].push(f)
    }
    return map
  }, [filteredFixtures, tz, locale])

  const isCustomTz = !COMMON_TIMEZONES.some((t) => t.value === tz)

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="primary" size="md">Time Zone Converter</Badge>
          <h1 className="font-headline text-5xl md:text-7xl tracking-wide uppercase mt-4 mb-6">
            Match Schedule<br />
            <span className="gradient-text">Your Time</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            All 72 group-stage matches converted to your local time zone.
            Never miss a kick-off.
          </p>
        </div>
      </section>

      {/* Controls */}
      <section className="max-w-[1440px] mx-auto px-6 mb-8">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            {/* Timezone selector */}
            <div className="flex-1">
              <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-semibold mb-2 block">
                Your Time Zone
              </label>
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-primary/50"
              >
                {isCustomTz && <option value={tz}>{tz} (detected)</option>}
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {/* Group filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterGroup(null)}
                className={`px-3 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
                  filterGroup === null
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/10'
                }`}
              >
                All
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g)}
                  className={`px-3 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
                    filterGroup === g
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Matches by date */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {Object.entries(byDate).map(([date, fixtures]) => (
          <div key={date} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 rounded-full bg-primary shrink-0" />
              <h2 className="font-headline text-xl uppercase tracking-wide">{date}</h2>
              <span className="font-label text-xs text-on-surface-variant">{fixtures.length} match{fixtures.length > 1 ? 'es' : ''}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {fixtures.map((f) => (
                <MatchCard key={`${f.homeTeamSlug}-${f.awayTeamSlug}`} fixture={f} tz={tz} locale={locale} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
