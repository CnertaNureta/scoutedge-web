'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'

interface Match {
  id: string
  round: string
  group_code: string | null
  home_team: { slug: string; name: string; flag: string } | null
  away_team: { slug: string; name: string; flag: string } | null
  home_placeholder_slug: string | null
  away_placeholder_slug: string | null
  kickoff_utc: string
  match_status: string
}

interface UserPrediction {
  id: string
  match_id: string
  predicted_outcome: 'home' | 'draw' | 'away'
  predicted_home_score: number
  predicted_away_score: number
  prediction_scores: Array<{ points_awarded: number; accuracy_type: string }> | null
}

interface PredictionForm {
  outcome: 'home' | 'draw' | 'away' | null
  homeScore: number
  awayScore: number
}

export default function PredictPage() {
  const { user, loading: authLoading } = useAuth()
  const { apiFetch, isAuthenticated } = useApi()
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<string, UserPrediction>>(new Map())
  const [forms, setForms] = useState<Map<string, PredictionForm>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/context')
      const ctx = await res.json()

      if (ctx.matches) {
        setMatches(ctx.matches.filter((m: Match) => m.match_status === 'scheduled'))
      }

      if (isAuthenticated) {
        const predData = await apiFetch('/api/predictions/my')
        const predMap = new Map<string, UserPrediction>()
        for (const p of predData.predictions) {
          predMap.set(p.match_id, p)
        }
        setPredictions(predMap)
      }
    } catch {
      // fall through
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, apiFetch])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  function getForm(matchId: string): PredictionForm {
    const existing = forms.get(matchId)
    if (existing) return existing

    const pred = predictions.get(matchId)
    if (pred) {
      return { outcome: pred.predicted_outcome, homeScore: pred.predicted_home_score, awayScore: pred.predicted_away_score }
    }
    return { outcome: null, homeScore: 0, awayScore: 0 }
  }

  function updateForm(matchId: string, update: Partial<PredictionForm>) {
    const current = getForm(matchId)
    const next = { ...current, ...update }

    if (update.outcome === 'home' && next.homeScore <= next.awayScore) {
      next.homeScore = next.awayScore + 1
    } else if (update.outcome === 'away' && next.awayScore <= next.homeScore) {
      next.awayScore = next.homeScore + 1
    } else if (update.outcome === 'draw') {
      next.awayScore = next.homeScore
    }

    if (update.homeScore !== undefined || update.awayScore !== undefined) {
      if (next.homeScore > next.awayScore) next.outcome = 'home'
      else if (next.awayScore > next.homeScore) next.outcome = 'away'
      else next.outcome = 'draw'
    }

    setForms(new Map(forms).set(matchId, next))
  }

  async function submitPrediction(matchId: string) {
    const form = getForm(matchId)
    if (!form.outcome) return

    setSubmitting(matchId)
    try {
      const data = await apiFetch('/api/predictions', {
        method: 'POST',
        body: JSON.stringify({
          match_id: matchId,
          predicted_outcome: form.outcome,
          predicted_home_score: form.homeScore,
          predicted_away_score: form.awayScore,
        }),
      })
      setPredictions(new Map(predictions).set(matchId, data.prediction))
    } catch {
      // error handled in UI
    } finally {
      setSubmitting(null)
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <GlassCard className="p-8 text-center">
          <h1 className="font-display text-3xl text-primary mb-3">Match Predictions</h1>
          <p className="text-on-surface-variant mb-6">Sign in to make your predictions for upcoming matches.</p>
          <Link href="/auth/login" className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all">
            Sign In
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-primary">Predict</h1>
        <p className="text-on-surface-variant mt-2">
          Pick your scores for upcoming matches. Predictions lock at kickoff.
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/[0.08] p-6 animate-pulse">
              <div className="h-6 bg-white/[0.06] rounded w-2/3 mb-4" />
              <div className="h-16 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && matches.length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-on-surface-variant text-lg">No upcoming matches available for predictions.</p>
        </GlassCard>
      )}

      <div className="space-y-4">
        {matches.map(match => {
          const form = getForm(match.id)
          const existing = predictions.get(match.id)
          const kickoff = new Date(match.kickoff_utc)
          const isLocked = kickoff <= new Date()
          const homeName = match.home_team?.name ?? match.home_placeholder_slug ?? 'TBD'
          const awayName = match.away_team?.name ?? match.away_placeholder_slug ?? 'TBD'
          const homeFlag = match.home_team?.flag ?? ''
          const awayFlag = match.away_team?.flag ?? ''

          return (
            <GlassCard key={match.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span>{match.round}</span>
                  {match.group_code && <span>Group {match.group_code}</span>}
                </div>
                <time className="text-xs text-on-surface-variant">
                  {kickoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                  {kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex-1 text-right">
                  <span className="text-2xl mr-2">{homeFlag}</span>
                  <span className={`font-headline text-lg ${form.outcome === 'home' ? 'text-primary' : 'text-on-surface'}`}>
                    {homeName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={isLocked}
                    onClick={() => updateForm(match.id, { homeScore: Math.max(0, form.homeScore - 1) })}
                    className="w-8 h-8 rounded-lg bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono text-2xl font-bold text-primary w-8 text-center">{form.homeScore}</span>
                  <span className="text-on-surface-variant font-bold">:</span>
                  <span className="font-mono text-2xl font-bold text-primary w-8 text-center">{form.awayScore}</span>
                  <button
                    disabled={isLocked}
                    onClick={() => updateForm(match.id, { awayScore: Math.max(0, form.awayScore - 1) })}
                    className="w-8 h-8 rounded-lg bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                  >
                    -
                  </button>
                </div>

                <div className="flex-1">
                  <span className={`font-headline text-lg ${form.outcome === 'away' ? 'text-primary' : 'text-on-surface'}`}>
                    {awayName}
                  </span>
                  <span className="text-2xl ml-2">{awayFlag}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                {(['home', 'draw', 'away'] as const).map(outcome => (
                  <button
                    key={outcome}
                    disabled={isLocked}
                    onClick={() => updateForm(match.id, { outcome })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                      form.outcome === outcome
                        ? 'bg-primary text-on-primary'
                        : 'bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.1]'
                    } disabled:opacity-30`}
                  >
                    {outcome === 'home' ? homeName.slice(0, 3) : outcome === 'away' ? awayName.slice(0, 3) : 'Draw'}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                {existing && (
                  <span className="text-xs text-emerald-400 font-bold">
                    Prediction saved
                  </span>
                )}
                {isLocked ? (
                  <span className="text-xs text-amber-400 font-bold ml-auto">Locked</span>
                ) : (
                  <button
                    onClick={() => submitPrediction(match.id)}
                    disabled={!form.outcome || submitting === match.id}
                    className="ml-auto px-5 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {submitting === match.id ? 'Saving...' : existing ? 'Update' : 'Submit'}
                  </button>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
