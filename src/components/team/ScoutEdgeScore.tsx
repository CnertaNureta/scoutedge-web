import type { Team, Player, MarketIntelData } from '@/lib/types'
import type { ScoutEdgeScore, ScoreBreakdown } from '@/lib/intelligence-types'
import { getTranslations } from 'next-intl/server'
import { getTeamColors } from '@/lib/team-colors'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import ChemistryBar from '@/components/ui/ChemistryBar'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import { chemistryColor } from '@/lib/utils'

const DIM_WEIGHTS = {
  attack: 0.18,
  spine: 0.22,
  bench: 0.1,
  coach: 0.15,
  form: 0.2,
  edge: 0.15,
} as const

const DEFAULT_SIGNAL_COUNT = 32
const DEFAULT_SOURCE_COUNT = 4

type VerdictTier = 'elite' | 'strong' | 'viable' | 'limited'

interface VerdictKeys {
  elite: string
  strong: string
  viable: string
  limited: string
}

interface DimensionLabels {
  attack: string
  spine: string
  bench: string
  coach: string
  form: string
  edge: string
}

interface DimensionHints {
  attack: string
  spine: string
  bench: string
  coach: string
  form: string
  edge: string
}

export interface ScoutEdgeScoreRawDims {
  attack: number
  spine: number
  bench: number
  coach: number
  form: number
  edge: number
}

/**
 * Aggregate signal count + distinct source count across a team's players
 * by walking `recentSignals` on each Player. Falls back to safe defaults
 * when intel is missing so the IntelligenceModule footer always renders.
 */
export function aggregateTeamSignals(players: Player[]): {
  signalCount: number
  sourceCount: number
} {
  let signalCount = 0
  const sources = new Set<string>()
  for (const player of players) {
    if (typeof player.intelSignalCount === 'number') {
      signalCount += player.intelSignalCount
    }
    if (player.recentSignals) {
      for (const signal of player.recentSignals) {
        if (signal.sourceType) {
          sources.add(signal.sourceType)
        }
      }
    }
  }
  return {
    signalCount: signalCount > 0 ? signalCount : DEFAULT_SIGNAL_COUNT,
    sourceCount: sources.size > 0 ? sources.size : DEFAULT_SOURCE_COUNT,
  }
}

/**
 * ISO 8601 week number (1-53). Used for the dossier stamp so the badge
 * rotates weekly without needing external state.
 */
export function getISOWeek(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() === 0 ? 7 : target.getUTCDay()
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, value))
}

function averageRating(group: ReadonlyArray<Player>): number {
  if (group.length === 0) return 0
  const sum = group.reduce((acc, p) => acc + p.rating, 0)
  return sum / group.length
}

/**
 * Forwards' average rating, scaled 0-100. Empty forward pool → 50 (mid).
 */
function computeAttack(players: ReadonlyArray<Player>): number {
  const fwds = players.filter((p) => p.position === 'FWD')
  if (fwds.length === 0) return 50
  return clamp(averageRating(fwds))
}

/**
 * Spine = average of GK + top 2 DEF (by rating) + top 2 MID (by rating).
 */
function computeSpine(players: ReadonlyArray<Player>): number {
  const gk = players.filter((p) => p.position === 'GK').sort((a, b) => b.rating - a.rating)[0]
  const topDefs = players
    .filter((p) => p.position === 'DEF')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)
  const topMids = players
    .filter((p) => p.position === 'MID')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)

  const spine: Player[] = []
  if (gk) spine.push(gk)
  spine.push(...topDefs, ...topMids)
  if (spine.length === 0) return 50
  return clamp(averageRating(spine))
}

/**
 * Bench = average rating of squad slots 12-23 by descending rating.
 */
function computeBench(players: ReadonlyArray<Player>): number {
  const ranked = [...players].sort((a, b) => b.rating - a.rating)
  const tail = ranked.slice(11, 23)
  if (tail.length === 0) return 50
  return clamp(averageRating(tail))
}

/**
 * Coach dim. Team has no `coachExperience` field today, so we lean on
 * the documented fallback: chemistry + stability midpoint.
 */
function computeCoach(team: Team): number {
  // Future-proofing: if a `coachExperience` field is later added to Team,
  // it would be preferred here. Today the type doesn't expose it, so we
  // always use the fallback path.
  return clamp((team.chemistry + team.stability) / 2)
}

/**
 * Form = morale-weighted blend with tactical stability.
 */
function computeForm(team: Team): number {
  return clamp(team.morale * 0.6 + team.stability * 0.4)
}

/**
 * Edge dim: scales modelEdge.edge (range roughly -0.1..0.1) into 0-100
 * centered on 50. Missing modelEdge → familiarity + 10 fallback.
 */
function computeEdge(team: Team, marketIntel?: MarketIntelData): number {
  if (marketIntel?.modelEdge) {
    return clamp(50 + marketIntel.modelEdge.edge * 200)
  }
  return clamp(team.familiarity + 10)
}

function pickVerdictTier(total: number): VerdictTier {
  if (total >= 80) return 'elite'
  if (total >= 65) return 'strong'
  if (total >= 50) return 'viable'
  return 'limited'
}

