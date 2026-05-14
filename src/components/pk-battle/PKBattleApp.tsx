'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { PLAYERS } from '@/data/players-data'
import { TEAMS } from '@/data/teams-meta'
import { computeBattle, computeBo5, getRandomPair, getPositionPair, getDailyDuel, buildShareText, saveBattleToHistory, loadBattleHistory, getBattleStats, logBattleToServer, fetchLeaderboard, fetchCommunityStats, canBattleFree, getRemainingFree, incrementDailyUsage } from '@/lib/pk-battle'
import type { Player } from '@/lib/types'
import type { BattleResult, BattleFactor, BattleHistoryEntry, LeaderboardEntry, CommunityStats, Bo5Result } from '@/lib/pk-battle'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { BRAND, SURFACE, POSITION_HEX } from '@/lib/brand-tokens'
import { trackEvent } from '@/lib/analytics'
import { useEntitlements } from '@/hooks/useEntitlements'
import { Link } from '@/i18n/navigation'

type Screen = 'select' | 'battle' | 'result' | 'bo5-result'

const POSITION_ORDER = ['FWD', 'MID', 'DEF', 'GK'] as const

function PlayerSelector({
  label,
  selected,
  onSelect,
  otherSelected,
}: {
  label: string
  selected: Player | null
  onSelect: (p: Player) => void
  otherSelected: Player | null
}) {
  const t = useTranslations('pkBattle')
  const [teamFilter, setTeamFilter] = useState<string>('')
  const [posFilter, setPosFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = PLAYERS.filter((p) => p.slug !== otherSelected?.slug)
    if (teamFilter) list = list.filter((p) => p.teamSlug === teamFilter)
    if (posFilter) list = list.filter((p) => p.position === posFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.rating - a.rating).slice(0, 50)
  }, [teamFilter, posFilter, search, otherSelected?.slug])

  const teamOptions = useMemo(
    () => TEAMS.sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  return (
    <div className="space-y-3">
      <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </h3>

      {selected ? (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
                style={{ backgroundColor: `${POSITION_HEX[selected.position]}20`, color: POSITION_HEX[selected.position] }}
              >
                {selected.number}
              </div>
              <div>
                <div className="font-headline text-base text-on-surface">{selected.name}</div>
                <div className="text-xs text-on-surface-variant">
                  {selected.position} · {selected.club} · {selected.rating}/10
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelect(null as unknown as Player)}
              className="text-xs text-on-surface-variant hover:text-secondary transition-colors"
            >
              {t('change')}
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary/50"
            >
              <option value="">{t('allTeams')}</option>
              {teamOptions.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.flag} {t.name}
                </option>
              ))}
            </select>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary/50"
            >
              <option value="">{t('allPositions')}</option>
              {POSITION_ORDER.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlayerClub')}
              className="flex-1 min-w-[140px] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary/50"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-on-surface-variant">{t('noPlayersMatch')}</div>
            ) : (
              filtered.map((p) => {
                const team = TEAMS.find((t) => t.slug === p.teamSlug)
                return (
                  <button
                    key={p.slug}
                    onClick={() => { onSelect(p); setSearch('') }}
                    className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] last:border-0"
                  >
                    <span className="text-lg">{team?.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-on-surface">{p.name}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {p.position} · {p.club} · {p.rating}/10
                      </div>
                    </div>
                    <Badge variant={p.fitnessStatus === 'green' ? 'primary' : p.fitnessStatus === 'amber' ? 'tertiary' : 'secondary'} size="sm">
                      {p.fitnessStatus === 'green' ? t('fitnessFit') : p.fitnessStatus === 'amber' ? t('fitnessDoubt') : t('fitnessOut')}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FactorBar({ factor, flip }: { factor: BattleFactor; flip?: boolean }) {
  const max = Math.max(factor.valueA, factor.valueB, 1)
  const pctA = (factor.valueA / max) * 100
  const pctB = (factor.valueB / max) * 100
  const aWins = factor.valueA > factor.valueB
  const bWins = factor.valueB > factor.valueA

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <div className="flex items-center justify-end gap-2">
        <span className={`font-mono text-sm font-bold ${aWins ? 'text-primary' : 'text-on-surface-variant'}`}>
          {typeof factor.valueA === 'number' && factor.valueA % 1 !== 0
            ? factor.valueA.toFixed(1)
            : factor.valueA}
        </span>
        <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pctA}%`,
              background: aWins ? BRAND.primary : SURFACE.onSurfaceVariant,
              marginLeft: 'auto',
            }}
          />
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label min-w-[80px] text-center">
        {factor.label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pctB}%`,
              background: bWins ? BRAND.secondary : SURFACE.onSurfaceVariant,
            }}
          />
        </div>
        <span className={`font-mono text-sm font-bold ${bWins ? 'text-secondary' : 'text-on-surface-variant'}`}>
          {typeof factor.valueB === 'number' && factor.valueB % 1 !== 0
            ? factor.valueB.toFixed(1)
            : factor.valueB}
        </span>
      </div>
    </div>
  )
}

