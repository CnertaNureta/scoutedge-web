import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import { type PlayerOutlook, getPlayerOutlook } from '@/data/player-outlooks'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import PullQuote from '@/components/ui/PullQuote'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, POSITION_HEX } from '@/lib/brand-tokens'

// ── Heuristic thresholds for position templates ───────────────
const FW_BOX_CRASHER_GOAL_RATIO_MIN = 0.45 // goals per cap
const MID_METRONOME_RATING_MIN = 82
const DEF_AERIAL_AGE_MIN = 27
const GK_SHOTSTOPPER_RATING_MIN = 82

const MAX_HEADLINE_CHARS = 64
const MAX_PARAGRAPH_SENTENCES = 3

export type DifferentiatorTraitKey =
  | 'fw_box_crasher'
  | 'fw_wide_creator'
  | 'mid_metronome'
  | 'mid_press_resistant'
  | 'def_aerial'
  | 'def_sweeper'
  | 'gk_sweeper'
  | 'gk_shotstopper'

export interface DifferentiatorAnchor {
  label: string
  value: number
  suffix?: string
  decimals?: number
}

export interface DifferentiatorComputed {
  traitKey: DifferentiatorTraitKey
  headline: string
  paragraph: string
  anchors: DifferentiatorAnchor[]
  fromOutlook: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function clampHeadline(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_HEADLINE_CHARS) return trimmed
  return trimmed.slice(0, MAX_HEADLINE_CHARS - 1).trimEnd() + '…'
}

/**
 * Split a paragraph on sentence boundaries and return the first N sentences
 * joined back together. Honors typical full-stop / exclamation / question
 * marks but tolerates an existing trailing period.
 */
function firstSentences(text: string, count: number): string {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  // Match sentence "chunks" ending in . ! or ?  followed by space or EOL.
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:["”']?)/g)
  if (!sentences || sentences.length === 0) return cleaned
  return sentences.slice(0, count).join(' ').trim()
}

function pickPositionTrait(player: Player): DifferentiatorTraitKey {
  const denom = Math.max(1, player.caps)
  const goalRatio = player.goals / denom

  if (player.position === 'FWD') {
    return goalRatio >= FW_BOX_CRASHER_GOAL_RATIO_MIN ? 'fw_box_crasher' : 'fw_wide_creator'
  }
  if (player.position === 'MID') {
    return player.rating >= MID_METRONOME_RATING_MIN ? 'mid_metronome' : 'mid_press_resistant'
  }
  if (player.position === 'DEF') {
    return player.age >= DEF_AERIAL_AGE_MIN ? 'def_aerial' : 'def_sweeper'
  }
  // GK
  return player.rating >= GK_SHOTSTOPPER_RATING_MIN ? 'gk_shotstopper' : 'gk_sweeper'
}

/**
 * Pure compute function — exported for unit testing.
 * Resolves the differentiator using the outlook prose where available,
 * otherwise falls back to a position-aware deterministic template.
 */
export function computeDifferentiator(
  player: Player,
  outlook: PlayerOutlook | undefined,
): DifferentiatorComputed {
  const traitKey = pickPositionTrait(player)

  const anchors: DifferentiatorAnchor[] = [
    { label: 'rating', value: player.rating, decimals: 1 },
    { label: positionStatLabel(player.position), value: positionStatValue(player) },
    { label: 'caps', value: player.caps },
  ]

  if (outlook) {
    const paragraph = firstSentences(outlook.outlook, MAX_PARAGRAPH_SENTENCES)
    const headline = clampHeadline(outlook.signatureStat?.label ?? '')
    return {
      traitKey,
      headline,
      paragraph,
      anchors,
      fromOutlook: true,
    }
  }

  return {
    traitKey,
    headline: '',
    paragraph: '',
    anchors,
    fromOutlook: false,
  }
}

function positionStatLabel(position: Player['position']): string {
  if (position === 'FWD') return 'goals'
  if (position === 'MID') return 'assists'
  if (position === 'DEF') return 'caps'
  return 'caps'
}

function positionStatValue(player: Player): number {
  if (player.position === 'FWD') return player.goals
  if (player.position === 'MID') return player.assists
  return player.caps
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P5-${playerPart}-2026`
}

interface DifferentiatorCardProps {
  player: Player
  team: Team
}

export default async function DifferentiatorCard({ player, team }: DifferentiatorCardProps) {
  const t = await getTranslations('differentiator')

  const outlook = getPlayerOutlook(player.slug)
  const computed = computeDifferentiator(player, outlook)
  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)

  const traitLabel = t(`positionTraits.${computed.traitKey}`)
  const headline = computed.fromOutlook && computed.headline
    ? computed.headline
    : traitLabel
  const paragraph = computed.fromOutlook && computed.paragraph
    ? computed.paragraph
    : traitLabel

  // signalCount: rough qualitative anchor — when an outlook is present we
  // count the structured fields (outlook + matchups + signature stat); the
  // fallback derives a single template trait.
  const signalCount = computed.fromOutlook && outlook
    ? 1 + (outlook.keyMatchups?.length ?? 0) + 1
    : 3
  const sourceCount = computed.fromOutlook ? 2 : 1
  const lastUpdatedAt = new Date().toISOString()

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('title')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={t('verdict.studyTape')}
          signalCount={signalCount}
          sourceCount={sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
        <div className="flex flex-col gap-6">
          <PullQuote accentColor={accentColor} source={traitLabel}>
            {headline}
          </PullQuote>

          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">
              {t('whyLabel')}
            </p>
            <p className="text-sm md:text-base text-on-surface leading-relaxed">
              {paragraph}
            </p>
          </div>

          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">
              {t('statsLabel')}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {computed.anchors.map((anchor) => (
                <div
                  key={anchor.label}
                  className="flex flex-col items-center text-center p-3 bg-surface-container-low rounded-lg border border-white/5"
                >
                  <span
                    className="font-headline text-3xl md:text-4xl leading-none"
                    style={{ color: accentColor }}
                  >
                    {anchor.decimals
                      ? anchor.value.toFixed(anchor.decimals)
                      : anchor.value}
                    {anchor.suffix ?? ''}
                  </span>
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1.5">
                    {anchor.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
