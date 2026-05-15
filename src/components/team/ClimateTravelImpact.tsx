import type { Team, Player } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { BRAND } from '@/lib/brand-tokens'
import { getTeamColors } from '@/lib/team-colors'
import { getFixturesByTeam, getAllVenues } from '@/lib/data-service'
import {
  computeClimateTravel,
  type ClimateBand,
  type FixtureClimate,
} from '@/lib/intelligence/climate-travel'

type VerdictTier = 'comfortable' | 'manageable' | 'punishing'

function pickVerdictTier(
  totalKm: number,
  worstPct: number,
): VerdictTier {
  if (worstPct >= 60 && totalKm < 5000) return 'comfortable'
  if (worstPct < 30 || totalKm > 9000) return 'punishing'
  return 'manageable'
}

interface ClimateTravelImpactProps {
  team: Team
  players: Player[]
}

export default async function ClimateTravelImpact({
  team,
  players,
}: ClimateTravelImpactProps) {
  const t = await getTranslations('climateTravel')
  const colors = getTeamColors(team.slug)

  const fixtures = getFixturesByTeam(team.slug)
  const venues = getAllVenues()
  const breakdown = computeClimateTravel(team, fixtures, venues, players)

  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T8-CLIMATE-TRAVEL-2026`

  const worstRow =
    breakdown.fixtures.find((f) => f.fixtureId === breakdown.worstFixtureId) ??
    null
  const worstPct = worstRow ? worstRow.squadHomeMatchPct : 100

  const tier = pickVerdictTier(breakdown.totalTravelKm, worstPct)
  const accentColor = tier === 'punishing' ? BRAND.secondary : colors.primary

  const lastUpdatedAt = new Date().toISOString()

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={t(`scoutVerdict.${tier}`)}
        signalCount={breakdown.signalCount}
        sourceCount={breakdown.sourceCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={accentColor}
      >
        {breakdown.fixtures.length === 0 ? (
          <p className="font-body text-sm text-on-surface-variant">
            {t('emptyState')}
          </p>
        ) : (
          <>
            <FixtureList
              rows={breakdown.fixtures}
              worstFixtureId={breakdown.worstFixtureId}
              labels={{
                venueHeader: t('fixtureHeader.venue'),
                climateHeader: t('fixtureHeader.climate'),
                kmHeader: t('fixtureHeader.km'),
                fitHeader: t('fixtureHeader.fit'),
              }}
              bandLabels={{
                'hot-humid': t('climateBands.hotHumid'),
                'hot-dry': t('climateBands.hotDry'),
                temperate: t('climateBands.temperate'),
                cold: t('climateBands.cold'),
                altitude: t('climateBands.altitude'),
              }}
              accentColor={accentColor}
            />

            <SummaryStats
              totalKm={breakdown.totalTravelKm}
              worstRow={worstRow}
              totalKmLabel={t('totalKmLabel')}
              worstFitLabel={t('worstFitLabel')}
              accentColor={accentColor}
            />
          </>
        )}
      </IntelligenceModule>
    </section>
  )
}

interface FixtureListProps {
  rows: ReadonlyArray<FixtureClimate>
  worstFixtureId: string | null
  labels: {
    venueHeader: string
    climateHeader: string
    kmHeader: string
    fitHeader: string
  }
  bandLabels: Record<ClimateBand, string>
  accentColor: string
}

function FixtureList({
  rows,
  worstFixtureId,
  labels,
  bandLabels,
  accentColor,
}: FixtureListProps) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 px-3 mb-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        <span>{labels.venueHeader}</span>
        <span>{labels.climateHeader}</span>
        <span className="text-right">{labels.kmHeader}</span>
        <span className="text-right">{labels.fitHeader}</span>
      </div>
      <ol className="space-y-1">
        {rows.map((row) => (
          <FixtureRow
            key={row.fixtureId}
            row={row}
            isWorst={row.fixtureId === worstFixtureId}
            bandLabel={bandLabels[row.climateBand]}
            accentColor={accentColor}
          />
        ))}
      </ol>
    </div>
  )
}

interface FixtureRowProps {
  row: FixtureClimate
  isWorst: boolean
  bandLabel: string
  accentColor: string
}

function FixtureRow({ row, isWorst, bandLabel, accentColor }: FixtureRowProps) {
  return (
    <li
      className="group relative grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-3 py-3 rounded-md bg-white/[0.02] border border-white/[0.05]"
    >
      {isWorst && <NeonAccentBar color={accentColor} />}
      <span className="font-headline text-sm tracking-wide text-on-surface truncate">
        {row.venueName}
      </span>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        {bandLabel}
      </span>
      <span className="font-mono text-xs text-on-surface-variant text-right tabular-nums">
        {row.travelKm.toLocaleString()} km
      </span>
      <span
        className="font-mono text-sm text-right tabular-nums"
        style={{ color: isWorst ? accentColor : BRAND.primary }}
      >
        {row.squadHomeMatchPct}%
      </span>
    </li>
  )
}

interface SummaryStatsProps {
  totalKm: number
  worstRow: FixtureClimate | null
  totalKmLabel: string
  worstFitLabel: string
  accentColor: string
}

function SummaryStats({
  totalKm,
  worstRow,
  totalKmLabel,
  worstFitLabel,
  accentColor,
}: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-md bg-white/[0.02] border border-white/[0.05] px-4 py-3">
        <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
          {totalKmLabel}
        </p>
        <p
          className="font-display text-2xl tabular-nums"
          style={{ color: BRAND.primary }}
        >
          {totalKm.toLocaleString()} km
        </p>
      </div>
      <div className="rounded-md bg-white/[0.02] border border-white/[0.05] px-4 py-3">
        <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
          {worstFitLabel}
        </p>
        {worstRow ? (
          <p
            className="font-display text-2xl tabular-nums"
            style={{ color: accentColor }}
          >
            {worstRow.venueName}{' '}
            <span className="font-mono text-sm align-middle text-on-surface-variant">
              · {worstRow.squadHomeMatchPct}%
            </span>
          </p>
        ) : (
          <p className="font-display text-2xl text-on-surface-variant">—</p>
        )}
      </div>
    </div>
  )
}