function ShareButtons({ result }: { result: BattleResult }) {
  const t = useTranslations('pkBattle')
  const [copied, setCopied] = useState(false)
  const text = buildShareText(result)

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'share_twitter' })
  }
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'share_whatsapp' })
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-xs text-on-surface-variant mr-1">{t('share')}</span>
      <button onClick={shareTwitter} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-on-surface hover:bg-white/[0.06] transition-colors" aria-label={t('shareTwitterAria')}>
        X
      </button>
      <button onClick={shareWhatsApp} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-on-surface hover:bg-white/[0.06] transition-colors" aria-label={t('shareWhatsAppAria')}>
        WhatsApp
      </button>
      <button onClick={copyLink} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-on-surface hover:bg-white/[0.06] transition-colors" aria-label={t('copyAria')}>
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  )
}

function BattleResultView({
  result,
  onRematch,
  onNewBattle,
}: {
  result: BattleResult
  onRematch: () => void
  onNewBattle: () => void
}) {
  const t = useTranslations('pkBattle')
  const { playerA, playerB, scoreA, scoreB, winnerSlug, verdict, factors } = result
  const teamA = TEAMS.find((t) => t.slug === playerA.teamSlug)
  const teamB = TEAMS.find((t) => t.slug === playerB.teamSlug)

  const total = scoreA + scoreB
  const pctA = total > 0 ? scoreA / total : 0.5
  const pctB = total > 0 ? scoreB / total : 0.5
  const isDraw = !winnerSlug

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Verdict banner */}
      <GlassCard className="p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-1 w-full"
          style={{
            background: isDraw
              ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.tertiary}, ${BRAND.secondary})`
              : winnerSlug === playerA.slug
                ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryFixed})`
                : `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.secondaryFixed})`,
          }}
        />
        <div className="text-center">
          <Badge variant={isDraw ? 'tertiary' : 'primary'} size="md">
            {isDraw ? t('draw') : t('winner')}
          </Badge>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide mt-4">
            {isDraw
              ? t('deadHeat')
              : winnerSlug === playerA.slug
                ? playerA.name
                : playerB.name}
          </h2>
          <p className="mt-3 text-on-surface-variant text-base leading-relaxed max-w-xl mx-auto">
            {verdict}
          </p>
        </div>
      </GlassCard>

      {/* Head-to-head scores */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8">
        <div className="text-center">
          <span className="text-3xl">{teamA?.flag}</span>
          <h3 className={`font-headline text-xl md:text-2xl uppercase tracking-wide mt-2 ${winnerSlug === playerA.slug ? 'text-primary' : 'text-on-surface'}`}>
            {playerA.name}
          </h3>
          <Badge variant="outline" size="sm">{playerA.position} · {playerA.club}</Badge>
          <div className="mt-3 font-mono text-4xl font-black tabular-nums" style={{ color: winnerSlug === playerA.slug ? BRAND.primary : SURFACE.onSurfaceVariant }}>
            {scoreA.toFixed(1)}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-headline text-2xl text-on-surface-variant">{t('vs').toUpperCase()}</span>
        </div>
        <div className="text-center">
          <span className="text-3xl">{teamB?.flag}</span>
          <h3 className={`font-headline text-xl md:text-2xl uppercase tracking-wide mt-2 ${winnerSlug === playerB.slug ? 'text-secondary' : 'text-on-surface'}`}>
            {playerB.name}
          </h3>
          <Badge variant="outline" size="sm">{playerB.position} · {playerB.club}</Badge>
          <div className="mt-3 font-mono text-4xl font-black tabular-nums" style={{ color: winnerSlug === playerB.slug ? BRAND.secondary : SURFACE.onSurfaceVariant }}>
            {scoreB.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full">
        <div className="flex justify-between mb-1.5">
          <span className="font-label text-xs text-primary font-semibold">{Math.round(pctA * 100)}%</span>
          <span className="font-label text-xs text-secondary font-semibold">{Math.round(pctB * 100)}%</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/[0.06]">
          <div
            className="h-full rounded-l-full transition-all duration-700"
            style={{ width: `${pctA * 100}%`, background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryFixed})` }}
          />
          <div
            className="h-full rounded-r-full transition-all duration-700"
            style={{ width: `${pctB * 100}%`, background: `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.secondaryFixed})` }}
          />
        </div>
      </div>

      {/* Factor breakdown */}
      <GlassCard className="p-6">
        <h3 className="font-headline text-lg uppercase tracking-wide mb-4 text-center">{t('battleBreakdown')}</h3>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-3">
          <div className="text-right font-headline text-xs uppercase tracking-wide text-primary">{playerA.name}</div>
          <div />
          <div className="font-headline text-xs uppercase tracking-wide text-secondary">{playerB.name}</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {factors.map((f) => (
            <FactorBar key={f.label} factor={f} />
          ))}
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onRematch}
          className="rounded-2xl border border-white/20 px-8 py-3 font-label font-semibold uppercase tracking-widest text-on-surface hover:bg-white/[0.06] transition-colors"
        >
          {t('rematch')}
        </button>
        <button
          onClick={onNewBattle}
          className="rounded-2xl bg-primary/15 border border-primary/30 px-8 py-3 font-label font-semibold uppercase tracking-widest text-primary hover:bg-primary/25 transition-colors"
        >
          {t('newBattle')}
        </button>
      </div>

      {/* Share */}
      <ShareButtons result={result} />
    </div>
  )
}

function Bo5ResultView({
  result,
  onNewBattle,
}: {
  result: Bo5Result
  onNewBattle: () => void
}) {
  const t = useTranslations('pkBattle')
  const { playerA, playerB, rounds, winsA, winsB, seriesWinner, verdict } = result
  const teamA = TEAMS.find((t) => t.slug === playerA.teamSlug)
  const teamB = TEAMS.find((t) => t.slug === playerB.teamSlug)
  const isDraw = !seriesWinner

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <GlassCard className="p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-1 w-full"
          style={{
            background: isDraw
              ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.tertiary}, ${BRAND.secondary})`
              : seriesWinner === playerA.slug
                ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryFixed})`
                : `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.secondaryFixed})`,
          }}
        />
        <div className="text-center">
          <Badge variant="tertiary" size="md">{t('bestOfFiveBadge')}</Badge>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide mt-4">
            {isDraw ? t('deadHeat') : seriesWinner === playerA.slug ? playerA.name : playerB.name}
          </h2>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-2xl">{teamA?.flag}</span>
              <div className="font-mono text-3xl font-black tabular-nums mt-1" style={{ color: BRAND.primary }}>{winsA}</div>
            </div>
            <span className="font-headline text-xl text-on-surface-variant">—</span>
            <div className="text-center">
              <span className="text-2xl">{teamB?.flag}</span>
              <div className="font-mono text-3xl font-black tabular-nums mt-1" style={{ color: BRAND.secondary }}>{winsB}</div>
            </div>
          </div>
          <p className="mt-4 text-on-surface-variant text-base leading-relaxed max-w-xl mx-auto">{verdict}</p>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-headline text-lg uppercase tracking-wide mb-4 text-center">{t('roundByRound')}</h3>
        <div className="space-y-2">
          {rounds.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-white/[0.04] px-4 py-3"
            >
              <div className="text-right">
                <span className={`font-mono text-lg font-bold tabular-nums ${r.winnerSlug === playerA.slug ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {r.scoreA.toFixed(1)}
                </span>
              </div>
              <div className="text-center">
                <Badge
                  variant={r.winnerSlug === playerA.slug ? 'primary' : r.winnerSlug === playerB.slug ? 'secondary' : 'tertiary'}
                  size="sm"
                >
                  R{i + 1}
                </Badge>
              </div>
              <div>
                <span className={`font-mono text-lg font-bold tabular-nums ${r.winnerSlug === playerB.slug ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {r.scoreB.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="flex justify-center">
        <button
          onClick={onNewBattle}
          className="rounded-2xl bg-primary/15 border border-primary/30 px-10 py-3 font-label font-bold uppercase tracking-widest text-primary hover:bg-primary/25 transition-colors"
        >
          {t('newBattle')}
        </button>
      </div>
    </div>
  )
}

function FreemiumBanner({ remaining, isPremium }: { remaining: number; isPremium: boolean }) {
  const t = useTranslations('pkBattle')
  if (isPremium) return null

  return (
    <div className="rounded-xl border border-tertiary/20 bg-tertiary/[0.04] px-5 py-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-5 rounded-full transition-colors"
                style={{ backgroundColor: i < remaining ? BRAND.tertiary : `${SURFACE.onSurfaceVariant}30` }}
              />
            ))}
          </div>
          <span className="text-xs text-on-surface-variant">
            {remaining > 0 ? t('battlesLeft', { count: remaining }) : t('dailyLimitReached')}
          </span>
        </div>
        {remaining <= 2 && (
          <Link
            href="/pricing"
            className="rounded-full bg-tertiary/15 border border-tertiary/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-tertiary hover:bg-tertiary/25 transition-colors"
          >
            {t('goUnlimited')}
          </Link>
        )}
      </div>
    </div>
  )
}

function CommunityStatsBar({ stats }: { stats: CommunityStats | null }) {
  const t = useTranslations('pkBattle')
  if (!stats || stats.totalBattles === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-r from-primary/[0.04] to-secondary/[0.04] px-5 py-4">
      <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
        {[
          { label: t('globalBattles'), value: stats.totalBattles.toLocaleString(), accent: BRAND.primary },
          { label: t('commanders'), value: stats.uniqueSessions.toLocaleString(), accent: BRAND.secondary },
          { label: t('playersUsed'), value: stats.uniquePlayersUsed.toLocaleString(), accent: BRAND.tertiary },
          { label: t('deadHeats'), value: stats.totalDraws.toLocaleString(), accent: SURFACE.onSurfaceVariant },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-xl font-bold font-mono tabular-nums" style={{ color: s.accent }}>{s.value}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GlobalLeaderboard({ entries, onChallenge }: { entries: LeaderboardEntry[]; onChallenge: (slug: string) => void }) {
  const t = useTranslations('pkBattle')
  if (entries.length === 0) return null

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant">
          {t('globalLeaderboard')}
        </h3>
        <Badge variant="primary" size="sm">{t('top', { count: entries.length })}</Badge>
      </div>
      <div className="space-y-1">
        {entries.slice(0, 10).map((entry) => {
          const isTop3 = entry.rank <= 3
          const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null
          return (
            <div
              key={entry.slug}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm group ${isTop3 ? 'border border-white/[0.06] bg-white/[0.02]' : ''}`}
            >
              <span className="w-8 text-center shrink-0">
                {medal ?? <span className="text-xs text-on-surface-variant font-mono">#{entry.rank}</span>}
              </span>
              <span className="font-headline text-xs uppercase tracking-tight text-on-surface truncate flex-1">
                {entry.name}
              </span>
              <span className="text-xs text-on-surface-variant font-mono tabular-nums shrink-0">
                {entry.total_wins}W / {entry.total_battles}B
              </span>
              <div className="w-16 shrink-0">
                <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${entry.win_rate}%`,
                      background: entry.rank <= 3
                        ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.tertiary})`
                        : BRAND.primary,
                    }}
                  />
                </div>
                <div className="text-[9px] text-on-surface-variant text-right mt-0.5 tabular-nums">{entry.win_rate}%</div>
              </div>
              <button
                onClick={() => onChallenge(entry.slug)}
                className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg border border-primary/30 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
              >
                {t('battle')}
              </button>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function BattleHistory({ history }: { history: BattleHistoryEntry[] }) {
  const t = useTranslations('pkBattle')
  const stats = getBattleStats(history)
  if (history.length === 0) return null

  const decisive = history.filter((h) => h.winnerSlug && Math.abs(h.scoreA - h.scoreB) > 10).length
  const closest = history.reduce<BattleHistoryEntry | null>((best, h) => {
    const gap = Math.abs(h.scoreA - h.scoreB)
    if (!best || gap < Math.abs(best.scoreA - best.scoreB)) return h
    return best
  }, null)
  const winPct = stats.totalBattles > 0 ? Math.round((stats.wins / stats.totalBattles) * 100) : 0

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant">
          {t('battleHistory')}
        </h3>
        <Badge variant="tertiary" size="sm">{t('played', { count: stats.totalBattles })}</Badge>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: t('decisive'), value: String(decisive), accent: BRAND.primary },
          { label: t('draws'), value: String(stats.draws), accent: BRAND.secondary },
          { label: t('winRate'), value: stats.winRate, accent: BRAND.tertiary },
          { label: t('closest'), value: closest ? Math.abs(closest.scoreA - closest.scoreB).toFixed(1) : '—', accent: SURFACE.onSurfaceVariant },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-center">
            <div className="text-lg font-bold tabular-nums" style={{ color: s.accent }}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div className="mb-5">
        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${winPct}%`, background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.tertiary})` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-on-surface-variant">
          <span>{t('decisiveLower', { count: stats.wins })}</span>
          <span>{t('drawsLower', { count: stats.draws })}</span>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-1.5">
        {history.slice(0, 8).map((h) => {
          const isDraw = !h.winnerSlug
          const gap = Math.abs(h.scoreA - h.scoreB)
          return (
            <div
              key={`${h.playerASlug}-${h.playerBSlug}-${h.timestamp}`}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] px-3 py-2 text-xs"
            >
              <span className={`font-medium truncate max-w-[120px] ${h.winnerSlug === h.playerASlug ? 'text-primary' : 'text-on-surface'}`}>
                {h.playerAName}
              </span>
              <span className="font-mono text-on-surface-variant mx-2 shrink-0 tabular-nums">
                {h.scoreA.toFixed(1)} - {h.scoreB.toFixed(1)}
              </span>
              <span className={`font-medium truncate max-w-[120px] text-right ${h.winnerSlug === h.playerBSlug ? 'text-secondary' : 'text-on-surface'}`}>
                {h.playerBName}
              </span>
              {isDraw && <Badge variant="tertiary" size="sm">{t('draw')}</Badge>}
              {!isDraw && gap > 10 && <Badge variant="primary" size="sm">{t('knockout')}</Badge>}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

export default function PKBattleApp() {
  const t = useTranslations('pkBattle')
  const [screen, setScreen] = useState<Screen>('select')
  const [playerA, setPlayerA] = useState<Player | null>(null)
  const [playerB, setPlayerB] = useState<Player | null>(null)
  const [result, setResult] = useState<BattleResult | null>(null)
  const [bo5Result, setBo5Result] = useState<Bo5Result | null>(null)
  const [battleCount, setBattleCount] = useState(0)
  const [history, setHistory] = useState<BattleHistoryEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null)
  const [remaining, setRemaining] = useState(5)
  const { tier } = useEntitlements()
  const isPremium = tier !== 'free'

  useEffect(() => {
    setHistory(loadBattleHistory())
    setRemaining(getRemainingFree())
    fetchLeaderboard().then(setLeaderboard)
    fetchCommunityStats().then(setCommunityStats)
  }, [])

  const handleRandomize = useCallback(() => {
    const [a, b] = getRandomPair(PLAYERS)
    setPlayerA(a)
    setPlayerB(b)
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'randomize' })
  }, [])

  const handleFight = useCallback(() => {
    if (!playerA || !playerB) return
    if (!isPremium && !canBattleFree()) return
    const battleResult = computeBattle(playerA, playerB)
    setResult(battleResult)
    setScreen('result')
    setBattleCount((c) => c + 1)
    saveBattleToHistory(battleResult)
    setHistory(loadBattleHistory())
    logBattleToServer(battleResult)
    if (!isPremium) {
      incrementDailyUsage()
      setRemaining(getRemainingFree())
    }
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'fight' })
  }, [playerA, playerB, isPremium])

  const handleBo5 = useCallback(() => {
    if (!playerA || !playerB || !isPremium) return
    const result = computeBo5(playerA, playerB)
    setBo5Result(result)
    setScreen('bo5-result')
    setBattleCount((c) => c + 1)
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'bo5' })
  }, [playerA, playerB, isPremium])

  const handleRematch = useCallback(() => {
    if (!playerA || !playerB) return
    setResult(null)
    setBo5Result(null)
    setScreen('select')
  }, [playerA, playerB])

  const handleNewBattle = useCallback(() => {
    setPlayerA(null)
    setPlayerB(null)
    setResult(null)
    setBo5Result(null)
    setScreen('select')
  }, [])

  const handleLeaderboardChallenge = useCallback((slug: string) => {
    const player = PLAYERS.find((p) => p.slug === slug)
    if (player) {
      setPlayerA(player)
      setPlayerB(null)
      trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: 'leaderboard_challenge' })
    }
  }, [])

  const dailyDuel = useMemo(() => {
    const [slugA, slugB] = getDailyDuel()
    const pA = PLAYERS.find((p) => p.slug === slugA)
    const pB = PLAYERS.find((p) => p.slug === slugB)
    if (!pA || !pB) return null
    return { playerA: pA, playerB: pB }
  }, [])

  const handleQuickMode = useCallback((posA: Player['position'], posB: Player['position']) => {
    const [a, b] = getPositionPair(PLAYERS, posA, posB)
    setPlayerA(a)
    setPlayerB(b)
    trackEvent({ event: 'tool_engaged', tool_name: 'pk_battle', tool_context: `quick_${posA}_vs_${posB}` })
  }, [])

  if (screen === 'bo5-result' && bo5Result) {
    return <Bo5ResultView result={bo5Result} onNewBattle={handleNewBattle} />
  }

  if (screen === 'result' && result) {
    return (
      <BattleResultView
        result={result}
        onRematch={handleRematch}
        onNewBattle={handleNewBattle}
      />
    )
  }

  return (
    <div data-testid="pk-battle-widget" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Badge variant="secondary" size="md">{t('badge')}</Badge>
        <h1 className="mt-4 font-headline text-4xl md:text-6xl uppercase tracking-wide">
          {t('heroTitle1')}<br />
          <span className="gradient-text">{t('heroTitle2')}</span>
        </h1>
        <p className="mt-3 text-on-surface-variant text-base max-w-lg mx-auto">
          {t('heroDescription')}
        </p>
        {battleCount > 0 && (
          <div className="mt-2 text-xs text-on-surface-variant">
            {t('battlesThisSession', { count: battleCount })}
          </div>
        )}
      </div>

      {/* Freemium Banner */}
      <FreemiumBanner remaining={remaining} isPremium={isPremium} />

      {/* Community Stats */}
      <CommunityStatsBar stats={communityStats} />

      {/* Daily Duel */}
      {dailyDuel && (
        <GlassCard className="p-5 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-1 w-full"
            style={{ background: `linear-gradient(90deg, ${BRAND.tertiary}, ${BRAND.tertiaryFixed})` }}
          />
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="tertiary" size="sm">{t('dailyDuel')}</Badge>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xl">{TEAMS.find((tm) => tm.slug === dailyDuel.playerA.teamSlug)?.flag}</span>
                <span className="font-headline text-sm uppercase tracking-tight text-on-surface">{dailyDuel.playerA.name}</span>
                <span className="text-xs text-on-surface-variant">{t('vs')}</span>
                <span className="font-headline text-sm uppercase tracking-tight text-on-surface">{dailyDuel.playerB.name}</span>
                <span className="text-xl">{TEAMS.find((tm) => tm.slug === dailyDuel.playerB.teamSlug)?.flag}</span>
              </div>
            </div>
            <button
              onClick={() => { setPlayerA(dailyDuel.playerA); setPlayerB(dailyDuel.playerB) }}
              className="shrink-0 rounded-xl bg-tertiary/15 border border-tertiary/30 px-5 py-2 font-label text-xs font-semibold uppercase tracking-widest text-tertiary hover:bg-tertiary/25 transition-colors"
            >
              {t('play')}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Quick Mode Buttons */}
      <div>
        <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant mb-3 text-center">
          {t('quickModes')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_MODES.map((mode) => (
            <button
              key={mode.label}
              onClick={() => handleQuickMode(mode.posA, mode.posB)}
              className="rounded-xl border border-white/[0.06] px-3 py-3 text-center transition-all hover:border-primary/30 hover:bg-white/[0.03]"
            >
              <span className="text-lg">{mode.icon}</span>
              <div className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                {mode.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Player selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlayerSelector
          label={t('playerA')}
          selected={playerA}
          onSelect={setPlayerA}
          otherSelected={playerB}
        />
        <PlayerSelector
          label={t('playerB')}
          selected={playerB}
          onSelect={setPlayerB}
          otherSelected={playerA}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleRandomize}
          className="rounded-2xl border border-white/20 px-8 py-3 font-label font-semibold uppercase tracking-widest text-on-surface hover:bg-white/[0.06] transition-colors"
        >
          {t('randomMatchup')}
        </button>
        <button
          onClick={handleFight}
          disabled={!playerA || !playerB || (!isPremium && !canBattleFree())}
          className="rounded-2xl bg-gradient-to-r from-primary to-primaryFixed px-10 py-3 font-label font-bold uppercase tracking-widest text-on-primary transition-all hover:shadow-[0_0_30px_rgba(160,212,148,0.3)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {!isPremium && !canBattleFree() ? t('limitReached') : t('fight')}
        </button>
        <button
          onClick={handleBo5}
          disabled={!playerA || !playerB || !isPremium}
          className="rounded-2xl border border-tertiary/30 bg-tertiary/10 px-8 py-3 font-label font-semibold uppercase tracking-widest text-tertiary transition-all hover:bg-tertiary/20 disabled:opacity-30 disabled:cursor-not-allowed"
          title={!isPremium ? t('bestOfFiveTooltip') : undefined}
        >
          {t('bestOfFive')}
        </button>
      </div>

      {/* Featured Duels */}
      <GlassCard className="p-6">
        <h3 className="font-headline text-sm uppercase tracking-widest text-on-surface-variant mb-4 text-center">
          {t('featuredDuels')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURED_DUELS.map(([slugA, slugB]) => {
            const pA = PLAYERS.find((p) => p.slug === slugA)
            const pB = PLAYERS.find((p) => p.slug === slugB)
            if (!pA || !pB) return null
            const teamA = TEAMS.find((tm) => tm.slug === pA.teamSlug)
            const teamB = TEAMS.find((tm) => tm.slug === pB.teamSlug)
            return (
              <button
                key={`${slugA}-${slugB}`}
                onClick={() => { setPlayerA(pA); setPlayerB(pB) }}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-white/[0.03]"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span>{teamA?.flag}</span>
                  <span className="font-headline text-xs uppercase tracking-tight truncate">{pA.name}</span>
                </span>
                <span className="text-[10px] text-on-surface-variant mx-2 shrink-0">{t('vs')}</span>
                <span className="flex items-center gap-2 min-w-0 flex-row-reverse">
                  <span>{teamB?.flag}</span>
                  <span className="font-headline text-xs uppercase tracking-tight truncate text-right">{pB.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </GlassCard>

      {/* Global Leaderboard */}
      <GlobalLeaderboard entries={leaderboard} onChallenge={handleLeaderboardChallenge} />

      {/* Battle History */}
      <BattleHistory history={history} />
    </div>
  )
}

const QUICK_MODES: { label: string; icon: string; posA: Player['position']; posB: Player['position'] }[] = [
  { label: 'FWD vs GK', icon: '🥅', posA: 'FWD', posB: 'GK' },
  { label: 'FWD vs DEF', icon: '🛡️', posA: 'FWD', posB: 'DEF' },
  { label: 'MID vs MID', icon: '🎯', posA: 'MID', posB: 'MID' },
  { label: 'FWD vs FWD', icon: '⚡', posA: 'FWD', posB: 'FWD' },
]

const FEATURED_DUELS: [string, string][] = [
  ['kylian-mbappe', 'vinicius-jr'],
  ['lionel-messi', 'cristiano-ronaldo'],
  ['jude-bellingham', 'pedri'],
  ['erling-haaland', 'harry-kane'],
  ['virgil-van-dijk', 'ruben-dias'],
  ['bukayo-saka', 'lamine-yamal'],
  ['mohamed-salah', 'son-heung-min'],
  ['kevin-de-bruyne', 'bruno-fernandes'],
  ['phil-foden', 'jamal-musiala'],
  ['antoine-griezmann', 'bernardo-silva'],
]
