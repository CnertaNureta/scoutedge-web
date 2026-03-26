'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'

interface MatchData {
  id: string
  homeTeamSlug: string
  awayTeamSlug: string
  homeTeamName: string
  awayTeamName: string
  homeFlag: string
  awayFlag: string
  round: string
  group: string
  venue: string
  city: string
  kickoffUtc: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

interface ContenderData {
  slug: string
  name: string
  flag: string
  fifaRanking: number
}

type Prediction = 'home' | 'draw' | 'away'

interface UserPredictions {
  matches: Record<string, Prediction>
  winner: string | null
  topScorer: string | null
  darkHorse: string | null
  submittedAt: string | null
}

const STORAGE_KEY = 'scoutedge-predictions-v1'

function loadPredictions(): UserPredictions {
  if (typeof window === 'undefined') {
    return { matches: {}, winner: null, topScorer: null, darkHorse: null, submittedAt: null }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { matches: {}, winner: null, topScorer: null, darkHorse: null, submittedAt: null }
}

function savePredictions(preds: UserPredictions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preds))
  } catch {}
}

function generateShareText(preds: UserPredictions, matches: MatchData[], contenders: ContenderData[]): string {
  const matchCount = Object.keys(preds.matches).length
  const winnerTeam = contenders.find((c) => c.slug === preds.winner)

  let text = `My World Cup 2026 Predictions on ScoutEdge!\n\n`
  text += `${matchCount}/${matches.length} matches predicted\n`

  if (winnerTeam) {
    text += `Champion: ${winnerTeam.flag} ${winnerTeam.name}\n`
  }

  // Show a few key picks
  const knockoutPicks = matches
    .filter((m) => !m.group && preds.matches[m.id])
    .slice(0, 3)

  for (const m of knockoutPicks) {
    const pick = preds.matches[m.id]
    const winner = pick === 'home' ? m.homeTeamName : pick === 'away' ? m.awayTeamName : 'Draw'
    text += `${m.round}: ${m.homeTeamName} vs ${m.awayTeamName} → ${winner}\n`
  }

  text += `\nMake yours: https://scoutedge.ai/predictions`
  return text
}

// Score calculation
function calcScore(preds: UserPredictions, matches: MatchData[]): { total: number; boldPicks: number; agreePct: number } {
  let total = 0
  let boldPicks = 0
  let agreeWithAI = 0
  const predicted = Object.keys(preds.matches).length

  for (const match of matches) {
    const pick = preds.matches[match.id]
    if (!pick) continue

    // AI's pick
    const aiPick =
      match.homeWinProb > match.awayWinProb && match.homeWinProb > match.drawProb
        ? 'home'
        : match.awayWinProb > match.homeWinProb && match.awayWinProb > match.drawProb
          ? 'away'
          : 'draw'

    if (pick === aiPick) {
      agreeWithAI++
    } else {
      boldPicks++
    }

    // Points: agreeing with AI = 1pt, going against = 3pt if correct (we can't know yet)
    total += pick === aiPick ? 1 : 3
  }

  return {
    total,
    boldPicks,
    agreePct: predicted > 0 ? Math.round((agreeWithAI / predicted) * 100) : 0,
  }
}

interface PredictionsClientProps {
  matches: MatchData[]
  contenders: ContenderData[]
}

