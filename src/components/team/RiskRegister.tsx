import type { Team, Player, PlayerIntelRecord } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import PositionBadge from '@/components/ui/PositionBadge'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import { getTeamColors } from '@/lib/team-colors'
import { BRAND } from '@/lib/brand-tokens'
import { getPlayerIntelBySlug } from '@/lib/player-intel-service'
import { getISOWeek } from './ScoutEdgeScore'

const TOP_N_RISKS = 5
const HIGH_SCORE = 10
const MEDIUM_SCORE = 6

export type RiskType = 'fitness' | 'selection' | 'tactical'
export type RiskSeverity = 'high' | 'medium'

export interface Risk {
  player: Player
  type: RiskType
  severity: RiskSeverity
  note: string
  score: number
}

export interface RiskRegisterResult {
  topRisks: Risk[]
  totalRiskCount: number
  highCount: number
  distinctTypeCount: number
  lastUpdatedAt: string
}

type IntelLookup = (player: Player) => PlayerIntelRecord | undefined

/**
 * Pure compute fn — collect risk rows from each player's intel record, sort
 * by score, return the top 5 plus aggregate counters. Extracted so it can be
 * unit-tested without next-intl.
 */
export function computeSquadRisks(
  players: ReadonlyArray<Player>,
  intelLookup: IntelLookup,
): RiskRegisterResult {
  const risks: Risk[] = []
  let latestUpdate = ''

  for (const player of players) {
    const intel = intelLookup(player)
    if (!intel) continue

    if (intel.last_updated && intel.last_updated > latestUpdate) {
      latestUpdate = intel.last_updated
    }

    if (intel.fitness_status === 'red') {
      risks.push({
        player,
        type: 'fitness',
        severity: 'high',
        note: intel.fitness_note,
        score: HIGH_SCORE,
      })
    } else if (intel.fitness_status === 'amber') {
      risks.push({
        player,
        type: 'fitness',
        severity: 'medium',
        note: intel.fitness_note,
        score: MEDIUM_SCORE,
      })
    }

    if (intel.selection_risk === 'high') {
      risks.push({
        player,
        type: 'selection',
        severity: 'high',
        note: intel.selection_note,
        score: HIGH_SCORE,
      })
    } else if (intel.selection_risk === 'medium') {
      risks.push({
        player,
        type: 'selection',
        severity: 'medium',
        note: intel.selection_note,
        score: MEDIUM_SCORE,
      })
    }

    if (intel.tactical_risk === 'high') {
      risks.push({
        player,
        type: 'tactical',
        severity: 'high',
        note: intel.tactical_note,
        score: HIGH_SCORE,
      })
    } else if (intel.tactical_risk === 'medium') {
      risks.push({
        player,
        type: 'tactical',
        severity: 'medium',
        note: intel.tactical_note,
        score: MEDIUM_SCORE,
      })
    }
  }

  const sorted = [...risks].sort((a, b) => b.score - a.score)
  const topRisks = sorted.slice(0, TOP_N_RISKS)
  const highCount = risks.filter((r) => r.severity === 'high').length
  const distinctTypes = new Set(risks.map((r) => r.type))

  return {
    topRisks,
    totalRiskCount: risks.length,
    highCount,
    distinctTypeCount: distinctTypes.size,
    lastUpdatedAt: latestUpdate,
  }
}

type VerdictTier = 'controlled' | 'manageable' | 'fragile'

function pickVerdictTier(highCount: number): VerdictTier {
  if (highCount === 0) return 'controlled'
  if (highCount <= 2) return 'manageable'
  return 'fragile'
}

interface RiskRegisterProps {
  team: Team
  players: Player[]
}

export default async function RiskRegister({ team, players }: RiskRegisterProps) {
  const t = await getTranslations('riskRegister')
  const colors = getTeamColors(team.slug)

  const result = computeSquadRisks(players, (player) =>
    getPlayerIntelBySlug(player.teamSlug, player.slug),
  )

  const tier = pickVerdictTier(result.highCount)
  const accentColor = tier === 'fragile' ? BRAND.secondary : colors.primary

  const now = new Date()
  const isoWeek = getISOWeek(now)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T5-W${isoWeek}-2026`

  const lastUpdatedAt = result.lastUpdatedAt || now.toISOString()

  const riskTypeLabel: Record<RiskType, string> = {
    fitness: t('riskTypes.fitness'),
    selection: t('riskTypes.selection'),
    tactical: t('riskTypes.tactical'),
  }

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('title')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={t(`verdict.${tier}`)}
        signalCount={result.totalRiskCount}
        sourceCount={result.distinctTypeCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={accentColor}
      >
        <ol className="space-y-3">
          {Array.from({ length: TOP_N_RISKS }).map((_, idx) => {
            const risk = result.topRisks[idx]
            if (!risk) {
              return <EmptyRow key={`empty-${idx}`} index={idx + 1} label={t('noFurtherRisks')} />
            }
            return (
              <RiskRow
                key={`${risk.player.slug}-${risk.type}`}
                index={idx + 1}
                risk={risk}
                teamSlug={team.slug}
                typeLabel={riskTypeLabel[risk.type]}
                severityLabel={t(`severity.${risk.severity}`)}
              />
            )
          })}
        </ol>
      </IntelligenceModule>
    </section>
  )
}

interface RiskRowProps {
  index: number
  risk: Risk
  teamSlug: string
  typeLabel: string
  severityLabel: string
}

function RiskRow({ index, risk, teamSlug, typeLabel, severityLabel }: RiskRowProps) {
  const badgeVariant = risk.severity === 'high' ? 'secondary' : 'tertiary'

  return (
    <li className="flex items-start gap-4 py-3 border-b border-white/[0.05] last:border-b-0">
      <span className="font-mono text-[10px] tracking-widest text-on-surface-variant pt-1 w-6 shrink-0">
        {String(index).padStart(2, '0')}
      </span>
      <PositionBadge position={risk.player.position} variant="border" className="self-stretch" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <Link
            href={`/teams/${teamSlug}/players/${risk.player.slug}`}
            className="font-headline text-base tracking-wide text-on-surface hover:text-primary transition-colors uppercase"
          >
            {risk.player.name}
          </Link>
          {risk.type === 'fitness' && <FitnessIndicator status={risk.player.fitnessStatus} />}
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            {typeLabel}
          </span>
          <Badge variant={badgeVariant}>{severityLabel}</Badge>
        </div>
        {risk.note && (
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">{risk.note}</p>
        )}
      </div>
    </li>
  )
}

interface EmptyRowProps {
  index: number
  label: string
}

function EmptyRow({ index, label }: EmptyRowProps) {
  return (
    <li className="flex items-center gap-4 py-3 border-b border-white/[0.05] last:border-b-0 opacity-40">
      <span className="font-mono text-[10px] tracking-widest text-on-surface-variant w-6 shrink-0">
        {String(index).padStart(2, '0')}
      </span>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
    </li>
  )
}
