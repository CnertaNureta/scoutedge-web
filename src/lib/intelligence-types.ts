/**
 * Shared types for paywall-gated intelligence products.
 *
 * Consumed by:
 *   - team page ScoutEdgeScore module (T1)
 *   - player page PlayerScoutGrade module (P1)
 *
 * Predeclared here so parallel implementations of T1 and P1 don't
 * conflict on the same file.
 */

export interface ScoreBreakdown {
  label: string
  /** 0-100 */
  value: number
  hint?: string
}

export interface ScoutEdgeScore {
  /** 0-100 */
  total: number
  verdict: string
  /** 6 dimensions for team-level intelligence */
  breakdown: ScoreBreakdown[]
  dossierId: string
  signalCount: number
  sourceCount: number
  /** ISO-8601 timestamp */
  lastUpdatedAt: string
}

export interface PlayerScoutGrade {
  /** 0-99 */
  total: number
  verdict: string
  /** 5 dimensions for player-level intelligence */
  breakdown: ScoreBreakdown[]
  dossierId: string
  signalCount: number
  sourceCount: number
  /** ISO-8601 timestamp */
  lastUpdatedAt: string
}
