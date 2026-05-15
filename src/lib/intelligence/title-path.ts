import type { MarketIntelData, Team } from '@/lib/types'

export type TitlePathStageId = 'group' | 'r16' | 'qf' | 'sf' | 'final' | 'win'

export interface TitlePathStage {
  stage: TitlePathStageId
  modelProbability: number
  marketProbability: number
  edge: number
}

export interface TitlePathBreakdown {
  stages: TitlePathStage[]
  biggestEdgeStage: TitlePathStageId
  hasModelSignal: boolean
}

export const TITLE_PATH_STAGE_ORDER: readonly TitlePathStageId[] = [
  'group',
  'r16',
  'qf',
  'sf',
  'final',
  'win',
] as const

interface StageProfile {
  marketSurvival: number
  modelSurvival: number
}

const HIGH_RANK_PROFILE: StageProfile = { marketSurvival: 0.88, modelSurvival: 0.9 }
const MID_RANK_PROFILE: StageProfile = { marketSurvival: 0.7, modelSurvival: 0.72 }
const LOW_RANK_PROFILE: StageProfile = { marketSurvival: 0.45, modelSurvival: 0.46 }

function profileForRank(rank: number): StageProfile {
  if (rank <= 8) return HIGH_RANK_PROFILE
  if (rank <= 20) return MID_RANK_PROFILE
  return LOW_RANK_PROFILE
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function roundProbability(value: number): number {
  return Math.round(clampProbability(value) * 10_000) / 10_000
}

function buildStageCurve(start: number, end: number, survival: number): number[] {
  const startSafe = clampProbability(start)
  const endSafe = clampProbability(Math.min(end, startSafe))
  const stages = TITLE_PATH_STAGE_ORDER.length
  if (startSafe === 0) return new Array(stages).fill(0)

  const totalShrink = endSafe / startSafe
  const survivalFloor = clampProbability(survival) || 0.5
  const minTotal = Math.pow(survivalFloor, stages - 1)
  const effectiveShrink = Math.max(totalShrink, minTotal)
  const perStage = Math.pow(effectiveShrink, 1 / (stages - 1))

  const out: number[] = []
  let current = startSafe
  for (let i = 0; i < stages; i += 1) {
    out.push(roundProbability(current))
    current *= perStage
  }
  out[stages - 1] = roundProbability(endSafe)
  return out
}

export function computeTitlePath(
  team: Team,
  marketIntel?: MarketIntelData | null,
): TitlePathBreakdown {
  const profile = profileForRank(team.fifaRanking)
  const marketWinProb = marketIntel
    ? clampProbability(marketIntel.impliedProbability / 100)
    : 0
  const modelWinProb = marketIntel?.modelEdge
    ? clampProbability(marketIntel.modelEdge.ourProbability)
    : marketWinProb

  const marketGroupProb = clampProbability(
    Math.max(marketWinProb * Math.pow(1 / profile.marketSurvival, 5), marketWinProb),
  )
  const modelGroupProb = clampProbability(
    Math.max(modelWinProb * Math.pow(1 / profile.modelSurvival, 5), modelWinProb),
  )

  const marketCurve = buildStageCurve(marketGroupProb, marketWinProb, profile.marketSurvival)
  const modelCurve = buildStageCurve(modelGroupProb, modelWinProb, profile.modelSurvival)

  const hasModelSignal = Boolean(marketIntel?.modelEdge)

  const stages: TitlePathStage[] = TITLE_PATH_STAGE_ORDER.map((stage, idx) => {
    const market = marketCurve[idx]
    const model = hasModelSignal ? modelCurve[idx] : market
    return {
      stage,
      modelProbability: model,
      marketProbability: market,
      edge: hasModelSignal ? Math.round((model - market) * 10_000) / 10_000 : 0,
    }
  })

  const biggestEdgeStage = hasModelSignal
    ? stages.reduce((bestId, current) => {
        const bestStage = stages.find((s) => s.stage === bestId)
        if (!bestStage) return current.stage
        return Math.abs(current.edge) > Math.abs(bestStage.edge) ? current.stage : bestId
      }, stages[0].stage)
    : 'win'

  return { stages, biggestEdgeStage, hasModelSignal }
}

export function formatEdgePercent(edge: number): string {
  const pct = edge * 100
  const rounded = Math.round(pct * 10) / 10
  if (rounded > 0) return `+${rounded.toFixed(1)}%`
  return `${rounded.toFixed(1)}%`
}

export function formatProbabilityPercent(prob: number): string {
  return `${(Math.round(prob * 1000) / 10).toFixed(1)}%`
}
