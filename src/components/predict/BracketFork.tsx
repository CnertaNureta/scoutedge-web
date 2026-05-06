'use client'

import React, { useState, useEffect, useCallback, useId } from 'react'
import type { BaseBracketResponse, BracketForkResponse } from '@/lib/prediction-bridge'
import { getBaseBracket, postBracketFork } from '@/lib/prediction-bridge'
import './bracket-fork.css'

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface BracketForkProps {
  userId: string
  base?: BaseBracketResponse
  initialFork?: BracketForkResponse
  onForkCreated?: (fork: BracketForkResponse) => void
  className?: string
}


// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** WC 2026 group definitions (8 groups, A-H) */
const WC_GROUPS: { label: string; teams: string[] }[] = [
  { label: 'A', teams: ['USA', 'Mexico', 'Canada', 'Honduras'] },
  { label: 'B', teams: ['Brazil', 'Argentina', 'Chile', 'Bolivia'] },
  { label: 'C', teams: ['France', 'England', 'Netherlands', 'Wales'] },
  { label: 'D', teams: ['Germany', 'Spain', 'Portugal', 'Switzerland'] },
  { label: 'E', teams: ['Japan', 'South Korea', 'Australia', 'Iran'] },
  { label: 'F', teams: ['Morocco', 'Senegal', 'Nigeria', 'Egypt'] },
  { label: 'G', teams: ['Colombia', 'Uruguay', 'Ecuador', 'Peru'] },
  { label: 'H', teams: ['Belgium', 'Croatia', 'Poland', 'Serbia'] },
]

/** Slot path keys by round */
type SlotPath = string // e.g. "r16:0", "qf:1", "sf:0", "final:0"

interface MatchSlot {
  path: SlotPath
  home: string
  away: string
  /** Predicted winner from the base bracket or locally resolved winner */
  predicted: string
  /** Probability badge (0-1); undefined when TBD */
  prob?: number
  /** True if the user has overridden this slot */
  overridden?: boolean
  /** True if the slot was overridden but an upstream override made it stale */
  stale?: boolean
}

/** Override map: slotPath → chosen winner team name */
type OverrideMap = Record<SlotPath, string>

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

/**
 * Build R16 slots from base bracket round 1 (match index 0-7).
 * BaseBracketResponse.rounds[0] should be R16.
 */
function buildR16Slots(base: BaseBracketResponse): MatchSlot[] {
  const round = base.rounds.find((r) => r.round === 1)
  if (!round) {
    // Construct a minimal 8-slot stub from groups
    return WC_GROUPS.map((g, i) => {
      const nextGroup = WC_GROUPS[(i + 1) % WC_GROUPS.length]
      return {
        path: `r16:${i}`,
        home: `${g.label}1`,
        away: `${nextGroup.label}2`,
        predicted: `${g.label}1`,
        prob: 0.6,
      }
    })
  }
  return round.matches.slice(0, 8).map((m, i) => ({
    path: `r16:${i}`,
    home: m.home,
    away: m.away,
    predicted: m.home, // base bracket assumption: first listed team is predicted winner
    prob: 0.6,
  }))
}

/**
 * Given R16 winners (array of 8), derive QF pairs.
 * QF[0]: winner[0] vs winner[1]
 * QF[1]: winner[2] vs winner[3]
 * QF[2]: winner[4] vs winner[5]
 * QF[3]: winner[6] vs winner[7]
 */
function buildQFSlots(r16Winners: string[]): MatchSlot[] {
  return [0, 1, 2, 3].map((i) => {
    const home = r16Winners[i * 2] ?? 'TBD'
    const away = r16Winners[i * 2 + 1] ?? 'TBD'
    return {
      path: `qf:${i}`,
      home,
      away,
      predicted: home !== 'TBD' ? home : 'TBD',
      prob: home !== 'TBD' ? 0.55 : undefined,
    }
  })
}

/**
 * SF[0]: QF winner[0] vs QF winner[1]
 * SF[1]: QF winner[2] vs QF winner[3]
 */
