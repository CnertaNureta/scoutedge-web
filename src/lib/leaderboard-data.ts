/**
 * Leaderboard adapter for the magazine homepage.
 *
 * Reads from the existing `global_leaderboard` materialized view (defined in
 * supabase/migrations/20260413_create_prediction_leagues.sql). The view
 * aggregates `prediction_scores` rows by user with rank() over (order by
 * points desc), so it returns ready-to-render leaderboard data.
 *
 * Refresh cadence: `score_match_predictions(match_id)` calls
 * `refresh_leaderboards()` automatically after a finished match is scored.
 * For unscored windows the view stays stale by design.
 *
 * Graceful degrade: if Supabase isn't configured or the view returns no rows,
 * `getLeaderboardData()` returns `null` and the homepage hides the module.
 */

import 'server-only'

import { getSupabaseAdmin } from './supabase-server'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  favoriteTeamSlug: string | null
  totalPoints: number
  exactScores: number
  correctPredictions: number
  totalPredictions: number
  accuracyPct: number
  rank: number
}

export interface LeaderboardData {
  podium: LeaderboardEntry[] // top 3
  totalUsers: number
}

interface GlobalLeaderboardRow {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  favorite_team_slug: string | null
  total_points: number
  exact_scores: number
  correct_predictions: number
  total_predictions: number
  accuracy_pct: number
  rank: number
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

function mapRow(row: GlobalLeaderboardRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? 'Anonymous',
    avatarUrl: row.avatar_url,
    favoriteTeamSlug: row.favorite_team_slug,
    totalPoints: row.total_points,
    exactScores: row.exact_scores,
    correctPredictions: row.correct_predictions,
    totalPredictions: row.total_predictions,
    accuracyPct: row.accuracy_pct,
    rank: row.rank,
  }
}

/**
 * Fetch the global podium (top 3) + total user count. Returns null when
 * Supabase is unconfigured OR the materialized view has no rows yet.
 */
export async function getLeaderboardData(): Promise<LeaderboardData | null> {
  if (!isConfigured()) return null

  try {
    const admin = getSupabaseAdmin()

    const [{ data: top, error: topErr }, { count, error: countErr }] = await Promise.all([
      admin
        .from('global_leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .limit(3),
      admin
        .from('global_leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('total_predictions', 0),
    ])

    if (topErr || countErr) return null
    if (!top || top.length === 0) return null

    return {
      podium: (top as GlobalLeaderboardRow[]).map(mapRow),
      totalUsers: count ?? top.length,
    }
  } catch {
    return null
  }
}

/**
 * Fetch a single user's leaderboard entry. Returns null when user has no
 * scored predictions yet, or when Supabase is unconfigured.
 */
export async function getUserLeaderboardEntry(
  userId: string,
): Promise<LeaderboardEntry | null> {
  if (!isConfigured()) return null

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('global_leaderboard')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null
    return mapRow(data as GlobalLeaderboardRow)
  } catch {
    return null
  }
}
