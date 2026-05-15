import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, COLOR } from '@/lib/brand-tokens'
import {
  computePressureIndex,
  type PressureFactor,
  type PressureIndexBreakdown,
  type PressureTier,
} from '@/lib/intelligence/pressure-index'

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3).padEnd(3, 'X')
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-PRESSURE-INDEX-${playerPart}-2026`
}

function tierColor(tier: PressureTier): string {
  if (tier === 'ice') return BRAND.primary
  if (tier === 'cool') return BRAND.primaryFixed
  if (tier === 'warm') return COLOR.yellow
  return COLOR.red
}

function tierBadgeVariant(
  tier: PressureTier,
): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  if (tier === 'ice') return 'primary'
  if (tier === 'cool') return 'tertiary'
  if (tier === 'warm') return 'secondary'
  return 'outline'
}

interface FactorRowProps {
  factor: PressureFactor
  label: string
  accentColor: string
}

function FactorRow({ factor, label, accentColor }: FactorRowProps) {
  const weightPct = Math.round(factor.weight * 100)
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
          {label}
          <span className="ml-2 text-on-surface-variant/60 font-mono normal-case tracking-normal">
            ×{weightPct}%
          </span>
        </span>
        <span
          className="font-mono text-base font-bold"
          style={{ color: accentColor }}
        >
          {factor.contribution}
        </span>
      </div>
      <ChemistryBar value={factor.contribution} showValue={false} size="sm" />
    </div>
  )
}

interface PressureIndexProps {
  player: Player
  team: Team
}

export default async function PressureIndex({
  player,
  team,
}: PressureIndexProps) {
  const t = await getTranslations('pressureIndex')
  const breakdown: PressureIndexBreakdown = computePressureIndex(player, team)
  const accentColor = tierColor(breakdown.tier)
  const dossierId = buildDossierId(team.slug, player.slug)
  const tierLabel = t(
    breakdown.tier === 'ice'
      ? 'tierIce'
      : breakdown.tier === 'cool'
        ? 'tierCool'
        : breakdown.tier === 'warm'
          ? 'tierWarm'
          : 'tierShaky',
  )
  const scoutVerdict = t('scoutVerdict', {
    player: player.name,
    tier: tierLabel.toLowerCase(),
  })
  const lastUpdatedAt = new Date().toISOString()

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
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
          <div className="flex flex-col items-center text-center mb-8">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
              {t('scoreLabel')}
            </p>
            <AnimatedNumber
              value={breakdown.score}
              className="font-headline text-7xl md:text-[88px] leading-none"
              style={{ color: accentColor }}
            />
            <div className="mt-3">
              <Badge variant={tierBadgeVariant(breakdown.tier)} size="md">
                {tierLabel}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {breakdown.factors.map((factor) => (
              <FactorRow
                key={factor.key}
                factor={factor}
                label={t(`factors.${factor.label}`)}
                accentColor={accentColor}
              />
            ))}
          </div>

          <p className="mt-6 font-label text-[10px] text-on-surface-variant/60 italic">
            {t('modelStubFootnote')}
          </p>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