function buildSFSlots(qfWinners: string[]): MatchSlot[] {
  return [0, 1].map((i) => {
    const home = qfWinners[i * 2] ?? 'TBD'
    const away = qfWinners[i * 2 + 1] ?? 'TBD'
    return {
      path: `sf:${i}`,
      home,
      away,
      predicted: home !== 'TBD' ? home : 'TBD',
      prob: home !== 'TBD' ? 0.52 : undefined,
    }
  })
}

function buildFinalSlot(sfWinners: string[]): MatchSlot {
  const home = sfWinners[0] ?? 'TBD'
  const away = sfWinners[1] ?? 'TBD'
  return {
    path: 'final:0',
    home,
    away,
    predicted: home !== 'TBD' ? home : 'TBD',
    prob: home !== 'TBD' ? 0.5 : undefined,
  }
}

/**
 * Resolve the "effective winner" of a slot: override wins, then base prediction.
 */
function effectiveWinner(slot: MatchSlot, overrides: OverrideMap): string {
  return overrides[slot.path] ?? slot.predicted
}

/**
 * Derive the full tree (r16, qf, sf, final) given base r16 slots and current overrides.
 * Returns arrays that carry overridden / stale flags.
 */
function deriveTree(
  baseR16: MatchSlot[],
  overrides: OverrideMap,
): {
  r16: MatchSlot[]
  qf: MatchSlot[]
  sf: MatchSlot[]
  final: MatchSlot
} {
  const r16: MatchSlot[] = baseR16.map((s) => {
    const ov = overrides[s.path]
    return {
      ...s,
      overridden: ov !== undefined,
      stale: false,
    }
  })

  const r16Winners = r16.map((s) => effectiveWinner(s, overrides))

  const qfBase = buildQFSlots(r16Winners)
  const qf: MatchSlot[] = qfBase.map((s) => {
    const ov = overrides[s.path]
    const isStale =
      ov !== undefined && ov !== s.home && ov !== s.away
    return {
      ...s,
      overridden: ov !== undefined,
      stale: isStale,
      predicted: ov ?? s.predicted,
    }
  })

  const qfWinners = qf.map((s) => effectiveWinner(s, overrides))

  const sfBase = buildSFSlots(qfWinners)
  const sf: MatchSlot[] = sfBase.map((s) => {
    const ov = overrides[s.path]
    const isStale =
      ov !== undefined && ov !== s.home && ov !== s.away
    return {
      ...s,
      overridden: ov !== undefined,
      stale: isStale,
      predicted: ov ?? s.predicted,
    }
  })

  const sfWinners = sf.map((s) => effectiveWinner(s, overrides))
  const finalBase = buildFinalSlot(sfWinners)
  const finalOv = overrides['final:0']
  const isFinalStale =
    finalOv !== undefined &&
    finalOv !== finalBase.home &&
    finalOv !== finalBase.away
  const final: MatchSlot = {
    ...finalBase,
    overridden: finalOv !== undefined,
    stale: isFinalStale,
    predicted: finalOv ?? finalBase.predicted,
  }

  return { r16, qf, sf, final }
}

/**
 * Extract overrides from an existing fork's rounds.
 * We compare fork rounds to base rounds to find divergences.
 */
function extractForkOverrides(
  fork: BracketForkResponse,
  baseR16: MatchSlot[],
): OverrideMap {
  const map: OverrideMap = {}

  // fork.rounds mirrors the structure; compare winner (first match.home) to base
  fork.rounds.forEach((round) => {
    const roundKey = round.round === 1
      ? 'r16'
      : round.round === 2
        ? 'qf'
        : round.round === 3
          ? 'sf'
          : 'final'

    round.matches.forEach((m, i) => {
      const slotPath = roundKey === 'final' ? 'final:0' : `${roundKey}:${i}`
      // In the fork, m.home is the predicted winner (convention matching base)
      const baseSlot = baseR16.find((s) => s.path === slotPath)
      if (baseSlot && m.home !== baseSlot.predicted) {
        map[slotPath] = m.home
      } else if (!baseSlot) {
        // QF/SF/Final — just store it; deriveTree will reconcile
        map[slotPath] = m.home
      }
    })
  })

  return map
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: MatchSlot
  overrides: OverrideMap
  activePicker: SlotPath | null
  onForkClick: (path: SlotPath) => void
  onPickTeam: (path: SlotPath, team: string) => void
  onCancelPicker: () => void
}

