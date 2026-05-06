'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { postRemix } from '@/lib/prediction-bridge'
import type { FullPrediction } from '@/lib/prediction-bridge'
import './remix-sliders.css'

export type Outcome = 'home_win' | 'draw' | 'away_win'
export type ProbDict = Record<Outcome, number>

export interface RemixSlidersProps {
  matchId: string
  basePrediction: FullPrediction
  onRemix?: (result: {
    final_probs: ProbDict
    weights: Record<string, number>
    overrides: Record<string, number>
  }) => void
  onReset?: () => void
  className?: string
  debounceMs?: number
}

// ---------------------------------------------------------------------------
// Inline useDebounce hook (≤15 lines)
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Slider state shape
// ---------------------------------------------------------------------------

interface SliderValues {
  ml_weight: number
  sb_weight: number
  poly_weight: number
  altitude_modifier: number
  heat_modifier: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OUTCOMES: Outcome[] = ['home_win', 'draw', 'away_win']

function outcomeLabel(o: Outcome): string {
  return o === 'home_win' ? 'Home Win' : o === 'draw' ? 'Draw' : 'Away Win'
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function formatDelta(d: number): string {
  const pct = Math.round(d * 100)
  if (pct === 0) return '±0%'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

/**
 * Proportionally rescale other two weights so that all three weights
 * sum to 1.0. The changed weight is clamped and fixed; the remaining
 * two are scaled relative to their current ratio. If poly is disabled
 * (polyEnabled=false), poly_weight is locked at 0 and only ml/sb
 * are rebalanced.
 */
function rebalanceWeights(
  prev: SliderValues,
  key: 'ml_weight' | 'sb_weight' | 'poly_weight',
  rawValue: number,
  polyEnabled: boolean,
): { next: SliderValues; rebalanced: boolean } {
  const clamped = Math.max(0, Math.min(1, rawValue))

  const keys: Array<'ml_weight' | 'sb_weight' | 'poly_weight'> = polyEnabled
    ? ['ml_weight', 'sb_weight', 'poly_weight']
    : ['ml_weight', 'sb_weight']

  if (!keys.includes(key)) {
    return { next: { ...prev, [key]: clamped }, rebalanced: false }
  }

  const remainder = Math.max(0, 1 - clamped)
  const others = keys.filter((k) => k !== key)
  const otherSum = others.reduce((acc, k) => acc + prev[k], 0)

  const updated: Partial<SliderValues> = { [key]: clamped }

  if (otherSum === 0) {
    // Distribute remainder equally
    const share = remainder / others.length
    others.forEach((k) => (updated[k] = share))
  } else {
    others.forEach((k) => {
      updated[k] = (prev[k] / otherSum) * remainder
    })
  }

  if (!polyEnabled) {
    updated.poly_weight = 0
  }

  const next: SliderValues = { ...prev, ...updated }
  return { next, rebalanced: true }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RemixSliders({
  matchId,
  basePrediction,
  onRemix,
  onReset,
  className = '',
  debounceMs = 350,
}: RemixSlidersProps): React.JSX.Element {
  const polyEnabled = basePrediction.poly_probs !== null

  const defaultSliders = useCallback(
    (): SliderValues => ({
      ml_weight: basePrediction.weights.ml,
      sb_weight: basePrediction.weights.sb,
      poly_weight: basePrediction.weights.poly,
      altitude_modifier: 1.0,
      heat_modifier: 1.0,
    }),
    [basePrediction],
  )

  const [sliders, setSliders] = useState<SliderValues>(defaultSliders)
  const [rebalanced, setRebalanced] = useState(false)
  const [remixedProbs, setRemixedProbs] = useState<ProbDict | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSliders = useDebounce(sliders, debounceMs)
  const abortRef = useRef<AbortController | null>(null)
  const isFirstRender = useRef(true)

  // Fire postRemix whenever debounced sliders change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    const overrides: Record<string, number> = {
      ml_weight: debouncedSliders.ml_weight,
      sb_weight: debouncedSliders.sb_weight,
      poly_weight: debouncedSliders.poly_weight,
      altitude_modifier: debouncedSliders.altitude_modifier,
      heat_modifier: debouncedSliders.heat_modifier,
    }

    postRemix({ match_id: matchId, overrides })
      .then((res) => {
        if (controller.signal.aborted) return
        const probs = res.remixed.final_probs as ProbDict
        setRemixedProbs(probs)
        setError(null)
        onRemix?.({
          final_probs: probs,
          weights: {
            ml_weight: debouncedSliders.ml_weight,
            sb_weight: debouncedSliders.sb_weight,
            poly_weight: debouncedSliders.poly_weight,
          },
          overrides,
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Remix failed. Please try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSliders])

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  function handleWeightChange(key: 'ml_weight' | 'sb_weight' | 'poly_weight', raw: number) {
    const { next, rebalanced: rb } = rebalanceWeights(sliders, key, raw, polyEnabled)
    setSliders(next)
    setRebalanced(rb)
    // Hide rebalance hint after 2s
    if (rb) setTimeout(() => setRebalanced(false), 2000)
  }

  function handleModifierChange(key: 'altitude_modifier' | 'heat_modifier', raw: number) {
    setSliders((prev) => ({ ...prev, [key]: raw }))
  }

  function handleReset() {
    setSliders(defaultSliders())
    setRemixedProbs(null)
    setError(null)
    setRebalanced(false)
    isFirstRender.current = true
    onReset?.()
  }

  const baseProbs = basePrediction.final_probs as ProbDict

  // Compute deltas
  const deltas: ProbDict | null = remixedProbs
    ? {
        home_win: remixedProbs.home_win - baseProbs.home_win,
        draw: remixedProbs.draw - baseProbs.draw,
        away_win: remixedProbs.away_win - baseProbs.away_win,
      }
    : null

  return (
    <section className={`remix-sliders ${className}`} aria-label="Prediction remix panel">
      {/* Header */}
      <div className="remix-sliders__header">
        <div className="remix-sliders__title-row">
          <h3 className="remix-sliders__title">Remix Prediction</h3>
          {isLoading && (
            <span className="remix-sliders__status" aria-live="polite" aria-label="Remixing in progress">
              Remixing…
            </span>
          )}
          {rebalanced && !isLoading && (
            <span className="remix-sliders__hint" aria-live="polite">
              Auto-rebalanced
            </span>
          )}
        </div>
        <button
          type="button"
          className="remix-sliders__reset"
          onClick={handleReset}
          aria-label="Reset all sliders to defaults"
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="remix-sliders__error" role="alert">
          {error}
        </p>
      )}

      {/* Weight sliders */}
      <fieldset className="remix-sliders__group">
        <legend className="remix-sliders__group-label">Model Weights</legend>

        <SliderRow
          id="ml_weight"
          label="ML Weight"
          value={sliders.ml_weight}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleWeightChange('ml_weight', v)}
          ariaValueText={`${Math.round(sliders.ml_weight * 100)} percent`}
        />
        <SliderRow
          id="sb_weight"
          label="SB Weight"
          value={sliders.sb_weight}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleWeightChange('sb_weight', v)}
          ariaValueText={`${Math.round(sliders.sb_weight * 100)} percent`}
        />
        <SliderRow
          id="poly_weight"
          label="Poly Weight"
          value={sliders.poly_weight}
          min={0}
          max={1}
          step={0.01}
          disabled={!polyEnabled}
          onChange={(v) => handleWeightChange('poly_weight', v)}
          ariaValueText={
            !polyEnabled
              ? 'Poly model unavailable'
              : `${Math.round(sliders.poly_weight * 100)} percent`
          }
        />
      </fieldset>

      {/* Condition modifiers */}
      <fieldset className="remix-sliders__group">
        <legend className="remix-sliders__group-label">Condition Modifiers</legend>

        <SliderRow
          id="altitude_modifier"
          label="Altitude"
          value={sliders.altitude_modifier}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(v) => handleModifierChange('altitude_modifier', v)}
          ariaValueText={`${sliders.altitude_modifier.toFixed(2)}x`}
        />
        <SliderRow
          id="heat_modifier"
          label="Heat"
          value={sliders.heat_modifier}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(v) => handleModifierChange('heat_modifier', v)}
          ariaValueText={`${sliders.heat_modifier.toFixed(2)}x`}
        />
      </fieldset>

