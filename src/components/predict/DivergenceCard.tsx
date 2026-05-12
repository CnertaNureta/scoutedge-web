'use client'

import React, { useState, useId, useCallback, useRef } from 'react'
import type { FullPrediction, ProbDict } from '@/lib/prediction-bridge'
import { postDivergenceFeedback } from '@/lib/prediction-bridge'
import './divergence-card.css'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DivergenceCardProps {
  matchId: string
  prediction: FullPrediction
  userId: string
  initialExpanded?: boolean
  onAction?: (action: 'agreed' | 'challenged' | 'shared' | 'dismissed') => void
  className?: string
}

type ChallengeReason = 'late_intel' | 'model_stale' | 'sharp_money' | 'other'

type DivergenceLevel = 'agree' | 'mild' | 'strong'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveDivergenceLevel(prediction: FullPrediction): DivergenceLevel {
  const features = prediction.divergence_features
  if (features?.consensus_flag === true) return 'agree'
  const kl = typeof features?.max_pairwise_kl === 'number' ? features.max_pairwise_kl : 0
  return kl > 0.06 ? 'strong' : 'mild'
}

function headlineText(level: DivergenceLevel): string {
  if (level === 'agree') return 'Three sources agree'
  if (level === 'strong') return 'Strong divergence'
  return 'Mild divergence'
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

function metricValue(raw: unknown): string {
  if (typeof raw === 'number') return raw.toFixed(3)
  return '—'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MiniVisualProps {
  ml: ProbDict
  sb: ProbDict
  poly: ProbDict | null
}

function MiniVisual({ ml, sb, poly }: MiniVisualProps) {
  const rows = [
    { label: 'ML', probs: ml },
    { label: 'SB', probs: sb },
    poly ? { label: 'Poly', probs: poly } : null,
  ].filter(Boolean) as Array<{ label: string; probs: ProbDict }>

  return (
    <div className="dc-mini-visual" aria-hidden="true">
      {rows.map((row) => (
        <div key={row.label} className="dc-mini-row">
          <span
            className="dc-mini-seg dc-mini-seg--home"
            style={{ width: toPercent(row.probs.home_win) }}
          />
          <span
            className="dc-mini-seg dc-mini-seg--draw"
            style={{ width: toPercent(row.probs.draw) }}
          />
          <span
            className="dc-mini-seg dc-mini-seg--away"
            style={{ width: toPercent(row.probs.away_win) }}
          />
        </div>
      ))}
    </div>
  )
}

interface ProbBarProps {
  label: string
  probs: ProbDict
}

function ProbBar({ label, probs }: ProbBarProps) {
  return (
    <div className="dc-bar-row">
      <span className="dc-bar-label">{label}</span>
      <div
        className="dc-bar-track"
        role="group"
        aria-label={`${label} probabilities: home ${pct(probs.home_win)}, draw ${pct(probs.draw)}, away ${pct(probs.away_win)}`}
      >
        <span
          className="dc-bar-seg dc-bar-seg--home"
          style={{ width: toPercent(probs.home_win) }}
        />
        <span
          className="dc-bar-seg dc-bar-seg--draw"
          style={{ width: toPercent(probs.draw) }}
        />
        <span
          className="dc-bar-seg dc-bar-seg--away"
          style={{ width: toPercent(probs.away_win) }}
        />
      </div>
      <div className="dc-bar-pcts" aria-hidden="true">
        <span className="dc-pct-home">{pct(probs.home_win)}</span>
        <span className="dc-pct-draw">{pct(probs.draw)}</span>
        <span className="dc-pct-away">{pct(probs.away_win)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Challenge panel
// ---------------------------------------------------------------------------

interface ChallengeState {
  home: string
  draw: string
  away: string
  reason: ChallengeReason
  notes: string
}

const DEFAULT_CHALLENGE: ChallengeState = {
  home: '',
  draw: '',
  away: '',
  reason: 'late_intel',
  notes: '',
}

function parseProb(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function sumOk(s: ChallengeState): boolean {
  const total = parseProb(s.home) + parseProb(s.draw) + parseProb(s.away)
  return Math.abs(total - 1.0) <= 0.01
}

function allFilled(s: ChallengeState): boolean {
  return s.home !== '' && s.draw !== '' && s.away !== ''
}

interface ChallengePanelProps {
  panelId: string
  onSubmit: (state: ChallengeState) => void
  onCancel: () => void
  isSubmitting: boolean
}

function ChallengePanel({ panelId, onSubmit, onCancel, isSubmitting }: ChallengePanelProps) {
  const [state, setState] = useState<ChallengeState>(DEFAULT_CHALLENGE)

  const validSum = allFilled(state) ? sumOk(state) : true
  const canSubmit = allFilled(state) && sumOk(state) && !isSubmitting

  const handleChange = useCallback(
    (field: keyof ChallengeState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setState((prev) => ({ ...prev, [field]: e.target.value }))
      },
    [],
  )

  return (
    <div id={panelId} className="dc-challenge-panel" role="region" aria-label="Submit challenge">
      <p className="dc-challenge-title">Your alternative probabilities</p>

      <div className="dc-prob-inputs">
        {(
          [
            { field: 'home', label: 'Home win' },
            { field: 'draw', label: 'Draw' },
            { field: 'away', label: 'Away win' },
          ] as const
        ).map(({ field, label }) => (
          <div key={field} className="dc-prob-field">
            <label htmlFor={`${panelId}-${field}`}>{label}</label>
            <input
              id={`${panelId}-${field}`}
              type="number"
              min="0"
              max="1"
              step="0.01"
              className={`dc-input${allFilled(state) && !validSum ? ' dc-input--error' : ''}`}
              value={state[field]}
              onChange={handleChange(field)}
              placeholder="0.00"
              aria-label={label}
            />
          </div>
        ))}
      </div>

      {allFilled(state) && (
        <p className={`dc-sum-hint${!validSum ? ' dc-sum-hint--error' : ''}`}>
          {validSum
            ? `Sum: ${(parseProb(state.home) + parseProb(state.draw) + parseProb(state.away)).toFixed(2)} ✓`
            : `Sum must equal 1.00 (current: ${(parseProb(state.home) + parseProb(state.draw) + parseProb(state.away)).toFixed(2)})`}
        </p>
      )}

      <div className="dc-reason-field">
        <label htmlFor={`${panelId}-reason`}>Reason</label>
        <select
          id={`${panelId}-reason`}
          className="dc-select"
          value={state.reason}
          onChange={handleChange('reason')}
        >
          <option value="late_intel">Late intel</option>
          <option value="model_stale">Model stale</option>
          <option value="sharp_money">Sharp money</option>
          <option value="other">Other</option>
        </select>
      </div>

      {state.reason === 'other' && (
        <div className="dc-reason-field">
          <label htmlFor={`${panelId}-notes`}>Additional notes</label>
          <textarea
            id={`${panelId}-notes`}
            className="dc-textarea"
            value={state.notes}
            onChange={handleChange('notes')}
            placeholder="Describe your reasoning…"
            rows={3}
          />
        </div>
      )}

      <div className="dc-challenge-actions">
        <button type="button" className="dc-cta dc-cta--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="dc-cta dc-cta--submit"
          onClick={() => onSubmit(state)}
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
        >
          {isSubmitting ? 'Sending…' : 'Submit challenge'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DivergenceCard({
  matchId,
  prediction,
  userId,
  initialExpanded = false,
  onAction,
  className = '',
}: DivergenceCardProps): React.JSX.Element {
  const uid = useId()
  const bodyId = `${uid}-body`
  const challengePanelId = `${uid}-challenge`

  const [expanded, setExpanded] = useState(initialExpanded)
  const [showChallenge, setShowChallenge] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const level = deriveDivergenceLevel(prediction)
  const headline = headlineText(level)

  const features = prediction.divergence_features

  const diagnosisText: string | null = (() => {
    if (!prediction.diagnosis) return null
    const d = prediction.diagnosis
    if (typeof d['summary'] === 'string') return d['summary']
    if (typeof d['text'] === 'string') return d['text']
    return null
  })()

  // ---- Event handlers ----

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const showToast = useCallback(() => {
    setToastVisible(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200)
  }, [])

  const handleAgree = useCallback(async () => {
    try {
      await postDivergenceFeedback({
        match_id: matchId,
        user_id: userId,
        agreed: true,
      })
    } catch {
      // Best-effort; fire-and-forget
    }
    onAction?.('agreed')
  }, [matchId, userId, onAction])

  const handleChallenge = useCallback(() => {
    setShowChallenge((prev) => !prev)
  }, [])

  const handleChallengeSubmit = useCallback(
    async (state: ChallengeState) => {
      setIsSubmitting(true)
      try {
        await postDivergenceFeedback({
          match_id: matchId,
          user_id: userId,
          agreed: false,
          comment: JSON.stringify({
            challenge_reason: state.reason,
            challenge_alternative_probs: {
              home_win: parseProb(state.home),
              draw: parseProb(state.draw),
              away_win: parseProb(state.away),
            },
            notes: state.notes,
          }),
        })
      } catch {
        // Best-effort
      } finally {
        setIsSubmitting(false)
        setShowChallenge(false)
        onAction?.('challenged')
      }
    },
    [matchId, userId, onAction],
  )

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title: headline, url })
      } catch {
        // User dismissed share sheet
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        showToast()
      } catch {
        // clipboard unavailable
      }
    }
    onAction?.('shared')
  }, [headline, onAction, showToast])

  const handleCancelChallenge = useCallback(() => {
    setShowChallenge(false)
  }, [])

  // ---- Render ----

  return (
    <article className={`dc-root${className ? ` ${className}` : ''}`}>
      {/* Toast */}
      <div
        className={`dc-toast${toastVisible ? ' dc-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Link copied
      </div>

      {/* Header / toggle button */}
      <button
        type="button"
        className="dc-header"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={handleToggle}
      >
        <MiniVisual
          ml={prediction.ml_probs}
          sb={prediction.sb_probs}
          poly={prediction.poly_probs}
        />

        <div className="dc-headline">
          <p className="dc-headline-text">{headline}</p>
          <p className="dc-headline-sub">Source divergence</p>
        </div>

        <span
          className={`dc-badge dc-badge--${level}`}
          aria-label={level === 'agree' ? 'Sources agree' : level === 'strong' ? 'Strong divergence' : 'Mild divergence'}
        >
          {level === 'agree' ? '✓ Agree' : level === 'strong' ? '⚡ Strong' : '~ Mild'}
        </span>

        <svg
          className={`dc-chevron${expanded ? ' dc-chevron--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expanded body */}
      <div
        id={bodyId}
        className={`dc-body${expanded ? ' dc-body--open' : ''}`}
        role="region"
        aria-label="Divergence details"
      >
        <div className="dc-body-inner">
          <hr className="dc-divider" aria-hidden="true" />

          {/* Probability bar stack */}
          <section aria-label="Probability bars" className="dc-bars">
            <ProbBar label="ML" probs={prediction.ml_probs} />
            <ProbBar label="SB" probs={prediction.sb_probs} />
            {prediction.poly_probs && <ProbBar label="Poly" probs={prediction.poly_probs} />}
          </section>

          {/* Diagnosis paragraph */}
          {diagnosisText && (
            <p className="dc-diagnosis" role="note">
              {diagnosisText}
            </p>
          )}

          {/* Divergence metrics */}
          <section aria-label="Divergence metrics" className="dc-metrics">
            <div className="dc-metric">
              <p className="dc-metric-value">
                {metricValue(features?.max_pairwise_kl)}
              </p>
              <p className="dc-metric-label">Max KL</p>
            </div>
            <div className="dc-metric">
              <p className="dc-metric-value">
                {metricValue(features?.ml_sb_kl)}
              </p>
              <p className="dc-metric-label">ML↔SB</p>
            </div>
            {prediction.poly_probs && (
              <div className="dc-metric">
                <p className="dc-metric-value">
                  {metricValue(features?.ml_poly_kl)}
                </p>
                <p className="dc-metric-label">ML↔Poly</p>
              </div>
            )}
            <div className="dc-metric">
              <p className="dc-metric-value">
                {prediction.confidence}
              </p>
              <p className="dc-metric-label">Confidence</p>
            </div>
          </section>

          <hr className="dc-divider" aria-hidden="true" />

          {/* CTAs */}
          <div className="dc-ctas" role="group" aria-label="Prediction actions">
            <button
              type="button"
              className="dc-cta dc-cta--agree"
              onClick={() => void handleAgree()}
              aria-label="Agree with AI prediction"
            >
              ✓ Agree with AI
            </button>

            <button
              type="button"
              className="dc-cta dc-cta--challenge"
              onClick={handleChallenge}
              aria-expanded={showChallenge}
              aria-controls={challengePanelId}
              aria-label="Challenge this prediction"
            >
              ⚡ Challenge
            </button>

            <button
              type="button"
              className="dc-cta dc-cta--share"
              onClick={() => void handleShare()}
              aria-label="Share this prediction"
            >
              ↗ Share
            </button>
          </div>

          {/* Challenge inline panel */}
          {showChallenge && (
            <ChallengePanel
              panelId={challengePanelId}
              onSubmit={(s) => void handleChallengeSubmit(s)}
              onCancel={handleCancelChallenge}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export default DivergenceCard
