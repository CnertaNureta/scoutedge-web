'use client'

import React, { useState, useCallback, useId } from 'react'
import type { FullPrediction } from '@/lib/prediction-bridge'
import { postDuelSubmit } from '@/lib/prediction-bridge'
import './duel-card.css'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Confidence = 'low' | 'medium' | 'high'
export type Outcome = 'home_win' | 'draw' | 'away_win'

export interface ExistingDuelSubmission {
  user_prediction_id: string
  home_score: number
  away_score: number
  prob_home: number
  prob_draw: number
  prob_away: number
  confidence_level: Confidence
  ai_snapshot: Record<string, unknown>
  locked_until: string // ISO
}

export interface DuelCardProps {
  matchId: string
  userId: string
  aiPrediction: FullPrediction
  kickoffUtc: string // ISO; used for kickoff-lock UI
  existing?: ExistingDuelSubmission
  onSubmitted?: (sub: ExistingDuelSubmission) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

/**
 * Auto-renormalize probabilities so they sum to 1.0.
 * When one slider moves, the remaining two are scaled proportionally.
 * If the remaining two are both 0, they split the remainder equally.
 */
function renorm(
  changed: 'prob_home' | 'prob_draw' | 'prob_away',
  newVal: number,
  current: { prob_home: number; prob_draw: number; prob_away: number },
): { prob_home: number; prob_draw: number; prob_away: number } {
  const clamped = Math.min(1, Math.max(0, newVal))
  const remainder = 1 - clamped

  const keys = ['prob_home', 'prob_draw', 'prob_away'] as const
  const others = keys.filter((k) => k !== changed)

  const otherSum = others.reduce((acc, k) => acc + current[k], 0)

  const updated = { ...current, [changed]: clamped }

  if (otherSum <= 0) {
    // Split remainder equally
    const share = remainder / others.length
    for (const k of others) {
      updated[k] = share
    }
  } else {
    for (const k of others) {
      updated[k] = Math.max(0, (current[k] / otherSum) * remainder)
    }
  }

  return updated
}

function confidenceLabel(c: Confidence): string {
  if (c === 'high') return '🔥 High'
  if (c === 'medium') return '⚖️ Medium'
  return '❓ Low'
}

// ---------------------------------------------------------------------------
// Sub-component: probability bar
// ---------------------------------------------------------------------------

interface ProbBarProps {
  probHome: number
  probDraw: number
  probAway: number
  side: 'ai' | 'human'
}

function ProbBar({ probHome, probDraw, probAway, side }: ProbBarProps): React.JSX.Element {
  const barLabel = `${side === 'ai' ? 'AI' : 'Your'} probabilities — home ${pct(probHome)}, draw ${pct(probDraw)}, away ${pct(probAway)}`
  return (
    <div className="duel-probbar">
      <div
        className="duel-probbar-track"
        role="img"
        aria-label={barLabel}
      >
        <span
          className="duel-probbar-seg duel-probbar-seg--home"
          style={{ width: pct(probHome) }}
        />
        <span
          className="duel-probbar-seg duel-probbar-seg--draw"
          style={{ width: pct(probDraw) }}
        />
        <span
          className="duel-probbar-seg duel-probbar-seg--away"
          style={{ width: pct(probAway) }}
        />
      </div>
      <div className="duel-probbar-labels" aria-hidden="true">
        <span>{pct(probHome)}</span>
        <span>{pct(probDraw)}</span>
        <span>{pct(probAway)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: locked scoreboard view
// ---------------------------------------------------------------------------

interface ScoreboardProps {
  submission: ExistingDuelSubmission
  aiPrediction: FullPrediction
  matchId: string
  formId: string
}

function Scoreboard({ submission, aiPrediction, matchId, formId }: ScoreboardProps): React.JSX.Element {
  const confPct = Math.round(
    (submission.confidence_level === 'high'
      ? 0.85
      : submission.confidence_level === 'medium'
        ? 0.65
        : 0.4) * 100,
  )

  return (
    <div className="duel-scoreboard">
      {/* Side-by-side comparison */}
      <div className="duel-sides">
        {/* AI side */}
        <div className="duel-side duel-side--ai">
          <span className="duel-side-label">🤖 AI</span>
          <ProbBar
            probHome={aiPrediction.final_probs.home_win}
            probDraw={aiPrediction.final_probs.draw}
            probAway={aiPrediction.final_probs.away_win}
            side="ai"
          />
        </div>

        <div className="duel-side-divider" aria-hidden="true">vs</div>

        {/* Human side */}
        <div className="duel-side duel-side--human">
          <span className="duel-side-label">👤 You</span>
          <ProbBar
            probHome={submission.prob_home}
            probDraw={submission.prob_draw}
            probAway={submission.prob_away}
            side="human"
          />
        </div>
      </div>

      {/* User call summary */}
      <div className="duel-user-call" role="note">
        Your call:{' '}
        <strong>
          {submission.home_score}–{submission.away_score}
        </strong>{' '}
        ({confPct}% confident)
      </div>

      {/* Accessible announcement for locked state */}
      <div
        id={formId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="duel-locked-announcement"
      >
        Prediction locked for match {matchId}. Locked until{' '}
        {new Date(submission.locked_until).toLocaleString()}.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FormState {
  home_score: number
  away_score: number
  prob_home: number
  prob_draw: number
  prob_away: number
  confidence_level: Confidence
}

const DEFAULT_FORM: FormState = {
  home_score: 1,
  away_score: 1,
  prob_home: 0.34,
  prob_draw: 0.33,
  prob_away: 0.33,
  confidence_level: 'medium',
}

export function DuelCard({
  matchId,
  userId,
  aiPrediction,
  kickoffUtc,
  existing,
  onSubmitted,
  className = '',
}: DuelCardProps): React.JSX.Element {
  const uid = useId()
  const formId = `${uid}-form`
  const homeScoreId = `${uid}-home-score`
  const awayScoreId = `${uid}-away-score`
  const probHomeId = `${uid}-prob-home`
  const probDrawId = `${uid}-prob-draw`
  const probAwayId = `${uid}-prob-away`

  const isLocked = existing != null || new Date(kickoffUtc).getTime() <= Date.now()

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submission, setSubmission] = useState<ExistingDuelSubmission | undefined>(existing)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Score validation
  const homeScoreValid =
    Number.isInteger(form.home_score) && form.home_score >= 0 && form.home_score <= 9
  const awayScoreValid =
    Number.isInteger(form.away_score) && form.away_score >= 0 && form.away_score <= 9
  const probSum = form.prob_home + form.prob_draw + form.prob_away
  const probSumValid = Math.abs(probSum - 1.0) <= 0.001
  const canSubmit = homeScoreValid && awayScoreValid && probSumValid && !isSubmitting

  // ---- Handlers ----

  const handleScoreChange = useCallback(
    (field: 'home_score' | 'away_score') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = parseInt(e.target.value, 10)
        const val = isNaN(raw) ? 0 : raw
        setForm((prev) => ({ ...prev, [field]: val }))
      },
    [],
  )

  const handleSliderChange = useCallback(
    (field: 'prob_home' | 'prob_draw' | 'prob_away') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = parseFloat(e.target.value)
        setForm((prev) => ({
          ...prev,
          ...renorm(field, newVal, prev),
        }))
      },
    [],
  )

  const handleConfidence = useCallback((c: Confidence) => {
    setForm((prev) => ({ ...prev, confidence_level: c }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await postDuelSubmit({
        match_id: matchId,
        user_id: userId,
        home_score: form.home_score,
        away_score: form.away_score,
        prob_home: form.prob_home,
        prob_draw: form.prob_draw,
        prob_away: form.prob_away,
        confidence_level: form.confidence_level,
      })

      // Build local ExistingDuelSubmission from form + server response.
      const sub: ExistingDuelSubmission = {
        user_prediction_id: response.user_prediction_id,
        home_score: form.home_score,
        away_score: form.away_score,
        prob_home: form.prob_home,
        prob_draw: form.prob_draw,
        prob_away: form.prob_away,
        confidence_level: form.confidence_level,
        ai_snapshot: response.ai_snapshot,
        locked_until: kickoffUtc,
      }

      setSubmission(sub)
      onSubmitted?.(sub)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed — please retry.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, matchId, userId, form, kickoffUtc, onSubmitted])

  // ---- Determine display state ----

  const locked = submission != null || isLocked

  return (
    <article className={`duel-root${className ? ` ${className}` : ''}`}>
      {/* Header */}
      <header className="duel-header">
        <div>
          <p className="duel-versus">🤖 vs 👤</p>
          <p className="duel-match-id">{matchId}</p>
        </div>
        {locked && (
          <span className="duel-lock-badge" aria-label="Prediction locked until kickoff">
            🔒 Locked until kickoff
          </span>
        )}
      </header>

      {/* Body */}
      {locked && submission ? (
        <Scoreboard
          submission={submission}
          aiPrediction={aiPrediction}
          matchId={matchId}
          formId={formId}
        />
      ) : locked && !submission ? (
        /* Kickoff passed but no submission yet — show locked notice */
        <div className="duel-scoreboard">
          <div
            id={formId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="duel-locked-announcement"
          >
            This match has kicked off. No prediction was submitted.
          </div>
        </div>
      ) : (
        /* Submit form */
        <form
          id={formId}
          className="duel-form"
          role="form"
          aria-label="Submit your duel prediction"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          {/* AI snapshot */}
          <div className="duel-ai-preview" aria-label="AI prediction snapshot">
            <span className="duel-ai-preview-label">🤖 AI prediction</span>
            <div className="duel-ai-preview-probs" aria-label="AI probabilities">
              <span>
                Home
                <strong>{pct(aiPrediction.final_probs.home_win)}</strong>
              </span>
              <span>
                Draw
                <strong>{pct(aiPrediction.final_probs.draw)}</strong>
              </span>
              <span>
                Away
                <strong>{pct(aiPrediction.final_probs.away_win)}</strong>
              </span>
            </div>
          </div>

          {/* Scores */}
          <fieldset className="duel-form-group">
            <legend>Your predicted score</legend>
            <div className="duel-score-inputs">
              <div className="duel-score-field">
                <label htmlFor={homeScoreId}>Home</label>
                <input
                  id={homeScoreId}
                  type="number"
                  className="duel-score-input duel-score-input--home"
                  min={0}
                  max={9}
                  step={1}
                  value={form.home_score}
                  onChange={handleScoreChange('home_score')}
                  aria-label="Home team score"
                />
              </div>
              <span className="duel-score-separator" aria-hidden="true">–</span>
              <div className="duel-score-field">
                <label htmlFor={awayScoreId}>Away</label>
                <input
                  id={awayScoreId}
                  type="number"
                  className="duel-score-input duel-score-input--away"
                  min={0}
                  max={9}
                  step={1}
                  value={form.away_score}
                  onChange={handleScoreChange('away_score')}
                  aria-label="Away team score"
                />
              </div>
            </div>
          </fieldset>

          {/* Probabilities */}
          <fieldset className="duel-form-group">
            <legend>Your outcome probabilities</legend>
            <div className="duel-sliders">
              {(
                [
                  { field: 'prob_home', label: 'Home win', id: probHomeId },
                  { field: 'prob_draw', label: 'Draw', id: probDrawId },
                  { field: 'prob_away', label: 'Away win', id: probAwayId },
                ] as const
              ).map(({ field, label, id }) => (
                <div key={field} className="duel-slider-row">
                  <label htmlFor={id} className="duel-slider-label">
                    {label}
                  </label>
                  <input
                    id={id}
                    type="range"
                    className="duel-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form[field]}
                    onChange={handleSliderChange(field)}
                    aria-label={label}
                    aria-valuetext={pct(form[field])}
                  />
                  <span className="duel-slider-value" aria-hidden="true">
                    {pct(form[field])}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Confidence */}
          <fieldset className="duel-form-group">
            <legend>Confidence level</legend>
            <div className="duel-confidence-group" role="radiogroup" aria-label="Confidence level">
              {(['low', 'medium', 'high'] as const).map((c) => (
                <label key={c} className="duel-radio-label">
                  <input
                    type="radio"
                    name={`${uid}-confidence`}
                    value={c}
                    checked={form.confidence_level === c}
                    onChange={() => handleConfidence(c)}
                    aria-label={`Confidence: ${c}`}
                  />
                  {confidenceLabel(c)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Error */}
          {error && (
            <p className="duel-error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="duel-submit-btn"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <span className="duel-spinner" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              'Submit prediction'
            )}
          </button>
        </form>
      )}
    </article>
  )
}

export default DuelCard
