/**
 * Press Box Weekly Brief — v1
 *
 * Pure, deterministic synthesis of a 4-bullet weekly intelligence brief for a
 * given team. Bullets are selected from a 12-template pool, seeded by the
 * team slug, and filled with values drawn from existing Team / Player fields.
 *
 * WHY: Stub bullets pending real LLM weekly brief + Supabase ingest
 * (T10 phase 3 follow-up). Until the `team_weekly_brief` table is shipped and
 * a scheduled LLM job populates it, we anchor the week label to ISO-2026-W22
 * so tests, snapshots, and visual stamps stay stable.
 */
import type { Team, Player, MarketIntelData } from '@/lib/types'

export interface PressBoxBullet {
  templateId: string
  text: string
}

export interface PressBoxBriefBreakdown {
  weekLabel: string // e.g. "WK22 · 2026"
  bullets: PressBoxBullet[] // exactly 4
  signalCount: number
  sourceCount: number
}

// ── Anchored cadence ─────────────────────────────────────────────
// Stable anchor so server render, tests, and dossier IDs do not drift.
// When the real LLM weekly job lands, replace with current-week derivation.
const ANCHOR_ISO_WEEK = 22
const ANCHOR_YEAR = 2026
const BULLET_COUNT = 4

// ── Template pool ────────────────────────────────────────────────
// Each templateId maps to a localised string in messages/*.json under
// `pressBoxBrief.bulletTemplates.{templateId}`. The compute fn returns
// templateIds + a resolved args bag; the component does the t() lookup.
export const PRESS_BOX_TEMPLATE_IDS: ReadonlyArray<string> = [
  'spine',
  'banker',
  'archetype',
  'moraleEdge',
  'stabilityHinge',
  'coachLens',
  'ranking',
  'groupRoad',
  'marketEdge',
  'rotationRisk',
  'finishingSignal',
  'tempo',
] as const

interface TemplateArgs {
  team: string
  topScorer: string
  topScorerGoals: number
  signalPlayer: string
  coach: string
  ranking: number
  group: string
  archetype: string
  morale: number
  stability: number
  edgePct: string
  bookSource: string
}

// ── Helpers ──────────────────────────────────────────────────────

