/**
 * FBref team stats reader for the Compare module on the magazine homepage.
 *
 * Data flows:
 *   1. `scripts/import-fbref-team-stats.mjs` parses `scripts/fixtures/fbref-team-stats.csv`
 *      and upserts into the Supabase `team_stats` table (see scripts/lib/team-layer1-db.mjs).
 *   2. This helper joins `teams` (by slug) onto `team_stats` for the two
 *      compare teams and returns a normalised shape.
 *
 * If Supabase isn't configured (local dev, missing env), or the query fails,
 * this returns `null` and callers fall back to em-dash placeholders.
 */

import { getSupabaseAdmin } from './supabase-server'

export interface CompareFbrefStat {
  possessionPct: number | null
  passCompletionPct: number | null
  xgPer90: number | null
  xgaPer90: number | null
}

interface TeamStatsRow {
  team_slug: string
  matches_played: number | null
  xg: number | null
  npxg: number | null
  possession_pct: number | null
  pass_completion_pct: number | null
  // FBref doesn't ship xGA in the import schema; reads as null today.
  xga: number | null
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

/**
 * Fetch FBref stats for two team slugs. Returns a map keyed by slug.
 * Missing teams (no row in `team_stats`) map to undefined.
 */
export async function getCompareFbrefStats(
  slugs: [string, string],
): Promise<Record<string, CompareFbrefStat> | null> {
  if (!isConfigured()) return null

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('team_stats')
      .select('team_slug, matches_played, xg, npxg, possession_pct, pass_completion_pct, xga')
      .in('team_slug', slugs)
      .order('as_of_date', { ascending: false })

    if (error || !data) return null

    const out: Record<string, CompareFbrefStat> = {}
    const seen = new Set<string>()
    for (const row of data as TeamStatsRow[]) {
      // Keep only the freshest row per team (rows are ordered DESC by as_of_date).
      if (seen.has(row.team_slug)) continue
      seen.add(row.team_slug)
      const matches = row.matches_played ?? null
      const safeDiv = (n: number | null) =>
        matches && matches > 0 && n !== null ? Number((n / matches).toFixed(2)) : null
      out[row.team_slug] = {
        possessionPct: row.possession_pct,
        passCompletionPct: row.pass_completion_pct,
        xgPer90: safeDiv(row.xg),
        xgaPer90: safeDiv(row.xga),
      }
    }
    return out
  } catch {
    // Network / RLS / missing table — graceful degrade.
    return null
  }
}