/**
 * Pure scoring math — extracted so it's directly unit-testable without
 * pulling in next-intl / React.
 */
export function computeScoutEdgeScore(
  team: Team,
  marketIntel: MarketIntelData | undefined,
  players: ReadonlyArray<Player>,
  options: {
    dossierId: string
    verdicts: VerdictKeys
    labels: DimensionLabels
    hints: DimensionHints
    signalCount: number
    sourceCount: number
    lastUpdatedAt: string
  },
): ScoutEdgeScore {
  const raw: ScoutEdgeScoreRawDims = {
    attack: computeAttack(players),
    spine: computeSpine(players),
    bench: computeBench(players),
    coach: computeCoach(team),
    form: computeForm(team),
    edge: computeEdge(team, marketIntel),
  }

  const total = Math.round(
    raw.attack * DIM_WEIGHTS.attack +
      raw.spine * DIM_WEIGHTS.spine +
      raw.bench * DIM_WEIGHTS.bench +
      raw.coach * DIM_WEIGHTS.coach +
      raw.form * DIM_WEIGHTS.form +
      raw.edge * DIM_WEIGHTS.edge,
  )

  const tier = pickVerdictTier(total)

  const breakdown: ScoreBreakdown[] = [
    { label: options.labels.attack, value: Math.round(raw.attack), hint: options.hints.attack },
    { label: options.labels.spine, value: Math.round(raw.spine), hint: options.hints.spine },
    { label: options.labels.bench, value: Math.round(raw.bench), hint: options.hints.bench },
    { label: options.labels.coach, value: Math.round(raw.coach), hint: options.hints.coach },
    { label: options.labels.form, value: Math.round(raw.form), hint: options.hints.form },
    { label: options.labels.edge, value: Math.round(raw.edge), hint: options.hints.edge },
  ]

  return {
    total: clamp(total),
    verdict: options.verdicts[tier],
    breakdown,
    dossierId: options.dossierId,
    signalCount: options.signalCount,
    sourceCount: options.sourceCount,
    lastUpdatedAt: options.lastUpdatedAt,
  }
}

interface ScoutEdgeScoreProps {
  team: Team
  players: Player[]
  marketIntel?: MarketIntelData
}

export default async function ScoutEdgeScoreModule({
  team,
  players,
  marketIntel,
}: ScoutEdgeScoreProps) {
  const t = await getTranslations('scoutEdgeScore')
  const colors = getTeamColors(team.slug)

  const labels: DimensionLabels = {
    attack: t('dimensions.attack'),
    spine: t('dimensions.spine'),
    bench: t('dimensions.bench'),
    coach: t('dimensions.coach'),
    form: t('dimensions.form'),
    edge: t('dimensions.edge'),
  }

  const hints: DimensionHints = {
    attack: t('dimensions.attackHint'),
    spine: t('dimensions.spineHint'),
    bench: t('dimensions.benchHint'),
    coach: t('dimensions.coachHint'),
    form: t('dimensions.formHint'),
    edge: t('dimensions.edgeHint'),
  }

  const verdicts: VerdictKeys = {
    elite: t('verdict.elite'),
    strong: t('verdict.strong'),
    viable: t('verdict.viable'),
    limited: t('verdict.limited'),
  }

  const now = new Date()
  const isoWeek = getISOWeek(now)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T1-W${isoWeek}-2026`

  const { signalCount, sourceCount } = aggregateTeamSignals(players)

  // Newest intel timestamp across the squad — falls back to now.
  const lastUpdatedAt = players
    .map((p) => p.intelLastUpdated)
    .filter((s): s is string => typeof s === 'string')
    .sort()
    .pop() ?? now.toISOString()

  const score = computeScoutEdgeScore(team, marketIntel, players, {
    dossierId,
    verdicts,
    labels,
    hints,
    signalCount,
    sourceCount,
    lastUpdatedAt,
  })

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('title')}
        subtitle={t('subtitle')}
        dossierId={score.dossierId}
        scoutVerdict={score.verdict}
        signalCount={score.signalCount}
        sourceCount={score.sourceCount}
        lastUpdatedAt={score.lastUpdatedAt}
        accentColor={colors.primary}
      >
        {/* Big total — centered, headline weight */}
        <div className="flex flex-col items-center justify-center py-6 mb-2">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
            {t('totalLabel')}
          </p>
          <AnimatedNumber
            value={score.total}
            className="font-headline text-[96px] leading-none tracking-tight"
            style={{ color: chemistryColor(score.total) }}
          />
          <p
            className="mt-3 font-label text-[10px] uppercase tracking-[0.25em]"
            style={{ color: colors.primary }}
            aria-hidden="true"
          >
            / 100
          </p>
        </div>

        {/* 6-dim grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-4">
          {score.breakdown.map((dim) => (
            <div key={dim.label}>
              <ChemistryBar value={dim.value} label={dim.label} />
              {dim.hint && (
                <p className="font-label text-[10px] text-on-surface-variant/70 mt-1.5 leading-relaxed">
                  {dim.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      </IntelligenceModule>
    </section>
  )
}
