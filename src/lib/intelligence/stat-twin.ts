/**
 * P3 — Stat Twin (historical comparables)
 *
 * Pure compute layer for the StatTwin module. Loads a curated, hand-authored
 * JSON of "this current player plays like {historical}" comparables.
 *
 * Design choice: comparables are NOT generated algorithmically. Football
 * comparables are a narrative product — fabricating "78% like 2014 Kroos"
 * from a stat vector would be both lazy and misleading. The JSON is the
 * source of truth; uncurated players surface a graceful pending state.
 */

import comparablesData from '@/data/player-comparables.json'

/** A single historical comparable for one current player. */
export interface StatTwinComparable {
  /** Historical player's name as it should display. */
  name: string
  /** Reference season/year — typically peak year for the comparable. */
  year: number
  /** 0–100. Similarity score, scoutsourced not statsourced. */
  similarityPercent: number
  /** One-sentence trait note explaining why the comparable fits. */
  trait: string
}

/** Aggregate result returned from `computeStatTwin`. */
export interface StatTwinBreakdown {
  /** True iff the player is in the curated set. */
  hasComparables: boolean
  /** Sorted desc by similarityPercent, capped at MAX_COMPARABLES. */
  comparables: StatTwinComparable[]
  /** For IntelligenceModule confidence footer — count of comparables shown. */
  signalCount: number
  /** Distinct comparable-source eras (sourceCount of the IntelligenceModule footer). */
  sourceCount: number
}

const MAX_COMPARABLES = 3

const COMPARABLES_BY_SLUG = comparablesData as Record<string, StatTwinComparable[]>

function isValidComparable(c: StatTwinComparable): boolean {
  return (
    typeof c.name === 'string' &&
    c.name.length > 0 &&
    Number.isFinite(c.year) &&
    Number.isFinite(c.similarityPercent) &&
    c.similarityPercent >= 0 &&
    c.similarityPercent <= 100 &&
    typeof c.trait === 'string'
  )
}

/**
 * Returns the StatTwin breakdown for a given player slug.
 * Pure — no side effects, no fetches.
 */
export function computeStatTwin(playerSlug: string): StatTwinBreakdown {
  const raw = COMPARABLES_BY_SLUG[playerSlug]

  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      hasComparables: false,
      comparables: [],
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const sorted = raw
    .filter(isValidComparable)
    .slice()
    .sort((a, b) => b.similarityPercent - a.similarityPercent)
    .slice(0, MAX_COMPARABLES)

  if (sorted.length === 0) {
    return {
      hasComparables: false,
      comparables: [],
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const distinctEras = new Set<number>()
  for (const c of sorted) {
    // Bucket by decade for "source count" — different decades = different eras.
    distinctEras.add(Math.floor(c.year / 10))
  }

  return {
    hasComparables: true,
    comparables: sorted,
    signalCount: sorted.length,
    sourceCount: distinctEras.size,
  }
}

/** Test/debug helper — slugs that are curated. */
export function listCuratedSlugs(): string[] {
  return Object.keys(COMPARABLES_BY_SLUG)
}