      {/* Probability comparison bars */}
      <div className="remix-sliders__bars" aria-label="Probability comparison">
        <div className="remix-sliders__bars-legend">
          <span className="remix-sliders__legend-base">Base</span>
          <span className="remix-sliders__legend-remix">Remixed</span>
        </div>
        {OUTCOMES.map((outcome) => {
          const baseVal = baseProbs[outcome]
          const remixVal = remixedProbs ? remixedProbs[outcome] : null
          const delta = deltas ? deltas[outcome] : null
          return (
            <OutcomeBar
              key={outcome}
              outcome={outcome}
              baseVal={baseVal}
              remixVal={remixVal}
              delta={delta}
            />
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SliderRowProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
  ariaValueText: string
}

function SliderRow({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  onChange,
  ariaValueText,
}: SliderRowProps) {
  return (
    <div className={`remix-sliders__row${disabled ? ' remix-sliders__row--disabled' : ''}`}>
      <label htmlFor={id} className="remix-sliders__label">
        {label}
        {disabled && <span className="remix-sliders__unavailable"> (unavailable)</span>}
      </label>
      <div className="remix-sliders__track-wrap">
        <input
          id={id}
          type="range"
          className="remix-sliders__range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={ariaValueText}
          aria-label={label}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="remix-sliders__value" aria-hidden="true">
          {step < 0.1 && max <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

interface OutcomeBarProps {
  outcome: Outcome
  baseVal: number
  remixVal: number | null
  delta: number | null
}

function OutcomeBar({ outcome, baseVal, remixVal, delta }: OutcomeBarProps) {
  const label = outcomeLabel(outcome)
  const deltaClass =
    delta === null
      ? ''
      : delta > 0
        ? 'remix-sliders__delta--positive'
        : delta < 0
          ? 'remix-sliders__delta--negative'
          : ''

  return (
    <div className={`remix-sliders__outcome remix-sliders__outcome--${outcome}`}>
      <div className="remix-sliders__outcome-label">
        <span>{label}</span>
        {delta !== null && (
          <span
            className={`remix-sliders__delta ${deltaClass}`}
            aria-label={`Delta from base: ${formatDelta(delta)}`}
          >
            {formatDelta(delta)}
          </span>
        )}
      </div>

      {/* Base bar */}
      <div className="remix-sliders__bar-pair">
        <div
          className="remix-sliders__bar remix-sliders__bar--base"
          role="img"
          aria-label={`Base ${label}: ${formatPct(baseVal)}`}
        >
          <div
            className="remix-sliders__bar-fill"
            style={{ width: `${baseVal * 100}%` }}
            data-testid={`bar-base-${outcome}`}
          />
          <span className="remix-sliders__bar-pct">{formatPct(baseVal)}</span>
        </div>

        {/* Remixed bar */}
        <div
          className="remix-sliders__bar remix-sliders__bar--remix"
          role="img"
          aria-label={`Remixed ${label}: ${remixVal !== null ? formatPct(remixVal) : 'pending'}`}
        >
          <div
            className="remix-sliders__bar-fill"
            style={{ width: remixVal !== null ? `${remixVal * 100}%` : '0%' }}
            data-testid={`bar-remix-${outcome}`}
          />
          {remixVal !== null && (
            <span className="remix-sliders__bar-pct">{formatPct(remixVal)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
