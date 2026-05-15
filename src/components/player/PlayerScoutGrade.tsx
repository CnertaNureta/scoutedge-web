import { getTranslations } from 'next-intl/server'
import type { Player, PlayerIntelRecord, PlayerSignal, Team } from '@/lib/types'
import type { PlayerScoutGrade as PlayerScoutGradeType, ScoreBreakdown } from '@/lib/intelligence-types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, POSITION_HEX } from '@/lib/brand-tokens'
import { ratingToHundredScale } from '@/lib/intelligence/rating-scale'

// ── Weights for the weighted-average total ────────────────────
const WEIGHTS = {
  skill: 0.30,
  form: 0.20,
  fit: 0.15,
  durability: 0.15,
  bigGame: 0.20,
} as const

// ── Fit score lookup by fitness_status ────────────────────────
const FIT_BY_STATUS: Record<NonNullable<Player['fitnessStatus']>, number> = {
  green: 92,
  amber: 68,
  red: 35,
}
const FIT_DEFAULT = 80

// ── Tier thresholds ───────────────────────────────────────────
const TIER_ELITE_MIN = 85
const TIER_STRONG_MIN = 70
const TIER_VIABLE_MIN = 55

export type PlayerScoutGradeTier = 'elite' | 'strong' | 'viable' | 'limited'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundClamp(value: number): number {
  return clamp(Math.round(value), 0, 99)
}

function computeSkill(player: Player): number {
  return roundClamp((ratingToHundredScale(player.rating) - 50) * 2)
}

function computeForm(player: Player, playerIntel?: PlayerIntelRecord): number {
  const morale =
    playerIntel?.morale_score ??
    (typeof player.sentimentScore === 'number' ? player.sentimentScore : undefined)
  if (typeof morale === 'number' && Number.isFinite(morale)) {
    return roundClamp(morale)
  }
  return roundClamp(ratingToHundredScale(player.rating) - 10)
}

function computeFit(player: Player, playerIntel?: PlayerIntelRecord): number {
  const status = playerIntel?.fitness_status ?? player.fitnessStatus
  if (status && FIT_BY_STATUS[status] !== undefined) {
    return roundClamp(FIT_BY_STATUS[status])
  }
  return roundClamp(FIT_DEFAULT)
}

function computeDurability(player: Player): number {
  return roundClamp(player.caps * 1.5 + Math.max(0, 30 - player.age) * 2)
}

function computeBigGame(player: Player): number {
  const denom = Math.max(1, player.caps)
  return roundClamp((player.goals / denom) * 200 + 40)
}

export function getTier(total: number): PlayerScoutGradeTier {
  if (total >= TIER_ELITE_MIN) return 'elite'
  if (total >= TIER_STRONG_MIN) return 'strong'
  if (total >= TIER_VIABLE_MIN) return 'viable'
  return 'limited'
}

/**
 * Pure compute function — exported for unit testing.
 * Aggregates a Player + optional PlayerIntelRecord into a 0-99
 * scout grade with five sub-dimensions.
 */
export function computePlayerScoutGrade(
  player: Player,
  playerIntel?: PlayerIntelRecord,
): PlayerScoutGradeType {
  const skill = computeSkill(player)
  const form = computeForm(player, playerIntel)
  const fit = computeFit(player, playerIntel)
  const durability = computeDurability(player)
  const bigGame = computeBigGame(player)

  const totalRaw =
    skill * WEIGHTS.skill +
    form * WEIGHTS.form +
    fit * WEIGHTS.fit +
    durability * WEIGHTS.durability +
    bigGame * WEIGHTS.bigGame
  const total = roundClamp(totalRaw)

  const breakdown: ScoreBreakdown[] = [
    { label: 'skill', value: skill },
    { label: 'form', value: form },
    { label: 'fit', value: fit },
    { label: 'durability', value: durability },
    { label: 'bigGame', value: bigGame },
  ]

  return {
    total,
    verdict: getTier(total),
    breakdown,
    dossierId: '',
    signalCount: playerIntel?.signal_count ?? 0,
    sourceCount: countSourceTypes(playerIntel?.recent_signals),
    lastUpdatedAt: playerIntel?.last_updated ?? new Date().toISOString(),
  }
}

function countSourceTypes(signals: PlayerSignal[] | undefined): number {
  if (!signals || signals.length === 0) return 0
  const sourceTypes = new Set<string>()
  for (const s of signals) {
    if (s.sourceType) sourceTypes.add(s.sourceType)
  }
  return sourceTypes.size
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P1-${playerPart}-2026`
}

function tierBadgeVariant(tier: PlayerScoutGradeTier): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  switch (tier) {
    case 'elite':
      return 'primary'
    case 'strong':
      return 'tertiary'
    case 'viable':
      return 'secondary'
    case 'limited':
    default:
      return 'outline'
  }
}

interface PlayerScoutGradeProps {
  player: Player
  team: Team
  playerIntel?: PlayerIntelRecord
}

export default async function PlayerScoutGrade({
  player,
  team,
  playerIntel,
}: PlayerScoutGradeProps) {
  const t = await getTranslations('playerScoutGrade')

  const grade = computePlayerScoutGrade(player, playerIntel)
  const tier = grade.verdict as PlayerScoutGradeTier
  const verdictText = t(`verdict.${tier}`)
  const tierLabel = t(`tier.${tier}`)
  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary

  const dossierId = buildDossierId(team.slug, player.slug)
  const signalCount = playerIntel?.signal_count ?? player.intelSignalCount ?? 12
  const computedSourceCount = countSourceTypes(playerIntel?.recent_signals ?? player.recentSignals)
  const sourceCount = computedSourceCount > 0 ? computedSourceCount : 3
  const lastUpdatedAt =
    playerIntel?.last_updated ?? player.intelLastUpdated ?? new Date().toISOString()

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('title')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={verdictText}
          signalCount={signalCount}
          sourceCount={sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
          <div className="flex flex-col items-center text-center mb-8">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
              {t('totalLabel')}
            </p>
            <AnimatedNumber
              value={grade.total}
              className="font-headline text-7xl md:text-[88px] leading-none"
              style={{ color: accentColor }}
            />
            <div className="mt-3">
              <Badge variant={tierBadgeVariant(tier)} size="md">
                {tierLabel}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {grade.breakdown.map((dim) => (
              <div key={dim.label} className="flex flex-col">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
                    {t(`dimensions.${dim.label}`)}
                  </span>
                  <span
                    className="font-mono text-base font-bold"
                    style={{ color: accentColor }}
                  >
                    {dim.value}
                  </span>
                </div>
                <ChemistryBar value={dim.value} showValue={false} size="sm" />
              </div>
            ))}
          </div>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
