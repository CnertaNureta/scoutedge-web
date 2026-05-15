import { getTranslations } from 'next-intl/server'
import type { Player, PlayerIntelRecord, PlayerSignal, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'

// ── Visibility / display thresholds ───────────────────────────
const VISIBLE_SIGNAL_LIMIT = 5
const SUMMARY_TRUNCATE_CHARS = 140
const SPARKLINE_MIN_SIGNALS = 3
const SPARKLINE_DAYS = 7

// ── Verdict thresholds ────────────────────────────────────────
const HIGH_CONFIDENCE_MIN = 0.7
const LOW_CONFIDENCE_MAX = 0.5
const NET_SENTIMENT_POSITIVE_MIN = 0.2
const NET_SENTIMENT_NEGATIVE_MAX = -0.2

// ── Sparkline geometry ────────────────────────────────────────
const SPARKLINE_WIDTH = 84
const SPARKLINE_HEIGHT = 24
const SPARKLINE_PAD = 2

export type SourceTypeKey = NonNullable<PlayerSignal['sourceType']>
export type SignalSentiment = NonNullable<PlayerSignal['sentiment']>
export type SignalVerdictKey =
  | 'signalRich'
  | 'warningSignal'
  | 'lowConfidence'
  | 'mixedRead'
  | 'empty'

export interface SignalSummary {
  avgConfidence: number
  netSentiment: number
  sourceCount: number
  signalCount: number
  verdictKey: SignalVerdictKey
  sparklineSeries: number[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function startOfUtcDay(input: Date): number {
  return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
}

/**
 * Returns the count of signals per day for the last 7 days, ending today.
 * Index 0 is the oldest day (6 days ago); index 6 is today.
 * Always returns exactly 7 numeric entries.
 */
function buildSparklineSeries(
  signals: PlayerSignal[],
  now: Date = new Date(),
): number[] {
  const series = new Array<number>(SPARKLINE_DAYS).fill(0)
  const todayMs = startOfUtcDay(now)
  const ONE_DAY_MS = 86_400_000

  for (const signal of signals) {
    if (!signal.happenedAt) continue
    const t = new Date(signal.happenedAt).getTime()
    if (!Number.isFinite(t)) continue
    const dayMs = startOfUtcDay(new Date(t))
    const dayDiff = Math.round((todayMs - dayMs) / ONE_DAY_MS)
    if (dayDiff < 0 || dayDiff >= SPARKLINE_DAYS) continue
    const idx = SPARKLINE_DAYS - 1 - dayDiff
    series[idx] += 1
  }
  return series
}

function sentimentScalar(sentiment: SignalSentiment | undefined): number {
  if (sentiment === 'positive') return 1
  if (sentiment === 'negative') return -1
  if (sentiment === 'mixed') return -0.25
  return 0
}

function getVerdict(
  signalCount: number,
  avgConfidence: number,
  netSentiment: number,
): SignalVerdictKey {
  if (signalCount === 0) return 'empty'
  if (avgConfidence >= HIGH_CONFIDENCE_MIN && netSentiment >= NET_SENTIMENT_POSITIVE_MIN) {
    return 'signalRich'
  }
  if (avgConfidence >= HIGH_CONFIDENCE_MIN && netSentiment <= NET_SENTIMENT_NEGATIVE_MAX) {
    return 'warningSignal'
  }
  if (avgConfidence < LOW_CONFIDENCE_MAX) return 'lowConfidence'
  return 'mixedRead'
}

/**
 * Pure compute function — exported for unit testing.
 * Aggregates a signal list into confidence-weighted summary metrics.
 */
export function computeSignalSummary(
  signals: PlayerSignal[] | undefined | null,
  now: Date = new Date(),
): SignalSummary {
  const list = signals ?? []
  if (list.length === 0) {
    return {
      avgConfidence: 0,
      netSentiment: 0,
      sourceCount: 0,
      signalCount: 0,
      verdictKey: 'empty',
      sparklineSeries: new Array<number>(SPARKLINE_DAYS).fill(0),
    }
  }

  let confidenceSum = 0
  let confidenceN = 0
  let sentimentSum = 0
  const sources = new Set<string>()

  for (const signal of list) {
    if (typeof signal.confidence === 'number' && Number.isFinite(signal.confidence)) {
      confidenceSum += clamp(signal.confidence, 0, 1)
      confidenceN += 1
    }
    sentimentSum += sentimentScalar(signal.sentiment)
    if (signal.sourceType) sources.add(signal.sourceType)
  }

  const avgConfidence = confidenceN > 0 ? confidenceSum / confidenceN : 0
  const netSentiment = sentimentSum / list.length
  const verdictKey = getVerdict(list.length, avgConfidence, netSentiment)
  const sparklineSeries = buildSparklineSeries(list, now)

  return {
    avgConfidence,
    netSentiment,
    sourceCount: sources.size,
    signalCount: list.length,
    verdictKey,
    sparklineSeries,
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P4-${playerPart}-2026`
}

function sourceBadgeVariant(
  sourceType: SourceTypeKey | undefined,
): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  switch (sourceType) {
    case 'player_profile':
      return 'primary'
    case 'social_post':
      return 'tertiary'
    case 'seo_article':
      return 'secondary'
    case 'derived_rule':
    default:
      return 'outline'
  }
}

function sourceLabelKey(sourceType: SourceTypeKey | undefined): string {
  switch (sourceType) {
    case 'player_profile':
      return 'profile'
    case 'social_post':
      return 'social'
    case 'seo_article':
      return 'press'
    case 'derived_rule':
    default:
      return 'derived'
  }
}

function sentimentColor(sentiment: SignalSentiment | undefined): string {
  if (sentiment === 'positive') return BRAND.primary
  if (sentiment === 'negative') return BRAND.secondary
  if (sentiment === 'mixed') return BRAND.tertiary
  return SURFACE.onSurfaceVariant
}

function signalWeight(signal: PlayerSignal): number {
  const confidence = typeof signal.confidence === 'number' ? clamp(signal.confidence, 0, 1) : 0.5
  // No explicit per-signal weight on PlayerSignal — treat confidence as the
  // ordering scalar. PlayerSignalRecord (storage layer) has a separate weight,
  // but it isn't carried into the embedded recent_signals shape.
  return confidence
}

function formatRelative(input: string | undefined, now: Date = new Date()): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = d.getTime() - now.getTime()
  const absDays = Math.abs(Math.round(diffMs / 86_400_000))
  if (absDays === 0) return 'today'
  if (absDays === 1) return '1d'
  if (absDays < 30) return `${absDays}d`
  const months = Math.round(absDays / 30)
  if (months < 12) return `${months}mo`
  const years = Math.round(absDays / 365)
  return `${years}y`
}

interface SparklineProps {
  series: number[]
  accentColor: string
}

function Sparkline({ series, accentColor }: SparklineProps) {
  const max = Math.max(1, ...series)
  const stepX = (SPARKLINE_WIDTH - SPARKLINE_PAD * 2) / Math.max(1, series.length - 1)
  const usableH = SPARKLINE_HEIGHT - SPARKLINE_PAD * 2
  const points = series
    .map((value, i) => {
      const x = SPARKLINE_PAD + stepX * i
      const y = SPARKLINE_PAD + usableH * (1 - value / max)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      role="img"
      aria-label={`7-day signal volume: ${series.join(', ')}`}
      className="shrink-0"
    >
      <polyline
        fill="none"
        stroke={accentColor}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  )
}

interface SignalLedgerProps {
  player: Player
  team: Team
  playerIntel: PlayerIntelRecord | null
}

export default async function SignalLedger({ player, team, playerIntel }: SignalLedgerProps) {
  const t = await getTranslations('signalLedger')

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const signals = playerIntel?.recent_signals ?? []
  const summary = computeSignalSummary(signals)
  const lastUpdatedAt =
    playerIntel?.last_updated ??
    playerIntel?.last_signal_at ??
    new Date().toISOString()

  const sortedSignals = [...signals].sort((a, b) => signalWeight(b) - signalWeight(a))
  const visibleSignals = sortedSignals.slice(0, VISIBLE_SIGNAL_LIMIT)
  const blurredCount = Math.max(0, sortedSignals.length - VISIBLE_SIGNAL_LIMIT)
  const showSparkline = signals.length >= SPARKLINE_MIN_SIGNALS

  const signalCount = playerIntel?.signal_count ?? summary.signalCount
  const sourceCount = summary.sourceCount

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('title')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={t(`verdict.${summary.verdictKey}`)}
          signalCount={signalCount}
          sourceCount={sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
          {summary.signalCount === 0 ? (
            <div className="py-8 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2">
                {t('emptyState')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {showSparkline && (
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                    {t('sparkline7d')}
                  </p>
                  <Sparkline series={summary.sparklineSeries} accentColor={accentColor} />
                </div>
              )}

              <ul className="flex flex-col gap-3 list-none p-0">
                {visibleSignals.map((signal, idx) => {
                  const confidence = typeof signal.confidence === 'number'
                    ? Math.round(clamp(signal.confidence, 0, 1) * 100)
                    : 0
                  return (
                    <li
                      key={signal.id ?? `${signal.sourceType ?? 'na'}-${idx}`}
                      className="flex flex-col md:flex-row md:items-start md:gap-4 gap-2 p-3 bg-surface-container-low rounded-lg border border-white/5"
                    >
                      <div className="flex flex-col gap-1 md:w-20 shrink-0">
                        <Badge variant={sourceBadgeVariant(signal.sourceType)} size="sm">
                          {t(`sourceTypes.${sourceLabelKey(signal.sourceType)}`)}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        {signal.category && (
                          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                            {t(`categories.${signal.category}`)}
                          </p>
                        )}
                        <p
                          className="text-sm text-on-surface leading-snug"
                          style={{ borderLeft: `2px solid ${sentimentColor(signal.sentiment)}`, paddingLeft: '0.5rem' }}
                        >
                          {truncate(signal.text, SUMMARY_TRUNCATE_CHARS)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 md:w-32 shrink-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                            {t('confidenceLabel')}
                          </span>
                          <span className="font-mono text-xs font-bold" style={{ color: accentColor }}>
                            {confidence}
                          </span>
                        </div>
                        <ChemistryBar value={confidence} showValue={false} size="sm" />
                        {signal.happenedAt && (
                          <span className="font-mono text-[10px] text-on-surface-variant/70">
                            {formatRelative(signal.happenedAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {blurredCount > 0 && (
                <div className="relative">
                  <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg opacity-40 blur-[2px] border border-white/5">
                    <Badge variant="outline" size="sm">·</Badge>
                    <p className="text-sm text-on-surface">
                      {t('viewAllSignals', { count: signals.length })}
                    </p>
                  </div>
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${SURFACE.surfaceContainerLow})`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
