import { getTranslations } from 'next-intl/server'
import type { MatchFixture, Player, Team } from '@/lib/types'
import {
  computeMatchProjection,
  type MatchProjectionRow,
  type ThreatTier,
} from '@/lib/intelligence/match-projection'
import { getAllTeams } from '@/lib/data-service'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, POSITION_HEX } from '@/lib/brand-tokens'

const THREAT_TIER_VARIANT: Record<ThreatTier, 'primary' | 'tertiary' | 'secondary' | 'outline'> = {
  S: 'primary',
  A: 'tertiary',
  B: 'outline',
  C: 'secondary',
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P6-${playerPart}-MATCH-PROJECTION-2026`
}

interface ProjectionRowProps {
  row: MatchProjectionRow
  accentColor: string
  threatLabel: string
  minutesLabel: string
  roleLabel: string
  opponentLabel: string
  threatHeaderLabel: string
  keyMatchupTemplate: string
}

function ProjectionRow({
  row,
  accentColor,
  threatLabel,
  minutesLabel,
  roleLabel,
  opponentLabel,
  threatHeaderLabel,
  keyMatchupTemplate,
}: ProjectionRowProps) {
  const matchupNote = row.keyMatchupNote
    ? keyMatchupTemplate.replace('{matchup}', row.keyMatchupNote)
    : null

  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[1.4fr_1.4fr_1.6fr_0.8fr] md:items-center md:gap-6 p-4 md:px-5 md:py-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest md:hidden">
          {opponentLabel}
        </span>
        <div className="flex items-center gap-2.5 ml-auto md:ml-0">
          {row.opponentFlag && (
            <span aria-hidden="true" className="text-xl">
              {row.opponentFlag}
            </span>
          )}
          <span className="font-headline text-base md:text-lg tracking-wide">
            {row.opponentName}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest md:hidden">
          {roleLabel}
        </span>
        <span
          className="font-body text-sm md:text-base"
          style={{ color: accentColor }}
        >
          {row.projectedRole}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
            {minutesLabel}
          </span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: accentColor }}
          >
            {row.projectedMinutesPct}%
          </span>
        </div>
        <ChemistryBar value={row.projectedMinutesPct} showValue={false} size="sm" />
        {matchupNote && (
          <p className="font-body text-xs text-on-surface-variant italic mt-1">
            {matchupNote}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between md:justify-end">
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest md:hidden">
          {threatHeaderLabel}
        </span>
        <Badge variant={THREAT_TIER_VARIANT[row.threatTier]} size="md">
          {threatLabel}
        </Badge>
      </div>
    </div>
  )
}

interface MatchProjectionTableProps {
  player: Player
  team: Team
  fixtures: MatchFixture[]
}

export default async function MatchProjectionTable({
  player,
  team,
  fixtures,
}: MatchProjectionTableProps) {
  const t = await getTranslations('matchProjection')
  const opponents = getAllTeams()
  const breakdown = computeMatchProjection(player, team, fixtures, opponents)

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const lastUpdatedAt = new Date().toISOString()

  const verdictText = t('scoutVerdict', {
    player: player.name,
    count: breakdown.rows.length,
  })

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={verdictText}
          signalCount={breakdown.signalCount}
          sourceCount={breakdown.sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
          {breakdown.rows.length === 0 ? (
            <p className="font-body text-sm text-on-surface-variant italic">
              {t('emptyState')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div
                className="hidden md:grid md:grid-cols-[1.4fr_1.4fr_1.6fr_0.8fr] md:gap-6 px-5 pb-2 border-b border-white/[0.06]"
                aria-hidden="true"
              >
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {t('columns.opponent')}
                </span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {t('columns.role')}
                </span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {t('columns.minutes')}
                </span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest text-right">
                  {t('columns.threat')}
                </span>
              </div>

              {breakdown.rows.map((row) => (
                <ProjectionRow
                  key={row.fixtureId}
                  row={row}
                  accentColor={accentColor}
                  threatLabel={t(`threatTier.${row.threatTier}`)}
                  minutesLabel={t('columns.minutes')}
                  roleLabel={t('columns.role')}
                  opponentLabel={t('columns.opponent')}
                  threatHeaderLabel={t('columns.threat')}
                  keyMatchupTemplate={t('keyMatchupTemplate')}
                />
              ))}
            </div>
          )}
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
