/**
 * Power-rankings derivation — pre-launch placeholder math.
 *
 * The KickOracle Elo / win-form pipeline isn't live yet. Until it ships, the
 * homepage "Top Contenders" rail and the `/power-rankings` page both derive
 * values from `Team` fields (`fifaRanking`, `chemistry`, `morale`, `stability`,
 * `familiarity`) so the surface looks alive without inventing match results.
 *
 * `computePowerScore` is the canonical scoring formula (also rendered on
 * `/power-rankings`). `deriveStubElo` converts FIFA rank to a plausible Elo
 * band. `deriveStubTrend` returns `'—'` everywhere because there is no
 * rank-history feed yet — once one exists, swap this to read prev-rank diff.
 *
 * `form` (last-5 W/L/D pills) is intentionally NOT derived here. Without real
 * match results, fabricating recent form would be misleading. Callers pass
 * `form: undefined` and the UI renders a "PRE-TOURNAMENT" placeholder.
 */

import type { Team } from '@/lib/types'

/**
 * Real power-ranking score used by `/power-rankings` page and the magazine
 * homepage Top Contenders module. Composed from:
 *   - FIFA rank (35%) — externally provided baseline
 *   - chemistry  (30%) — squad synergy estimate
 *   - morale     (15%) — recent sentiment
 *   - stability  (10%) — staff/lineup churn
 *   - familiarity (10%) — coach tenure / cohort retention
 */
export function computePowerScore(team: Team): number {
  const rankScore = Math.max(0, 100 - (team.fifaRanking - 1) * 1.5)
  return Math.round(
    rankScore * 0.35 +
      team.chemistry * 0.3 +
      team.morale * 0.15 +
      team.stability * 0.1 +
      team.familiarity * 0.1
  )
}

/**
 * Pre-launch Elo placeholder. Maps `fifaRanking` to a band roughly aligned with
 * Eloratings.net top-of-table values (~2150 for #1, ~1900 floor for #40+).
 * Replace with a real Elo service when the rating pipeline ships.
 */
export function deriveStubElo(team: Team): number {
  return Math.max(1900, 2200 - (team.fifaRanking - 1) * 8)
}

/**
 * Rank-change-since-last-update indicator.
 *
 * Returns `'—'` until a real rank-history feed exists. Don't fake `+N`/`-N` —
 * the magazine rail should be honest that we don't have movement data yet.
 */
export function deriveStubTrend(_team: Team): string {
  return '—'
}