function SlotCard({
  slot,
  overrides,
  activePicker,
  onForkClick,
  onPickTeam,
  onCancelPicker,
}: SlotCardProps) {
  const winner = overrides[slot.path] ?? slot.predicted
  const isTbd = winner === 'TBD'
  const isPickerOpen = activePicker === slot.path
  const pickerId = `bf-picker-${slot.path}`

  const slotClass = [
    'bf-slot',
    slot.overridden ? 'bf-slot--overridden' : '',
    slot.stale ? 'bf-slot--stale' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const winnerClass = [
    'bf-slot-winner',
    slot.overridden ? 'bf-slot-winner--override' : '',
    isTbd ? 'bf-slot-winner--tbd' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li role="treeitem" aria-selected={false} aria-label={`Match: ${slot.home} vs ${slot.away}`} className={slotClass}>
      <div className="bf-slot-matchup" aria-hidden="true">
        {slot.home} <span>vs</span> {slot.away}
      </div>
      <div className="bf-slot-winner-row">
        <span className={winnerClass} aria-label={`Predicted winner: ${isTbd ? 'TBD' : winner}`}>
          {isTbd ? 'TBD' : winner}
        </span>
        {slot.prob !== undefined && !isTbd && (
          <span className="bf-prob-badge" aria-label={`Probability ${Math.round(slot.prob * 100)}%`}>
            {Math.round(slot.prob * 100)}%
          </span>
        )}
        {slot.stale && (
          <span className="bf-stale-icon" aria-label="Override may be stale due to upstream change">
            ⚠
          </span>
        )}
      </div>

      <button
        type="button"
        className="bf-fork-btn"
        aria-label={`Fork from here: ${slot.home} vs ${slot.away}`}
        aria-expanded={isPickerOpen}
        aria-controls={isPickerOpen ? pickerId : undefined}
        onClick={() => onForkClick(slot.path)}
      >
        ⑂ Fork from here
      </button>

      {isPickerOpen && (
        <div
          id={pickerId}
          className="bf-picker"
          role="group"
          aria-label={`Pick winner for ${slot.home} vs ${slot.away}`}
        >
          <span className="bf-picker-label">Who advances?</span>
          <button
            type="button"
            className="bf-picker-option"
            onClick={() => onPickTeam(slot.path, slot.home)}
            data-testid={`pick-${slot.path}-home`}
          >
            {slot.home}
          </button>
          <button
            type="button"
            className="bf-picker-option"
            onClick={() => onPickTeam(slot.path, slot.away)}
            data-testid={`pick-${slot.path}-away`}
          >
            {slot.away}
          </button>
          <button type="button" className="bf-picker-cancel" onClick={onCancelPicker}>
            Cancel
          </button>
        </div>
      )}
    </li>
  )
}

interface RoundColProps {
  slots: MatchSlot[]
  roundKey: string
  overrides: OverrideMap
  activePicker: SlotPath | null
  onForkClick: (path: SlotPath) => void
  onPickTeam: (path: SlotPath, team: string) => void
  onCancelPicker: () => void
}

function RoundCol({
  slots,
  roundKey,
  overrides,
  activePicker,
  onForkClick,
  onPickTeam,
  onCancelPicker,
}: RoundColProps) {
  return (
    <ul
      role="group"
      aria-label={`${roundKey} matches`}
      className={`bf-round-col bf-round-col--${roundKey.toLowerCase().replace(' ', '-')}`}
    >
      {slots.map((slot) => (
        <SlotCard
          key={slot.path}
          slot={slot}
          overrides={overrides}
          activePicker={activePicker}
          onForkClick={onForkClick}
          onPickTeam={onPickTeam}
          onCancelPicker={onCancelPicker}
        />
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BracketFork({
  userId,
  base: baseProp,
  initialFork,
  onForkCreated,
  className,
}: BracketForkProps): React.JSX.Element {
  const titleId = useId()

  // ── Bracket data state ────────────────────────────────────
  const [base, setBase] = useState<BaseBracketResponse | null>(baseProp ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!baseProp)

  // ── Override / fork state ─────────────────────────────────
  const [overrides, setOverrides] = useState<OverrideMap>({})
  const [activePicker, setActivePicker] = useState<SlotPath | null>(null)

  // ── Save state ────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFork, setSavedFork] = useState<BracketForkResponse | null>(initialFork ?? null)

  // ── Fetch base bracket if not provided ───────────────────
  useEffect(() => {
    if (baseProp) {
      setBase(baseProp)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    getBaseBracket()
      .then((data) => {
        if (!cancelled) {
          setBase(data)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load bracket',
          )
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [baseProp])

  // ── Hydrate from initialFork when base becomes available ──
  useEffect(() => {
    if (!base || !initialFork) return
    const baseR16 = buildR16Slots(base)
    const hydratedOverrides = extractForkOverrides(initialFork, baseR16)
    setOverrides(hydratedOverrides)
  }, [base, initialFork])

  // ── Derive tree from base + overrides ─────────────────────
  const baseR16 = base ? buildR16Slots(base) : []
  const { r16, qf, sf, final } = base
    ? deriveTree(baseR16, overrides)
    : { r16: [], qf: [], sf: [], final: buildFinalSlot([]) }

  // ── Picker handlers ───────────────────────────────────────
  const handleForkClick = useCallback((path: SlotPath) => {
    setActivePicker((prev) => (prev === path ? null : path))
  }, [])

  const handlePickTeam = useCallback((path: SlotPath, team: string) => {
    setOverrides((prev) => ({ ...prev, [path]: team }))
    setActivePicker(null)
  }, [])

  const handleCancelPicker = useCallback(() => {
    setActivePicker(null)
  }, [])

  // ── Save fork ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!base) return
    setIsSaving(true)
    setSaveError(null)

    const bracketData = {
      overrides,
      base_version: base.bracket_id,
      forked_at_match_id: activePicker ?? undefined,
    }

    try {
      const fork = await postBracketFork({
        base_bracket_id: base.bracket_id,
        user_id: userId,
        overrides,
      })
      setSavedFork(fork)
      onForkCreated?.(fork)
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save fork. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }

    // bracketData is built for potential future use (P8.6 OG renderer)
    void bracketData
  }, [base, overrides, userId, activePicker, onForkCreated])

  // ── Share ─────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!savedFork) return
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/bracket/${savedFork.fork_id}`
    const shareData = {
      title: 'My WC2026 Bracket Fork — ScoutEdge',
      url: shareUrl,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or error — fall through to clipboard
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Clipboard unavailable — silent fail
    }
  }, [savedFork])

  const overrideCount = Object.keys(overrides).length

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={['bf-root', className].filter(Boolean).join(' ')} aria-busy="true">
        <div className="bf-loading" role="status" aria-label="Loading bracket">
          <div className="bf-spinner" aria-hidden="true" />
          Loading bracket…
        </div>
      </div>
    )
  }

  // ── Load error state ───────────────────────────────────────
  if (loadError) {
    return (
      <div className={['bf-root', className].filter(Boolean).join(' ')}>
        <div className="bf-error" role="alert">
          <span aria-hidden="true">⚠</span> {loadError}
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <section
      className={['bf-root', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      {/* Header */}
      <header className="bf-header">
        <h2 id={titleId} className="bf-title">
          WC 2026 Bracket
        </h2>
        {overrideCount > 0 && (
          <span className="bf-overrides-badge" aria-label={`${overrideCount} overrides active`}>
            {overrideCount} override{overrideCount !== 1 ? 's' : ''}
          </span>
        )}
        {'share_count' in (savedFork ?? {}) && (
          <span className="bf-fork-count" aria-label="Fork count">
            ⑂ {(savedFork as BracketForkResponse & { share_count?: number }).share_count ?? 0}
          </span>
        )}
      </header>

      {/* Phase column labels */}
      <div className="bf-phase-labels" aria-hidden="true">
        <span className="bf-phase-label bf-phase-label--groups">Groups</span>
        <span className="bf-phase-label">Round of 16</span>
        <span className="bf-phase-label">Quarter-finals</span>
        <span className="bf-phase-label">Semi-finals</span>
        <span className="bf-phase-label">Final</span>
      </div>

      {/* Tree */}
      <ul role="tree" aria-label="Tournament bracket" className="bf-tree">
        {/* Groups column */}
        <li role="treeitem" aria-selected={false} aria-label="Group stage" className="bf-groups-col">
          {WC_GROUPS.map((g) => (
            <div key={g.label} className="bf-group-box" aria-label={`Group ${g.label}`}>
              <div className="bf-group-label">Group {g.label}</div>
              <ul className="bf-group-teams" aria-label={`Group ${g.label} teams`}>
                {g.teams.map((team, ti) => (
                  <li
                    key={team}
                    className={`bf-group-team${ti < 2 ? ' bf-group-team--top2' : ''}`}
                  >
                    {team}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </li>

        {/* R16 */}
        <li role="treeitem" aria-selected={false} aria-label="Round of 16">
          <RoundCol
            slots={r16}
            roundKey="R16"
            overrides={overrides}
            activePicker={activePicker}
            onForkClick={handleForkClick}
            onPickTeam={handlePickTeam}
            onCancelPicker={handleCancelPicker}
          />
        </li>

        {/* QF */}
        <li role="treeitem" aria-selected={false} aria-label="Quarter-finals">
          <RoundCol
            slots={qf}
            roundKey="QF"
            overrides={overrides}
            activePicker={activePicker}
            onForkClick={handleForkClick}
            onPickTeam={handlePickTeam}
            onCancelPicker={handleCancelPicker}
          />
        </li>

        {/* SF */}
        <li role="treeitem" aria-selected={false} aria-label="Semi-finals">
          <RoundCol
            slots={sf}
            roundKey="SF"
            overrides={overrides}
            activePicker={activePicker}
            onForkClick={handleForkClick}
            onPickTeam={handlePickTeam}
            onCancelPicker={handleCancelPicker}
          />
        </li>

        {/* Final */}
        <li role="treeitem" aria-selected={false} aria-label="Final">
          <ul role="group" aria-label="Final match" className="bf-round-col bf-round-col--final">
            <SlotCard
              slot={final}
              overrides={overrides}
              activePicker={activePicker}
              onForkClick={handleForkClick}
              onPickTeam={handlePickTeam}
              onCancelPicker={handleCancelPicker}
            />
          </ul>
        </li>
      </ul>

      {/* Actions bar */}
      <div className="bf-actions">
        <button
          type="button"
          className="bf-btn bf-btn--primary"
          onClick={handleSave}
          disabled={isSaving || overrideCount === 0}
          aria-label="Save your bracket fork"
          aria-busy={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save fork'}
        </button>

        {savedFork && (
          <button
            type="button"
            className="bf-btn bf-btn--ghost"
            onClick={handleShare}
            aria-label="Share your bracket fork"
          >
            Share
          </button>
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <div className="bf-error" role="alert" aria-live="assertive">
          <span aria-hidden="true">⚠</span> {saveError}
        </div>
      )}

      {/* Share URL */}
      {savedFork && (
        <div className="bf-share-url" aria-label="Shareable fork URL">
          <span aria-hidden="true">🔗</span>
          <span className="bf-share-url-text">
            {typeof window !== 'undefined' ? window.location.origin : ''}/bracket/{savedFork.fork_id}
          </span>
        </div>
      )}
    </section>
  )
}
