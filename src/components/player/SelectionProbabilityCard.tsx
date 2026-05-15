import { getTranslations } from 'next-intl/server'
import type { Player, PlayerIntelRecord, PlayerSignal, Team } from '@/lib/types'
import type { ResolvedPlayerStatus } from '@/lib/player-status'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Paywall from '@/components/monetization/Paywall'
import { resolvePlayerStatus } from '@/lib/player-status'
import { BRAND, POSITION_HEX } from '@/lib/brand-tokens'

// ── Base probabilities by selection_risk ──────────────────────
const BASE_SQUAD_BY_RISK: Record<NonNullable<PlayerIntelRecord['selection_risk']>, number> = {
  low: 96,
  medium: 78,
  high: 52,
}
const BASE_SQUAD_DEFAULT = 88

const BASE_START_BY_RISK: Record<NonNullable<PlayerIntelRecord['selection_risk']>, number> = {
  low: 72,
  medium: 45,
  high: 18,
}
const BASE_START_DEFAULT = 58

// ── Fitness modifiers ─────────────────────────────────────────
const FITNESS_MODIFIER: Record<NonNullable<Player['fitnessStatus']>, { squad: number; start: number }> = {
  green: { squad: 0, start: 0 },
  amber: { squad: -10, start: -15 },
  red: { squad: -25, start: -35 },
}

// ── Verdict thresholds (by start probability) ─────────────────
const VERDICT_LOCK_MIN = 80
const VERDICT_LIKELY_MIN = 50
const VERDICT_CONTESTED_MIN = 20

export type SelectionVerdictKey = 'lock' | 'likely' | 'contested' | 'bench'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getStartVerdict(startPct: number): SelectionVerdictKey {
  if (startPct >= VERDICT_LOCK_MIN) return 'lock'
  if (startPct >= VERDICT_LIKELY_MIN) return 'likely'
  if (startPct >= VERDICT_CONTESTED_MIN) return 'contested'
  return 'bench'
}

export interface SelectionProbabilityResult {
  startPct: number
  squadPct: number
  verdictKey: SelectionVerdictKey
}

/**
 * Pure compute function — exported for unit testing.
 * Translates selection_risk + fitness + resolved playing status into
 * explicit opener-start and squad-inclusion percentages.
 */
export function computeSelectionProbability(
  player: Player,
  playerIntel: PlayerIntelRecord | undefined,
  resolvedStatus: ResolvedPlayerStatus,
): SelectionProbabilityResult {
  const risk = playerIntel?.selection_risk ?? player.selectionRisk
  let squad = risk ? BASE_SQUAD_BY_RISK[risk] : BASE_SQUAD_DEFAULT
  let start = risk ? BASE_START_BY_RISK[risk] : BASE_START_DEFAULT

  const fitness = playerIntel?.fitness_status ?? player.fitnessStatus
  if (fitness && FITNESS_MODIFIER[fitness]) {
    squad += FITNESS_MODIFIER[fitness].squad
    start += FITNESS_MODIFIER[fitness].start
  }

  // Status overlay: ruled-out / retired → zeroed. Doubtful → -50 penalty
  // (treat as suspended-equivalent risk: technically eligible but heavily
  // discounted by the editorial / fitness signal that triggered it).
  if (resolvedStatus.status === 'ruled-out' || resolvedStatus.status === 'retired') {
    squad = 0
    start = 0
  } else if (resolvedStatus.status === 'doubtful') {
    squad -= 50
    start -= 50
  }

  const squadPct = clamp(Math.round(squad), 0, 99)
  const startPct = clamp(Math.round(start), 0, 99)

  return {
    startPct,
    squadPct,
    verdictKey: getStartVerdict(startPct),
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
  return `SCT-${teamPart}-P2-${playerPart}-2026`
}

interface ProbabilityRowProps {
  label: string
  value: number
  accentColor: string
}

function ProbabilityRow({ label, value, accentColor }: ProbabilityRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <span className="font-mono text-2xl font-bold" style={{ color: accentColor }}>
          <AnimatedNumber value={value} />
          <span className="text-base ml-0.5">%</span>
        </span>
      </div>
      <ChemistryBar value={value} showValue={false} size="md" />
    </div>
  )
}

interface SelectionProbabilityCardProps {
  player: Player
  team: Team
  playerIntel?: PlayerIntelRecord
}

export default async function SelectionProbabilityCard({
  player,
  team,
  playerIntel,
}: SelectionProbabilityCardProps) {
  const t = await getTranslations('selectionProbability')

  const resolvedStatus = resolvePlayerStatus(player)
  const { startPct, squadPct, verdictKey } = computeSelectionProbability(
    player,
    playerIntel,
    resolvedStatus,
  )

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const verdictText = t(`verdict.${verdictKey}`)

  const signalCount = playerIntel?.signal_count ?? 8
  const computedSourceCount = countSourceTypes(playerIntel?.recent_signals ?? player.recentSignals)
  const sourceCount = computedSourceCount > 0 ? computedSourceCount : 3
  const lastUpdatedAt = playerIntel?.last_updated ?? new Date().toISOString()

  const noteText = playerIntel?.selection_note?.trim() || t('defaultNote')

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
          <div className="flex flex-col gap-6">
            <ProbabilityRow
              label={t('openerStartLabel')}
              value={startPct}
              accentColor={accentColor}
            />
            <ProbabilityRow
              label={t('squadInclusionLabel')}
              value={squadPct}
              accentColor={accentColor}
            />
          </div>

          <p className="mt-6 text-sm text-on-surface-variant leading-relaxed border-t border-white/[0.06] pt-4">
            {noteText}
          </p>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
