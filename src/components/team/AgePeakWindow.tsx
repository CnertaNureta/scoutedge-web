import type { Team, Player } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import { BRAND } from '@/lib/brand-tokens'
import {
  computeAgePeak,
  type AgePeakRow,
  type PositionGroup,
  type Verdict,
} from '@/lib/intelligence/age-peak'

/** Visualisation min/max age so every group renders on the same scale. */
const AXIS_MIN_AGE = 16
const AXIS_MAX_AGE = 40

interface AgePeakWindowProps {
  team: Team
  players: Player[]
}

function clampPercent(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function ageToPercent(age: number): number {
  const pct = ((age - AXIS_MIN_AGE) / (AXIS_MAX_AGE - AXIS_MIN_AGE)) * 100
  return clampPercent(pct)
}

function formatAge(age: number): string {
  return age.toFixed(1)
}

function formatSignedDistance(distance: number): string {
  if (distance === 0) return '0.0'
  const rounded = distance.toFixed(1)
  return distance > 0 ? `+${rounded}` : rounded
}

export default async function AgePeakWindow({
  team,
  players,
}: AgePeakWindowProps) {
  const t = await getTranslations('agePeak')

  const breakdown = computeAgePeak(players)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T9-AGE-PEAK-2026`
  const lastUpdatedAt = new Date().toISOString()
  const accentColor = BRAND.primary

  const positionLabels: Record<PositionGroup, string> = {
    GK: t('positionLabels.GK'),
    CB: t('positionLabels.CB'),
    FB: t('positionLabels.FB'),
    DM: t('positionLabels.DM'),
    CM: t('positionLabels.CM'),
    AM: t('positionLabels.AM'),
    W: t('positionLabels.W'),
    ST: t('positionLabels.ST'),
  }

  const verdictLabels: Record<Verdict, string> = {
    peaking: t('peakingLabel'),
    ascending: t('ascendingLabel'),
    declining: t('decliningLabel'),
    mixed: t('mixedLabel'),
  }

  const scoutVerdict = t('scoutVerdict', {
    team: team.name,
    verdict: verdictLabels[breakdown.verdict],
  })

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={scoutVerdict}
        signalCount={breakdown.signalCount}
        sourceCount={breakdown.sourceCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={accentColor}
      >
        {/* Totals strip */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SummaryStat
            label={t('inPeakCount')}
            value={`${breakdown.totalInPeak} / ${breakdown.totalPlayers}`}
            accent={accentColor}
          />
          <SummaryStat
            label={t('outsidePeakCount')}
            value={`${breakdown.totalAscending + breakdown.totalDeclining} / ${breakdown.totalPlayers}`}
            accent={BRAND.tertiary}
          />
        </div>

        {/* Position rows */}
        {breakdown.rows.length === 0 ? (
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 py-6 text-center">
            {t('emptyState')}
          </p>
        ) : (
          <ol className="space-y-3">
            {breakdown.rows.map((row) => (
              <AgePeakRowItem
                key={row.group}
                row={row}
                label={positionLabels[row.group]}
                accent={accentColor}
                inPeakLabel={t('inPeakShort')}
                outsidePeakLabel={t('outsidePeakShort')}
                avgAgeLabel={t('avgAgeLabel')}
              />
            ))}
          </ol>
        )}
      </IntelligenceModule>
    </section>
  )
}

interface SummaryStatProps {
  label: string
  value: string
  accent: string
}

function SummaryStat({ label, value, accent }: SummaryStatProps) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-lg px-4 py-3">
      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
        {label}
      </p>
      <p
        className="font-headline text-2xl tracking-wide"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  )
}

interface AgePeakRowItemProps {
  row: AgePeakRow
  label: string
  accent: string
  inPeakLabel: string
  outsidePeakLabel: string
  avgAgeLabel: string
}

function AgePeakRowItem({
  row,
  label,
  accent,
  inPeakLabel,
  outsidePeakLabel,
  avgAgeLabel,
}: AgePeakRowItemProps) {
  const bandLeftPct = ageToPercent(row.peakBand.low)
  const bandRightPct = ageToPercent(row.peakBand.high)
  const bandWidthPct = Math.max(0, bandRightPct - bandLeftPct)
  const avgAgePct = ageToPercent(row.avgAge)
  const outsideCount = row.ascendingCount + row.decliningCount

  return (
    <li className="border-b border-white/[0.05] last:border-b-0 py-3">
      {/* Header row — position label + counts */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border"
            style={{ borderColor: `${accent}55`, color: accent }}
          >
            {row.group}
          </span>
          <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
          <span style={{ color: accent }}>
            {row.inPeakCount} {inPeakLabel}
          </span>
          <span className="text-on-surface-variant/60">·</span>
          <span className="text-on-surface-variant">
            {outsideCount} {outsidePeakLabel}
          </span>
        </div>
      </div>

      {/* Inline visualisation — peak band as a translucent rail, avg-age tick */}
      <div className="relative h-6 w-full">
        {/* Baseline rail */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.08]" />

        {/* Peak band */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full"
          style={{
            left: `${bandLeftPct}%`,
            width: `${bandWidthPct}%`,
            background: `linear-gradient(to right, ${accent}33, ${accent}55)`,
            border: `1px solid ${accent}88`,
          }}
          aria-hidden="true"
        />

        {/* Average age marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[2px] h-5"
          style={{
            left: `${avgAgePct}%`,
            background: BRAND.tertiary,
            boxShadow: `0 0 6px ${BRAND.tertiary}88`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Footer row — band range + avg age + signed distance */}
      <div className="flex items-center justify-between gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/80">
        <span>
          {row.peakBand.low}–{row.peakBand.high}
        </span>
        <span>
          {avgAgeLabel}: {formatAge(row.avgAge)} ({formatSignedDistance(row.avgDistanceFromCenter)})
        </span>
      </div>
    </li>
  )
}
