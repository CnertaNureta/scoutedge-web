'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'

/* ─── Types ───────────────────────────────────────────────────── */

interface TeamData {
  slug: string
  name: string
  flag: string
  group: string
}

interface TrackerState {
  teams: Record<string, number[]>
  specials: number[]
}

type SortMode = 'group' | 'completion' | 'alpha'

/* ─── Constants ───────────────────────────────────────────────── */

const STORAGE_KEY = 'kickoracle-sticker-tracker'
const STICKERS_PER_TEAM = 13
const TOTAL_TEAM_STICKERS = 624
const TOTAL_SPECIAL_STICKERS = 76
const TOTAL_STICKERS = TOTAL_TEAM_STICKERS + TOTAL_SPECIAL_STICKERS

const SPECIAL_CATEGORIES = [
  { id: 'logos', start: 1, count: 10 },
  { id: 'hostCities', start: 11, count: 16 },
  { id: 'stadiums', start: 27, count: 16 },
  { id: 'legends', start: 43, count: 20 },
  { id: 'trophyMascot', start: 63, count: 8 },
  { id: 'fairPlay', start: 71, count: 6 },
] as const

const GROUP_COLORS: Record<string, string> = {
  A: '#a0d494',
  B: '#ffb4aa',
  C: '#e9c400',
  D: '#82b1ff',
  E: '#ea80fc',
  F: '#ff8a65',
  G: '#4dd0e1',
  H: '#c5e1a5',
  I: '#f48fb1',
  J: '#b39ddb',
  K: '#80deea',
  L: '#ffcc80',
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function createEmptyState(): TrackerState {
  return { teams: {}, specials: [] }
}

function loadState(): TrackerState {
  if (typeof window === 'undefined') return createEmptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyState()
    const parsed = JSON.parse(raw) as TrackerState
    if (parsed && typeof parsed.teams === 'object' && Array.isArray(parsed.specials)) {
      return parsed
    }
    return createEmptyState()
  } catch {
    return createEmptyState()
  }
}

