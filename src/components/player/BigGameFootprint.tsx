import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Paywall from '@/components/monetization/Paywall'
import Badge from '@/components/ui/Badge'
import { BRAND, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'
import {
  computeBigGameFootprint,
  type BigGameAppearance,
  type BigGameStage,
  type BigGameVerdict,
} from '@/lib/intelligence/big-game-footprint'

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-BIG-GAME-${playerPart}-2026`
}

function stageBadgeVariant(
  stage: BigGameStage,
): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  switch (stage) {
    case 'final':
      return 'primary'
    case 'semi':
    case 'quarter':
      return 'tertiary'
    case 'r16':
    case 'groupDecider':
      return 'outline'
    case 'friendly':
    default:
      return 'outline'
  }
}

function stageLabelKey(stage: BigGameStage):
  | 'stageFinal'
  | 'stageSemi'
  | 'stageQuarter'
  | 'stageR16'
  | 'stageGroupDecider'
  | 'stageFriendly' {
  switch (stage) {
    case 'final':
      return 'stageFinal'
    case 'semi':
      return 'stageSemi'
    case 'quarter':
      return 'stageQuarter'
    case 'r16':
      return 'stageR16'
    case 'groupDecider':
      return 'stageGroupDecider'
    case 'friendly':
    default:
      return 'stageFriendly'
  }
}

function verdictLabelKey(
  verdict: BigGameVerdict,
): 'verdictRises' | 'verdictSteady' | 'verdictFades' {
  switch (verdict) {
    case 'rises':
      return 'verdictRises'
    case 'fades':
      return 'verdictFades'
    case 'steady':
    default:
      return 'verdictSteady'
  }
}

interface BigGameFootprintProps {
  player: Player
  team: Team
}

export default async function BigGameFootprint({
  player,
  team,
}: BigGameFootprintProps) {
  const t = await getTranslations('bigGameFootprint')

  const breakdown = computeBigGameFootprint(player)
  const {
    appearances,
    meanRating,
    bestPerformance,
    bigGameVerdict,
    signalCount,
    sourceCount,
  } = breakdown

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const verdictLabel = t(verdictLabelKey(bigGameVerdict))
  const verdictText = t('scoutVerdict', {
    player: player.name,
    verdict: verdictLabel,
    meanRating: meanRating.toFixed(1),
  })

  // Fades = number of appearances rated below 5.5 (matches the fades threshold).
  const fadeCount = appearances.filter((a) => a.performanceRating < 5.5).length

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={verdictText}
          signalCount={signalCount}
          sourceCount={sourceCount}
          accentColor={accentColor}
        >
          {/* Ledger table */}
          <div className="w-full overflow-x-auto rounded-md border border-white/[0.06] bg-black/10">
            <table className="w-full text-left font-mono text-[12px]">
              <thead>
                <tr
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: SURFACE.onSurfaceVariant }}
                >
                  <th className="px-3 py-2 font-label font-semibold">
                    {t('columnDate')}
                  </th>
                  <th className="px-3 py-2 font-label font-semibold">
                    {t('columnOpponent')}
                  </th>
                  <th className="px-3 py-2 font-label font-semibold">
                    {t('columnStage')}
                  </th>
                  <th className="px-3 py-2 font-label font-semibold text-right">
                    {t('columnRating')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {appearances.map((appearance: BigGameAppearance) => (
                  <tr
                    key={appearance.matchId}
                    className="border-t border-white/[0.04]"
                  >
                    <td className="px-3 py-2 text-on-surface-variant">
                      {t('ageLabel', { age: appearance.ageAtMatch })}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {appearance.opponentName}
                      {(appearance.goals > 0 || appearance.assists > 0) && (
                        <span
                          className="ml-2 text-[10px]"
                          style={{ color: accentColor }}
                        >
                          {appearance.goals > 0 && `${appearance.goals}G`}
                          {appearance.goals > 0 && appearance.assists > 0 && ' '}
                          {appearance.assists > 0 && `${appearance.assists}A`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={stageBadgeVariant(appearance.stage)} size="sm">
                        {t(stageLabelKey(appearance.stage))}
                      </Badge>
                    </td>
                    <td
                      className="px-3 py-2 text-right font-semibold"
                      style={{
                        color:
                          appearance.performanceRating >= 7.5
                            ? accentColor
                            : appearance.performanceRating < 5.5
                              ? BRAND.secondary
                              : BRAND.tertiary,
                      }}
                    >
                      {appearance.performanceRating.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aggregate stats */}
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md border border-white/[0.06] bg-black/10 p-4">
              <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                {t('statsMeanRating')}
              </dt>
              <dd
                className="font-mono text-2xl font-semibold"
                style={{ color: accentColor }}
              >
                {meanRating.toFixed(1)}
              </dd>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-black/10 p-4">
              <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                {t('statsBestPerformance')}
              </dt>
              <dd className="font-body text-sm text-on-surface">
                {bestPerformance
                  ? t('statsBestLabel', {
                      opponent: bestPerformance.opponentName,
                      rating: bestPerformance.performanceRating.toFixed(1),
                    })
                  : '—'}
              </dd>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-black/10 p-4">
              <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                {t('statsFadeCount')}
              </dt>
              <dd
                className="font-mono text-2xl font-semibold"
                style={{
                  color: fadeCount > 0 ? BRAND.secondary : SURFACE.onSurfaceVariant,
                }}
              >
                {fadeCount}
              </dd>
            </div>
          </dl>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