export default function PredictionsClient({ matches, contenders }: PredictionsClientProps) {
  const [preds, setPreds] = useState<UserPredictions>(loadPredictions)
  const [tab, setTab] = useState<'matches' | 'champion' | 'results'>('matches')
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    savePredictions(preds)
  }, [preds])

  const groupMatches = useMemo(() => matches.filter((m) => m.group), [matches])
  const knockoutMatches = useMemo(() => matches.filter((m) => !m.group), [matches])

  const score = useMemo(() => calcScore(preds, matches), [preds, matches])
  const completionPct = Math.round((Object.keys(preds.matches).length / matches.length) * 100)

  function setPick(matchId: string, pick: Prediction) {
    setPreds((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: pick },
    }))
  }

  function setWinner(slug: string) {
    setPreds((prev) => ({ ...prev, winner: slug }))
  }

  function submitAll() {
    setPreds((prev) => ({ ...prev, submittedAt: new Date().toISOString() }))
    setShowShare(true)
  }

  function resetAll() {
    setPreds({ matches: {}, winner: null, topScorer: null, darkHorse: null, submittedAt: null })
    setShowShare(false)
  }

  async function handleShare() {
    const text = generateShareText(preds, matches, contenders)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My World Cup 2026 Predictions', text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
            {Object.keys(preds.matches).length} / {matches.length} Predictions Made
          </span>
          <span className="font-mono text-sm font-bold text-primary">{completionPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#e9c400] transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color="#a0d494" />
          <div className="font-headline text-2xl text-primary">{score.total}</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Prediction Points</span>
        </GlassCard>
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color="#e9c400" />
          <div className="font-headline text-2xl" style={{ color: '#e9c400' }}>{score.boldPicks}</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Bold Picks</span>
        </GlassCard>
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color="#ffb4aa" />
          <div className="font-headline text-2xl" style={{ color: '#ffb4aa' }}>{score.agreePct}%</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Agree with AI</span>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8">
        {(['matches', 'champion', 'results'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-primary text-on-primary'
                : 'bg-white/[0.05] text-on-surface-variant hover:bg-white/[0.08]'
            }`}
          >
            {t === 'matches' ? 'Match Predictions' : t === 'champion' ? 'Pick Champion' : 'My Picks'}
          </button>
        ))}
      </div>

      {/* Match Predictions Tab */}
      {tab === 'matches' && (
        <>
          {/* Group Stage */}
          {groupMatches.length > 0 && (
            <div className="mb-10">
              <h2 className="font-headline text-xl uppercase tracking-wide mb-4 flex items-center gap-2">
                Group Stage Highlights
                <Badge variant="primary" size="sm">{groupMatches.length} matches</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupMatches.map((match) => (
                  <MatchPredictionCard
                    key={match.id}
                    match={match}
                    pick={preds.matches[match.id] || null}
                    onPick={(p) => setPick(match.id, p)}
                    locked={!!preds.submittedAt}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Knockout */}
          {knockoutMatches.length > 0 && (
            <div className="mb-10">
              <h2 className="font-headline text-xl uppercase tracking-wide mb-4 flex items-center gap-2">
                Dream Knockout Matchups
                <Badge variant="secondary" size="sm">{knockoutMatches.length} matches</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {knockoutMatches.map((match) => (
                  <MatchPredictionCard
                    key={match.id}
                    match={match}
                    pick={preds.matches[match.id] || null}
                    onPick={(p) => setPick(match.id, p)}
                    locked={!!preds.submittedAt}
                    isKnockout
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Champion Tab */}
      {tab === 'champion' && (
        <div className="mb-10">
          <h2 className="font-headline text-xl uppercase tracking-wide mb-2">
            Who Lifts the Trophy?
          </h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Pick the team you think will win the 2026 FIFA World Cup.
          </p>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {contenders.map((team) => {
              const isSelected = preds.winner === team.slug
              return (
                <button
                  key={team.slug}
                  onClick={() => !preds.submittedAt && setWinner(team.slug)}
                  disabled={!!preds.submittedAt}
                  className={`relative glass-panel rounded-xl border p-4 text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-white/[0.06] hover:border-white/15'
                  } ${preds.submittedAt ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[10px] text-on-primary font-bold">{'\u2713'}</span>
                    </div>
                  )}
                  <div className="text-3xl mb-1">{team.flag}</div>
                  <div className="font-label text-xs font-semibold uppercase tracking-wide text-on-surface">
                    {team.name}
                  </div>
                  <div className="font-mono text-[10px] text-on-surface-variant mt-1">
                    #{team.fifaRanking}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {tab === 'results' && (
        <div className="mb-10">
          <h2 className="font-headline text-xl uppercase tracking-wide mb-6">My Prediction Summary</h2>

          {preds.winner && (
            <GlassCard className="p-6 mb-6 relative overflow-hidden">
              <NeonAccentBar color="#ffd700" />
              <div className="text-center">
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">My Champion Pick</span>
                <div className="text-4xl mt-2 mb-1">
                  {contenders.find((c) => c.slug === preds.winner)?.flag}
                </div>
                <div className="font-headline text-2xl uppercase tracking-tight">
                  {contenders.find((c) => c.slug === preds.winner)?.name}
                </div>
              </div>
            </GlassCard>
          )}

          <div className="space-y-2">
            {matches.map((match) => {
              const pick = preds.matches[match.id]
              if (!pick) return null
              const pickedTeam =
                pick === 'home' ? `${match.homeFlag} ${match.homeTeamName}` :
                pick === 'away' ? `${match.awayFlag} ${match.awayTeamName}` : 'Draw'

              const aiPick =
                match.homeWinProb > match.awayWinProb && match.homeWinProb > match.drawProb
                  ? 'home'
                  : match.awayWinProb > match.homeWinProb && match.awayWinProb > match.drawProb
                    ? 'away'
                    : 'draw'
              const agreeWithAI = pick === aiPick

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant w-20 shrink-0">
                      {match.group ? `Group ${match.group}` : match.round}
                    </span>
                    <span className="text-sm text-on-surface truncate">
                      {match.homeTeamName} vs {match.awayTeamName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-label text-xs font-bold text-primary">{pickedTeam}</span>
                    {agreeWithAI ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">AI agrees</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Bold pick</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {Object.keys(preds.matches).length === 0 && !preds.winner && (
            <div className="text-center py-12 text-on-surface-variant">
              No predictions yet. Start picking winners!
            </div>
          )}
        </div>
      )}

      {/* Submit / Share / Reset */}
      <div className="flex flex-wrap items-center gap-3 mb-12">
        {!preds.submittedAt && Object.keys(preds.matches).length > 0 && (
          <button
            onClick={submitAll}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Lock In Predictions
          </button>
        )}
        {preds.submittedAt && (
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            {copied ? 'Copied!' : 'Share My Picks'}
          </button>
        )}
        {Object.keys(preds.matches).length > 0 && (
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Share Modal */}
      {showShare && (
        <GlassCard className="p-8 mb-12 text-center relative overflow-hidden">
          <NeonAccentBar color="#ffd700" />
          <h3 className="font-headline text-2xl uppercase tracking-tight mb-2">Predictions Locked!</h3>
          <p className="text-on-surface-variant text-sm mb-4">
            Your picks are saved. Share them to challenge your friends!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {copied ? 'Copied to clipboard!' : 'Share Predictions'}
            </button>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              Discuss in Community
            </Link>
          </div>
        </GlassCard>
      )}
    </>
  )
}

/** Individual match prediction card */
function MatchPredictionCard({
  match,
  pick,
  onPick,
  locked,
  isKnockout,
}: {
  match: MatchData
  pick: Prediction | null
  onPick: (p: Prediction) => void
  locked: boolean
  isKnockout?: boolean
}) {
  const roundColor = isKnockout
    ? match.round === 'Final' ? '#ffd700' : match.round === 'Semifinal' ? '#ce93d8' : '#ff8a65'
    : '#a0d494'

  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <NeonAccentBar color={roundColor} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[10px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `${roundColor}20`, color: roundColor }}
        >
          {match.group ? `Group ${match.group}` : match.round}
        </span>
        <span className="text-[10px] text-on-surface-variant">{match.city}</span>
      </div>

      {/* Teams + Pick Buttons */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <button
          onClick={() => !locked && onPick('home')}
          disabled={locked}
          className={`flex-1 py-3 px-2 rounded-xl text-center transition-all ${
            pick === 'home'
              ? 'bg-primary/15 ring-1 ring-primary/40'
              : 'bg-white/[0.03] hover:bg-white/[0.06]'
          } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="text-2xl mb-1">{match.homeFlag}</div>
          <div className="font-label text-xs font-semibold uppercase tracking-wide text-on-surface">
            {match.homeTeamName}
          </div>
          <div className="font-mono text-[10px] text-on-surface-variant mt-1">
            {Math.round(match.homeWinProb * 100)}%
          </div>
        </button>

        {/* Draw (only for group stage) */}
        {match.group && (
          <button
            onClick={() => !locked && onPick('draw')}
            disabled={locked}
            className={`py-3 px-3 rounded-xl text-center transition-all ${
              pick === 'draw'
                ? 'bg-primary/15 ring-1 ring-primary/40'
                : 'bg-white/[0.03] hover:bg-white/[0.06]'
            } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="text-xl mb-1">{'\u{1F91D}'}</div>
            <div className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Draw
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant mt-1">
              {Math.round(match.drawProb * 100)}%
            </div>
          </button>
        )}

        {/* Away */}
        <button
          onClick={() => !locked && onPick('away')}
          disabled={locked}
          className={`flex-1 py-3 px-2 rounded-xl text-center transition-all ${
            pick === 'away'
              ? 'bg-primary/15 ring-1 ring-primary/40'
              : 'bg-white/[0.03] hover:bg-white/[0.06]'
          } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="text-2xl mb-1">{match.awayFlag}</div>
          <div className="font-label text-xs font-semibold uppercase tracking-wide text-on-surface">
            {match.awayTeamName}
          </div>
          <div className="font-mono text-[10px] text-on-surface-variant mt-1">
            {Math.round(match.awayWinProb * 100)}%
          </div>
        </button>
      </div>

      {/* AI Insight */}
      <div className="mt-3 text-center">
        <span className="text-[10px] text-on-surface-variant">
          AI favors{' '}
          <span className="text-primary font-bold">
            {match.homeWinProb > match.awayWinProb ? match.homeTeamName : match.awayTeamName}
          </span>
          {' '}({Math.round(Math.max(match.homeWinProb, match.awayWinProb) * 100)}%)
        </span>
      </div>
    </GlassCard>
  )
}
