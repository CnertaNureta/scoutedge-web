import { getTranslations } from 'next-intl/server'
import type { MarketIntelData, Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import {
  computeTitlePath,
  formatEdgePercent,
  formatProbabilityPercent,
  type TitlePathStage,
  type TitlePathStageId,
} from '@/lib/intelligence/title-path'

interface TitlePathProbabilityTreeProps {
  team: Team
  marketIntel?: MarketIntelData | null
}

const STAGE_LABEL_KEYS: Record<TitlePathStageId, string> = {
  group: 'stageGroup',
  r16: 'stageR16',
  qf: 'stageQF',
  sf: 'stageSF',
  final: 'stageFinal',
  win: 'stageWin',
}

const DEFAULT_SIGNAL_COUNT = 6
const DEFAULT_SOURCE_COUNT = 3

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export default async function TitlePathProbabilityTree({
  team,
  marketIntel,
}: TitlePathProbabilityTreeProps) {
  const t = await getTranslations('titlePath')
  const colors = getTeamColors(team.slug)
  const breakdown = computeTitlePath(team, marketIntel ?? null)

  const biggestStage =
    breakdown.stages.find((s) => s.stage === breakdown.biggestEdgeStage) ??
    breakdown.stages[0]

  const verdict = breakdown.hasModelSignal
    ? t('verdict', {
        team: team.name,
        stage: t(STAGE_LABEL_KEYS[biggestStage.stage]),
        edge: formatEdgePercent(biggestStage.edge),
      })
    : t('verdictFallback', { team: team.name })

  const now = new Date()
  const isoWeek = getISOWeek(now)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T2-W${isoWeek}-2026`
  const sourceCount = marketIntel?.tournamentPrices
    ? new Set(marketIntel.tournamentPrices.map((p) => p.source)).size ||
      DEFAULT_SOURCE_COUNT
    : DEFAULT_SOURCE_COUNT
  const signalCount = marketIntel?.tournamentPrices?.length ?? DEFAULT_SIGNAL_COUNT
  const lastUpdatedAt = now.toISOString()

  return (
    <section
      className="max-w-[1440px] mx-auto px-6 mb-12"
      aria-labelledby={`title-path-heading-${team.slug}`}
    >
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={verdict}
        signalCount={signalCount}
        sourceCount={sourceCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={colors.primary}
      >
        <div className="relative rounded-xl overflow-hidden">
          <NeonAccentBar color={colors.primary} />

          <header className="grid grid-cols-[1fr_64px_64px_72px] sm:grid-cols-[1fr_88px_88px_96px] gap-3 px-1 pt-4 pb-3 border-b border-white/[0.06]">
            <span className="font-label text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-[0.18em]">
              {t('stageHeader')}
            </span>
            <span className="font-label text-[10px] sm:text-xs text-right text-on-surface-variant uppercase tracking-[0.18em]">
              {t('modelHeader')}
            </span>
            <span className="font-label text-[10px] sm:text-xs text-right text-on-surface-variant uppercase tracking-[0.18em]">
              {t('marketHeader')}
            </span>
            <span className="font-label text-[10px] sm:text-xs text-right text-on-surface-variant uppercase tracking-[0.18em]">
              {t('edgeHeader')}
            </span>
          </header>

          <ol className="divide-y divide-white/[0.04]">
            {breakdown.stages.map((stage) => (
              <StageRow
                key={stage.stage}
                stage={stage}
                stageLabel={t(STAGE_LABEL_KEYS[stage.stage])}
                isBiggestEdge={
                  breakdown.hasModelSignal &&
                  stage.stage === breakdown.biggestEdgeStage
                }
                accent={colors.primary}
                glow={colors.glow}
              />
            ))}
          </ol>
        </div>
      </IntelligenceModule>
    </section>
  )
}

interface StageRowProps {
  stage: TitlePathStage
  stageLabel: string
  isBiggestEdge: boolean
  accent: string
  glow: string
}

function StageRow({ stage, stageLabel, isBiggestEdge, accent, glow }: StageRowProps) {
  const edgePositive = stage.edge > 0
  const edgeNegative = stage.edge < 0
  const edgeColor = edgePositive
    ? glow
    : edgeNegative
      ? 'rgb(255, 180, 170)'
      : 'rgb(194, 201, 187)'

  return (
    <li
      className="px-1 py-4 relative"
      style={
        isBiggestEdge
          ? {
              background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 12%, transparent), transparent 60%)`,
              boxShadow: `inset 3px 0 0 0 ${accent}`,
            }
          : undefined
      }
      aria-current={isBiggestEdge ? 'true' : undefined}
    >
      <div className="grid grid-cols-[1fr_64px_64px_72px] sm:grid-cols-[1fr_88px_88px_96px] gap-3 items-center">
        <div className="min-w-0">
          <p className="font-headline text-sm sm:text-base font-bold tracking-tight text-on-surface truncate">
            {stageLabel}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.max(stage.marketProbability * 100, 0)}%`,
                background: 'rgba(194, 201, 187, 0.35)',
              }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.max(stage.modelProbability * 100, 0)}%`,
                background: `linear-gradient(90deg, ${accent}, ${glow})`,
                mixBlendMode: 'screen',
              }}
              aria-hidden
            />
          </div>
        </div>
        <span
          className="font-headline text-sm sm:text-base font-bold text-right tabular-nums"
          style={{ color: glow }}
        >
          {formatProbabilityPercent(stage.modelProbability)}
        </span>
        <span className="font-headline text-sm sm:text-base font-semibold text-right tabular-nums text-on-surface-variant">
          {formatProbabilityPercent(stage.marketProbability)}
        </span>
        <span className="text-right">
          <span
            className="inline-flex items-center justify-end font-label text-[11px] sm:text-xs font-bold uppercase tracking-widest tabular-nums px-2 py-1 rounded-full"
            style={{
              color: edgeColor,
              backgroundColor: `color-mix(in srgb, ${edgeColor} 12%, transparent)`,
            }}
          >
            {formatEdgePercent(stage.edge)}
          </span>
        </span>
      </div>
    </li>
  )
}