function hashSlug(slug: string): number {
  let hash = 2166136261
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pickTopScorer(players: ReadonlyArray<Player>): Player | null {
  if (players.length === 0) return null
  // Goals first, then rating as tiebreaker. Stable across reruns because
  // the players list itself is deterministic upstream.
  let best = players[0]
  for (const p of players) {
    if (
      p.goals > best.goals ||
      (p.goals === best.goals && p.rating > best.rating)
    ) {
      best = p
    }
  }
  return best
}

function pickSignalPlayer(players: ReadonlyArray<Player>, exclude?: string): Player | null {
  if (players.length === 0) return null
  // Highest-rated non-top-scorer signal carrier.
  const pool = exclude ? players.filter((p) => p.slug !== exclude) : players
  if (pool.length === 0) return players[0]
  return pool.reduce((best, p) => (p.rating > best.rating ? p : best), pool[0])
}

// Templates whose rendered text always contains the {team} name. We anchor
// one of these into every brief so the team is always mentioned by name.
const TEAM_NAMED_IDS: ReadonlyArray<string> = ['spine', 'groupRoad', 'tempo'] as const

function selectTemplateIds(seed: number, marketAvailable: boolean): string[] {
  // Deterministic 4-of-12 selection. We always anchor one team-named template
  // first so the brief always mentions the team by name, then fill the
  // remaining slots from the rest of the pool.
  const candidates = PRESS_BOX_TEMPLATE_IDS.filter((id) =>
    id === 'marketEdge' ? marketAvailable : true,
  )

  let state = seed >>> 0
  const advance = (): number => {
    state = Math.imul(state ^ (state >>> 16), 2246822507) >>> 0
    state = Math.imul(state ^ (state >>> 13), 3266489909) >>> 0
    state = (state ^ (state >>> 16)) >>> 0
    return state
  }

  const teamNamed = candidates.filter((id) => TEAM_NAMED_IDS.includes(id))
  const anchorId = teamNamed[advance() % teamNamed.length] ?? candidates[0]

  const ids: string[] = [anchorId]
  while (ids.length < BULLET_COUNT && ids.length < candidates.length) {
    const next = candidates[advance() % candidates.length]
    if (!ids.includes(next)) ids.push(next)
  }
  return ids
}

function applyTemplate(template: string, args: TemplateArgs): string {
  return template
    .replace(/\{team\}/g, args.team)
    .replace(/\{topScorer\}/g, args.topScorer)
    .replace(/\{topScorerGoals\}/g, String(args.topScorerGoals))
    .replace(/\{signalPlayer\}/g, args.signalPlayer)
    .replace(/\{coach\}/g, args.coach)
    .replace(/\{ranking\}/g, String(args.ranking))
    .replace(/\{group\}/g, args.group)
    .replace(/\{archetype\}/g, args.archetype)
    .replace(/\{morale\}/g, String(args.morale))
    .replace(/\{stability\}/g, String(args.stability))
    .replace(/\{edgePct\}/g, args.edgePct)
    .replace(/\{bookSource\}/g, args.bookSource)
}

// Internal English fallback templates — kept in sync with messages/en.json
// `pressBoxBrief.bulletTemplates.*`. Mirrored here so the pure compute fn
// returns ready-to-render text without requiring a translator at call sites
// (i18n-aware rendering still happens in the React component via templateId).
const FALLBACK_TEMPLATES: Record<string, string> = {
  spine:
    '{team} carry a settled spine into matchday — the {archetype} read still tracks.',
  banker:
    '{topScorer} ({topScorerGoals} goals) is the closest thing this side has to a banker.',
  archetype:
    'The {archetype} archetype keeps showing up in the tape — this team plays to type.',
  moraleEdge:
    'Camp morale sits at {morale} — a quiet edge most desks are still pricing flat.',
  stabilityHinge:
    'Stability index {stability}: rotation room is real, but the hinge players matter.',
  coachLens:
    '{coach} keeps shaping the run-of-play around {signalPlayer} — watch the half-spaces.',
  ranking:
    'FIFA #{ranking} undersells what this group has done on the road.',
  groupRoad:
    'Group {group} road still runs through {team} — control the middle thirds, control the week.',
  marketEdge:
    'Model edge vs the books is roughly {edgePct} on the {bookSource} number — fade the drift.',
  rotationRisk:
    'Rotation risk is the quiet story — {coach} has trusted {signalPlayer} too long not to start.',
  finishingSignal:
    '{topScorer} is the finishing signal: when the chances land for them, the result usually follows.',
  tempo:
    'Tempo holds the verdict — when {team} dictate the first 20, they tend to dictate the night.',
}

/**
 * Pure compute fn — exported for unit testing.
 * Returns a deterministic 4-bullet weekly brief for a team.
 */
export function computePressBoxBrief(
  team: Team,
  players: ReadonlyArray<Player>,
  marketIntel?: MarketIntelData | null,
): PressBoxBriefBreakdown {
  const topScorer = pickTopScorer(players)
  const signalPlayer = pickSignalPlayer(players, topScorer?.slug)

  const modelEdge = marketIntel?.modelEdge ?? null
  const edgePct = modelEdge
    ? `${(modelEdge.edge * 100).toFixed(1)}%`
    : '—'
  const bookSource = modelEdge?.bestSource ?? 'consensus'

  const args: TemplateArgs = {
    team: team.name,
    topScorer: topScorer?.name ?? 'the senior striker',
    topScorerGoals: topScorer?.goals ?? 0,
    signalPlayer: signalPlayer?.name ?? topScorer?.name ?? 'the captain',
    coach: team.coachName,
    ranking: team.fifaRanking,
    group: team.group,
    archetype: team.archetypeMatch,
    morale: team.morale,
    stability: team.stability,
    edgePct,
    bookSource,
  }

  const seed = hashSlug(`${team.slug}-w${ANCHOR_ISO_WEEK}-${ANCHOR_YEAR}`)
  const ids = selectTemplateIds(seed, modelEdge !== null)

  // Guard: if for any reason the candidate pool was too small, top up with
  // the first templates from the canonical order.
  while (ids.length < BULLET_COUNT) {
    const next = PRESS_BOX_TEMPLATE_IDS.find((t) => !ids.includes(t))
    if (!next) break
    ids.push(next)
  }

  const bullets: PressBoxBullet[] = ids.slice(0, BULLET_COUNT).map((templateId) => ({
    templateId,
    text: applyTemplate(FALLBACK_TEMPLATES[templateId] ?? '', args),
  }))

  return {
    weekLabel: `WK${ANCHOR_ISO_WEEK} · ${ANCHOR_YEAR}`,
    bullets,
    signalCount: bullets.length,
    sourceCount: 1 + (modelEdge ? 1 : 0) + (players.length > 0 ? 1 : 0),
  }
}

export const PRESS_BOX_BRIEF_INTERNAL = {
  ANCHOR_ISO_WEEK,
  ANCHOR_YEAR,
  BULLET_COUNT,
  FALLBACK_TEMPLATES,
}
