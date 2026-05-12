export type OgType = 'match' | 'bracket' | 'slayer'

export interface OgMatchMetadata {
  match_id: string
  home_team: string
  away_team: string
  kickoff_utc: string
  stage: string
  venue_city: string | null
  predicted_winner: string | null
  predicted_p_win: number | null
  headline: string
  ts: string
}

export interface BracketOgMetadata {
  fork_id: string
  user_id: string
  title: string
  share_url: string
  points_earned: number
  max_possible: number | null
  rank_percentile: number | null
  headline: string
  ts: string
}

export interface SlayerOgMetadata {
  user_id: string
  total_picks: number
  correct_picks: number
  accuracy_pct: number
  headline: string
  badge_tier: string
  ts: string
}

export type OgMetadata =
  | { type: 'match'; data: OgMatchMetadata }
  | { type: 'bracket'; data: BracketOgMetadata }
  | { type: 'slayer'; data: SlayerOgMetadata }

const SCOUTEDGE_API_BASE =
  process.env.SCOUTEDGE_API_URL ?? process.env.NEXT_PUBLIC_SCOUTEDGE_API_URL ?? ''

function buildScoutEdgeUrl(path: string): string {
  if (!SCOUTEDGE_API_BASE) return path

  const base = SCOUTEDGE_API_BASE.replace(/\/$/, '')
  const apiRoot = path.startsWith('/og') && base.endsWith('/api') ? base.slice(0, -4) : base
  return `${apiRoot}${path}`
}

async function fetchJson<T>(path: string, label: string): Promise<T> {
  const res = await fetch(buildScoutEdgeUrl(path), { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`${label} metadata fetch failed: ${res.status}`)
  }
  return (await res.json()) as T
}

async function fetchMatchMetadata(id: string): Promise<OgMetadata> {
  const data = await fetchJson<OgMatchMetadata>(
    `/og/match/${encodeURIComponent(id)}`,
    'Match',
  )
  return { type: 'match', data }
}

async function fetchBracketMetadata(id: string): Promise<OgMetadata> {
  const data = await fetchJson<BracketOgMetadata>(
    `/og/bracket/${encodeURIComponent(id)}`,
    'Bracket',
  )
  return { type: 'bracket', data }
}

async function fetchSlayerMetadata(id: string): Promise<OgMetadata> {
  const data = await fetchJson<SlayerOgMetadata>(
    `/og/slayer/${encodeURIComponent(id)}`,
    'Slayer',
  )
  return { type: 'slayer', data }
}

export async function fetchOgMetadata(type: OgType, id: string): Promise<OgMetadata> {
  switch (type) {
    case 'match':
      return fetchMatchMetadata(id)
    case 'bracket':
      return fetchBracketMetadata(id)
    case 'slayer':
      return fetchSlayerMetadata(id)
  }
}
