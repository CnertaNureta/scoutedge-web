import type { Team, MarketIntelData } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import { getTeamColors } from '@/lib/team-colors'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import { BRAND } from '@/lib/brand-tokens'
import { getISOWeek } from './ScoutEdgeScore'

const ALIGNED_EDGE_THRESHOLD = 0.02
const STRONG_EDGE_THRESHOLD = 0.05
const BPS_PER_UNIT = 10000

export type SpreadVerdictKey = 'aligned' | 'modelHigh' | 'modelLow' | 'modest'

interface VerdictKeys {
  aligned: string
  modelHigh: string
  modelLow: string
  modest: string
}

interface MovementLabels {
  shortening: string
  drifting: string
  stable: string
}

export interface MarketModelSpreadResult {
  /** Market implied probability as a percentage 0-100 */
  marketPct: number
  /** Model probability as a percentage 0-100 (null when no modelEdge) */
  modelPct: number | null
  /** Edge in basis points (positive = model > market) */
  edgeBps: number
  verdictKey: SpreadVerdictKey
}

/**
 * Pure compute fn — extracted so it can be unit-tested without next-intl.
 */
export function computeMarketModelSpread(
  marketIntel: MarketIntelData,
): MarketModelSpreadResult {
  const marketPct = clampPct(marketIntel.impliedProbability * 100)
  const edge = marketIntel.modelEdge?.edge ?? 0
  const modelPct =
    marketIntel.modelEdge != null
      ? clampPct(marketIntel.modelEdge.ourProbability * 100)
      : null
  const edgeBps = Math.round(edge * BPS_PER_UNIT)

  const verdictKey: SpreadVerdictKey = pickVerdict(marketIntel.modelEdge?.edge)

  return { marketPct, modelPct, edgeBps, verdictKey }
}

function clampPct(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function pickVerdict(edge: number | undefined): SpreadVerdictKey {
  if (edge == null) return 'aligned'
  if (Math.abs(edge) < ALIGNED_EDGE_THRESHOLD) return 'aligned'
  if (edge >= STRONG_EDGE_THRESHOLD) return 'modelHigh'
  if (edge <= -STRONG_EDGE_THRESHOLD) return 'modelLow'
  return 'modest'
}

interface MarketModelSpreadProps {
  team: Team
  marketIntel: MarketIntelData
}

export default async function MarketModelSpread({
  team,
  marketIntel,
}: MarketModelSpreadProps) {
  const t = await getTranslations('marketModelSpread')
  const colors = getTeamColors(team.slug)

  const verdicts: VerdictKeys = {
    aligned: t('verdict.aligned'),
    modelHigh: t('verdict.modelHigh'),
    modelLow: t('verdict.modelLow'),
    modest: t('verdict.modest'),
  }

  const movementLabels: MovementLabels = {
    shortening: t('movement.shortening'),
    drifting: t('movement.drifting'),
    stable: t('movement.stable'),
  }

  const result = computeMarketModelSpread(marketIntel)
  const { marketPct, modelPct, edgeBps, verdictKey } = result

  const accentColor =
    verdictKey === 'modelLow' ? BRAND.secondary : colors.primary

  const now = new Date()
  const isoWeek = getISOWeek(now)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T6-W${isoWeek}-2026`

  const signalCount = marketIntel.tournamentPrices.length
  const sourceCount =
    new Set(marketIntel.tournamentPrices.map((p) => p.source)).size ||
    marketIntel.tournamentPrices.length ||
    5

  const lastUpdatedAt = now.toISOString()

  const signalStrength = marketIntel.modelEdge?.signalStrength
  const signalStrengthLabel = signalStrength
    ? t(`signalStrength.${signalStrength}`)
    : t('signalStrength.none')

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('title')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={verdicts[verdictKey]}
        signalCount={signalCount}
        sourceCount={sourceCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={accentColor}
      >
        {/* Big stacked numbers — Market vs Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
          <div className="flex flex-col items-center">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
              {t('marketLabel')}
            </p>
            <AnimatedNumber
              value={marketPct}
              decimals={1}
              suffix="%"
              className="text-[56px] leading-none tracking-tight"
              style={{ color: BRAND.tertiary }}
            />
          </div>
          <div className="flex flex-col items-center">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
              {t('modelLabel')}
            </p>
            {modelPct != null ? (
              <AnimatedNumber
                value={modelPct}
                decimals={1}
                suffix="%"
                className="text-[56px] leading-none tracking-tight"
                style={{ color: accentColor }}
              />
            ) : (
              <span
                className="font-mono text-[56px] leading-none tracking-tight"
                style={{ color: accentColor }}
              >
                —
              </span>
            )}
          </div>
        </div>

        {/* Spread bar — Market vs Model bands */}
        <SpreadBar
          marketPct={marketPct}
          modelPct={modelPct}
          marketLabel={t('marketLabel')}
          modelLabel={t('modelLabel')}
          accentColor={accentColor}
        />

        {/* Mini-grid: movement, signal strength, edge */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <MiniStat
            label={t('movementLabel')}
            value={movementLabels[marketIntel.movement]}
          />
          <MiniStat label={t('signalStrengthLabel')} value={signalStrengthLabel} />
          <MiniStat
            label={t('edgeLabel')}
            value={formatBps(edgeBps)}
            color={
              edgeBps > 0
                ? colors.primary
                : edgeBps < 0
                  ? BRAND.secondary
                  : undefined
            }
          />
        </div>

        {/* Sources table */}
        {marketIntel.tournamentPrices.length > 0 && (
          <div className="mt-6">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
              {t('sourcesLabel')}
            </p>
            <ul className="divide-y divide-white/[0.06] border-t border-b border-white/[0.06]">
              {marketIntel.tournamentPrices.map((price) => (
                <li
                  key={price.source}
                  className="flex items-center justify-between py-2 font-mono text-xs"
                >
                  <span className="text-on-surface-variant uppercase tracking-wider">
                    {price.source}
                  </span>
                  <span className="text-on-surface">
                    {price.decimalOdds.toFixed(2)}
                  </span>
                  <span className="text-on-surface-variant">
                    {(price.impliedProbability * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </IntelligenceModule>
    </section>
  )
}

interface MiniStatProps {
  label: string
  value: string
  color?: string
}

function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <div>
      <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-1.5">
        {label}
      </p>
      <p
        className="font-headline text-base tracking-wide uppercase"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

interface SpreadBarProps {
  marketPct: number
  modelPct: number | null
  marketLabel: string
  modelLabel: string
  accentColor: string
}

function SpreadBar({
  marketPct,
  modelPct,
  marketLabel,
  modelLabel,
  accentColor,
}: SpreadBarProps) {
  const ariaLabel =
    modelPct != null
      ? `${marketLabel} ${marketPct.toFixed(1)}%, ${modelLabel} ${modelPct.toFixed(1)}%`
      : `${marketLabel} ${marketPct.toFixed(1)}%`

  return (
    <div className="w-full mt-2 space-y-3" role="img" aria-label={ariaLabel}>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            {marketLabel}
          </span>
          <span className="font-mono text-[11px] text-on-surface-variant">
            {marketPct.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${marketPct}%`,
              background: `linear-gradient(90deg, ${BRAND.tertiary}, ${BRAND.tertiaryFixed})`,
            }}
          />
        </div>
      </div>
      {modelPct != null && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {modelLabel}
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">
              {modelPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${modelPct}%`,
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function formatBps(bps: number): string {
  const sign = bps > 0 ? '+' : ''
  return `${sign}${bps} bps`
}