function saveState(state: TrackerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function getTeamCollected(state: TrackerState, slug: string): number[] {
  return state.teams[slug] ?? []
}

/* ─── Progress Ring (pure CSS + SVG) ──────────────────────────── */

function ProgressRing({
  percentage,
  size = 160,
  strokeWidth = 10,
  completeLabel,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  completeLabel: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a0d494" />
            <stop offset="50%" stopColor="#e9c400" />
            <stop offset="100%" stopColor="#ffb4aa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-on-surface tabular-nums">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">{completeLabel}</span>
      </div>
    </div>
  )
}

/* ─── Confetti burst on collect ───────────────────────────────── */

function CollectBurst({ active, color }: { active: boolean; color: string }) {
  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-cheer-burst"
          style={{
            background: color,
            '--burst-angle': `${i * 60}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/* ─── Individual Sticker Slot ─────────────────────────────────── */

function StickerSlot({
  index,
  collected,
  teamColor,
  teamSlug,
  onToggle,
  ariaLabel,
}: {
  index: number
  collected: boolean
  teamColor: string
  teamSlug: string
  onToggle: (slug: string, index: number) => void
  ariaLabel: string
}) {
  const [bursting, setBursting] = useState(false)
  const prevCollected = useRef(collected)

  useEffect(() => {
    if (collected && !prevCollected.current) {
      setBursting(true)
      const t = setTimeout(() => setBursting(false), 600)
      return () => clearTimeout(t)
    }
    prevCollected.current = collected
  }, [collected])

  return (
    <button
      type="button"
      onClick={() => onToggle(teamSlug, index)}
      className={`
        relative w-10 h-10 rounded-lg text-xs font-mono font-bold
        transition-all duration-200 ease-out
        ${collected
          ? 'scale-100 shadow-lg text-background'
          : 'bg-white/[0.04] border border-white/[0.08] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.08]'
        }
      `}
      style={collected ? {
        background: teamColor,
        boxShadow: `0 0 12px ${teamColor}40`,
      } : undefined}
      aria-label={ariaLabel}
    >
      {index + 1}
      <CollectBurst active={bursting} color={teamColor} />
    </button>
  )
}

/* ─── Special Sticker Slot ────────────────────────────────────── */

function SpecialSlot({
  index,
  collected,
  onToggle,
  ariaLabel,
}: {
  index: number
  collected: boolean
  onToggle: (index: number) => void
  ariaLabel: string
}) {
  const [bursting, setBursting] = useState(false)
  const prevCollected = useRef(collected)

  useEffect(() => {
    if (collected && !prevCollected.current) {
      setBursting(true)
      const t = setTimeout(() => setBursting(false), 600)
      return () => clearTimeout(t)
    }
    prevCollected.current = collected
  }, [collected])

  return (
    <button
      type="button"
      onClick={() => onToggle(index)}
      className={`
        relative w-10 h-10 rounded-lg text-xs font-mono font-bold
        transition-all duration-200 ease-out
        ${collected
          ? 'scale-100 shadow-lg text-background'
          : 'bg-white/[0.04] border border-white/[0.08] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.08]'
        }
      `}
      style={collected ? {
        background: 'linear-gradient(135deg, #e9c400, #ffb4aa)',
        boxShadow: '0 0 12px rgba(233,196,0,0.3)',
      } : undefined}
      aria-label={ariaLabel}
    >
      S{index + 1}
      <CollectBurst active={bursting} color="#e9c400" />
    </button>
  )
}

/* ─── Team Card ───────────────────────────────────────────────── */

function TeamCard({
  team,
  collected,
  groupColor,
  expanded,
  onToggleExpand,
  onToggleSticker,
  onMarkAll,
  onClearAll,
  labels,
}: {
  team: TeamData
  collected: number[]
  groupColor: string
  expanded: boolean
  onToggleExpand: (slug: string) => void
  onToggleSticker: (slug: string, index: number) => void
  onMarkAll: (slug: string) => void
  onClearAll: (slug: string) => void
  labels: {
    done: string
    markAll: string
    clearAll: string
    stickerLabel: (n: number, collected: boolean) => string
  }
}) {
  const count = collected.length
  const pct = (count / STICKERS_PER_TEAM) * 100
  const isComplete = count === STICKERS_PER_TEAM

  return (
    <div
      className={`
        rounded-xl border transition-all duration-300 overflow-hidden
        ${expanded
          ? 'border-white/20 bg-surface-container-high/60 col-span-full md:col-span-2 lg:col-span-2'
          : 'border-white/[0.08] bg-surface-container/40 hover:border-white/15 hover:bg-surface-container-high/40'
        }
        ${isComplete && !expanded ? 'ring-1 ring-primary/30' : ''}
      `}
    >
      {/* Card header — always clickable */}
      <button
        type="button"
        onClick={() => onToggleExpand(team.slug)}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left group"
      >
        <span className="text-2xl shrink-0" role="img" aria-label={team.name}>
          {team.flag}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-headline text-sm uppercase tracking-tight text-on-surface truncate">
              {team.name}
            </span>
            {isComplete && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                {labels.done}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isComplete
                    ? 'linear-gradient(90deg, #a0d494, #bcf0ae)'
                    : groupColor,
                }}
              />
            </div>
            <span className="font-mono text-xs text-on-surface-variant tabular-nums shrink-0">
              {count}/{STICKERS_PER_TEAM}
            </span>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded sticker grid */}
      {expanded && (
        <div className="px-3 md:px-4 pb-4 animate-fade-in-up" style={{ animationDuration: '0.25s' }}>
          <div className="h-px bg-white/[0.06] mb-3" />

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => onMarkAll(team.slug)}
              className="text-[11px] font-label font-bold uppercase tracking-wider px-3 py-1 rounded-lg
                         bg-primary/10 text-primary border border-primary/20
                         hover:bg-primary/20 transition-colors"
            >
              {labels.markAll}
            </button>
            <button
              type="button"
              onClick={() => onClearAll(team.slug)}
              className="text-[11px] font-label font-bold uppercase tracking-wider px-3 py-1 rounded-lg
                         bg-white/[0.04] text-on-surface-variant border border-white/[0.08]
                         hover:bg-white/[0.08] transition-colors"
            >
              {labels.clearAll}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: STICKERS_PER_TEAM }).map((_, i) => (
              <StickerSlot
                key={i}
                index={i}
                collected={collected.includes(i)}
                teamColor={groupColor}
                teamSlug={team.slug}
                onToggle={onToggleSticker}
                ariaLabel={labels.stickerLabel(i + 1, collected.includes(i))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Tracker Component ──────────────────────────────────── */

export default function StickerTracker({ teams }: { teams: TeamData[] }) {
  const t = useTranslations('stickerTracker')
  const [state, setState] = useState<TrackerState>(createEmptyState)
  const [hydrated, setHydrated] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('group')
  const [showSpecials, setShowSpecials] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Hydrate from localStorage
  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  // Persist on every change (skip initial empty state)
  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2500)
    return () => clearTimeout(t)
  }, [toastMsg])

  /* ─── State mutators (immutable) ─── */

  const toggleTeamSticker = useCallback((slug: string, index: number) => {
    setState((prev) => {
      const current = prev.teams[slug] ?? []
      const next = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index].sort((a, b) => a - b)
      return { ...prev, teams: { ...prev.teams, [slug]: next } }
    })
  }, [])

  const markAllForTeam = useCallback((slug: string) => {
    setState((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [slug]: Array.from({ length: STICKERS_PER_TEAM }, (_, i) => i),
      },
    }))
  }, [])

  const clearAllForTeam = useCallback((slug: string) => {
    setState((prev) => ({
      ...prev,
      teams: { ...prev.teams, [slug]: [] },
    }))
  }, [])

  const toggleSpecialSticker = useCallback((index: number) => {
    setState((prev) => {
      const next = prev.specials.includes(index)
        ? prev.specials.filter((i) => i !== index)
        : [...prev.specials, index].sort((a, b) => a - b)
      return { ...prev, specials: next }
    })
  }, [])

  const toggleExpandTeam = useCallback((slug: string) => {
    setExpandedTeam((prev) => (prev === slug ? null : slug))
  }, [])

  /* ─── Derived stats ─── */

  const stats = useMemo(() => {
    let teamCollected = 0
    let duplicates = 0
    for (const arr of Object.values(state.teams)) {
      teamCollected += arr.length
      // Count entries beyond unique max — a simple heuristic
      const unique = new Set(arr)
      duplicates += arr.length - unique.size
    }
    const specialCollected = state.specials.length
    const totalOwned = teamCollected + specialCollected
    const pct = TOTAL_STICKERS > 0 ? (totalOwned / TOTAL_STICKERS) * 100 : 0
    return { totalOwned, totalPossible: TOTAL_STICKERS, pct, duplicates, teamCollected, specialCollected }
  }, [state])

  /* ─── Filtered & sorted teams ─── */

  const sortedTeams = useMemo(() => {
    let filtered = teams
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = teams.filter(
        (t) => t.name.toLowerCase().includes(q) || t.group.toLowerCase() === q
      )
    }

    const sorted = [...filtered]
    switch (sortMode) {
      case 'group':
        sorted.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
        break
      case 'completion':
        sorted.sort((a, b) => {
          const aPct = (getTeamCollected(state, a.slug).length / STICKERS_PER_TEAM)
          const bPct = (getTeamCollected(state, b.slug).length / STICKERS_PER_TEAM)
          return bPct - aPct || a.name.localeCompare(b.name)
        })
        break
      case 'alpha':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    return sorted
  }, [teams, search, sortMode, state])

  const teamCardLabels = useMemo(
    () => ({
      done: t('done'),
      markAll: t('markAll'),
      clearAll: t('clearAll'),
      stickerLabel: (n: number, collected: boolean) =>
        t('stickerLabel', {
          n,
          status: collected ? t('stickerStatusCollected') : t('stickerStatusMissing'),
        }),
    }),
    [t]
  )

  /* ─── Group boundaries for headers ─── */

  const teamsWithGroupHeaders = useMemo(() => {
    if (sortMode !== 'group') return sortedTeams.map((tm) => ({ team: tm, isGroupStart: false }))
    let lastGroup = ''
    return sortedTeams.map((tm) => {
      const isGroupStart = tm.group !== lastGroup
      lastGroup = tm.group
      return { team: tm, isGroupStart }
    })
  }, [sortedTeams, sortMode])

  /* ─── Export ─── */

  const exportProgress = useCallback(() => {
    const lines: string[] = [
      t('exportHeading'),
      t('exportTotal', {
        owned: stats.totalOwned,
        total: stats.totalPossible,
        pct: stats.pct.toFixed(1),
      }),
      t('exportTeam', { owned: stats.teamCollected, total: TOTAL_TEAM_STICKERS }),
      t('exportSpecial', { owned: stats.specialCollected, total: TOTAL_SPECIAL_STICKERS }),
      '',
    ]

    const groups = Array.from(new Set(teams.map((tm) => tm.group))).sort()
    for (const g of groups) {
      const groupTeams = teams.filter((tm) => tm.group === g)
      lines.push(t('exportGroup', { group: g }))
      for (const tm of groupTeams) {
        const c = getTeamCollected(state, tm.slug)
        const bar = Array.from({ length: STICKERS_PER_TEAM }, (_, i) =>
          c.includes(i) ? '#' : '.'
        ).join('')
        lines.push(`  ${tm.flag} ${tm.name}: [${bar}] ${c.length}/${STICKERS_PER_TEAM}`)
      }
      lines.push('')
    }

    const missing = TOTAL_STICKERS - stats.totalOwned
    lines.push(t('exportMissing', { count: missing }))
    lines.push('kickoracle.com/stickers/tracker')

    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(
      () => setToastMsg(t('copySuccess')),
      () => setToastMsg(t('copyFailed'))
    )
  }, [state, stats, teams, t])

  /* ─── Render ────────────────────────────────────────────────── */

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ── Overview Stats ── */}
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        <ProgressRing percentage={stats.pct} completeLabel={t('complete')} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
          <GlassCard className="p-4 text-center">
            <span className="block font-mono text-2xl font-bold text-on-surface tabular-nums">
              {stats.totalOwned}
            </span>
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">
              {t('collected')}
            </span>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <span className="block font-mono text-2xl font-bold text-on-surface tabular-nums">
              {stats.totalPossible}
            </span>
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">
              {t('total')}
            </span>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <span className="block font-mono text-2xl font-bold text-primary tabular-nums">
              {stats.pct.toFixed(1)}%
            </span>
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">
              {t('complete')}
            </span>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <span className="block font-mono text-2xl font-bold text-tertiary tabular-nums">
              {stats.duplicates}
            </span>
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">
              {t('duplicates')}
            </span>
          </GlassCard>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container border border-white/[0.08]
                       text-sm text-on-surface placeholder:text-on-surface-variant/50
                       focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-1 bg-surface-container rounded-xl border border-white/[0.08] p-1">
          {([
            ['group', t('sortGroup')],
            ['completion', t('sortProgress')],
            ['alpha', t('sortAlpha')],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortMode(key as SortMode)}
              className={`
                text-[11px] font-label font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all
                ${sortMode === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={exportProgress}
          className="btn-secondary flex items-center justify-center gap-2 !py-2.5 !px-4 !text-[11px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {t('export')}
        </button>
      </div>

      {/* ── Team Grid ── */}
      <section>
        <h2 className="font-headline text-2xl uppercase tracking-tight text-on-surface mb-6">
          {t('teams')} <span className="text-on-surface-variant font-mono text-base">{t('teamCount', { count: sortedTeams.length })}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {teamsWithGroupHeaders.map(({ team, isGroupStart }) => {
            const groupColor = GROUP_COLORS[team.group] ?? '#a0d494'
            const collected = getTeamCollected(state, team.slug)
            return (
              <div key={team.slug} className={expandedTeam === team.slug ? 'col-span-full md:col-span-2' : ''}>
                {isGroupStart && (
                  <div className="col-span-full flex items-center gap-2 mb-2 mt-4 first:mt-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: groupColor }} />
                    <span className="font-headline text-sm uppercase tracking-wider text-on-surface-variant">
                      {t('group', { group: team.group })}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                )}
                <TeamCard
                  team={team}
                  collected={collected}
                  groupColor={groupColor}
                  expanded={expandedTeam === team.slug}
                  onToggleExpand={toggleExpandTeam}
                  onToggleSticker={toggleTeamSticker}
                  onMarkAll={markAllForTeam}
                  onClearAll={clearAllForTeam}
                  labels={teamCardLabels}
                />
              </div>
            )
          })}
        </div>

        {sortedTeams.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            {t('noTeamsMatch', { query: search })}
          </div>
        )}
      </section>

      {/* ── Special Stickers ── */}
      <section>
        <button
          type="button"
          onClick={() => setShowSpecials((p) => !p)}
          className="w-full flex items-center gap-3 group"
        >
          <div className="w-1 h-8 rounded-full bg-tertiary shrink-0" />
          <h2 className="font-headline text-2xl uppercase tracking-tight text-on-surface">
            {t('tournamentSpecials')}
          </h2>
          <span className="font-mono text-sm text-on-surface-variant tabular-nums">
            {state.specials.length}/{TOTAL_SPECIAL_STICKERS}
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <svg
            className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 ${showSpecials ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSpecials && (
          <div className="mt-4 space-y-6 animate-fade-in-up" style={{ animationDuration: '0.25s' }}>
            {SPECIAL_CATEGORIES.map((cat) => (
              <GlassCard key={cat.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-headline text-sm uppercase tracking-tight text-on-surface">
                    {t(`categories.${cat.id}`)}
                  </h3>
                  <span className="font-mono text-xs text-on-surface-variant tabular-nums">
                    {Array.from({ length: cat.count }, (_, i) => cat.start + i - 1).filter((idx) =>
                      state.specials.includes(idx)
                    ).length}
                    /{cat.count}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: cat.count }, (_, i) => {
                    const idx = cat.start + i - 1
                    return (
                      <SpecialSlot
                        key={idx}
                        index={idx}
                        collected={state.specials.includes(idx)}
                        onToggle={toggleSpecialSticker}
                        ariaLabel={t('specialStickerLabel', {
                          n: idx + 1,
                          status: state.specials.includes(idx)
                            ? t('stickerStatusCollected')
                            : t('stickerStatusMissing'),
                        })}
                      />
                    )
                  })}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* ── Toast notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        glass-panel rounded-xl border border-primary/20 px-5 py-3
                        text-sm text-primary font-label font-semibold
                        animate-fade-in-up shadow-2xl"
             style={{ animationDuration: '0.2s' }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}
