import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Paywall from '@/components/monetization/Paywall'
import {
  computeRoleHeatmap,
  PITCH_COLS,
  PITCH_ROWS,
} from '@/lib/intelligence/role-heatmap'
import { BRAND, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'

// ── SVG geometry ──────────────────────────────────────────────
const PITCH_VIEW_W = 720
const PITCH_VIEW_H = 440
const PITCH_PAD_X = 20
const PITCH_PAD_Y = 20
const PITCH_W = PITCH_VIEW_W - PITCH_PAD_X * 2
const PITCH_H = PITCH_VIEW_H - PITCH_PAD_Y * 2
const ZONE_W = PITCH_W / PITCH_COLS
const ZONE_H = PITCH_H / PITCH_ROWS

// Penalty box geometry (rough proportions vs PITCH_W / PITCH_H)
const PEN_BOX_W = PITCH_W * 0.16
const PEN_BOX_H = PITCH_H * 0.6
const GOAL_BOX_W = PITCH_W * 0.06
const GOAL_BOX_H = PITCH_H * 0.3
const CENTER_CIRCLE_R = PITCH_H * 0.16

// Intensity → opacity scaling
const ZONE_MIN_OPACITY = 0.04
const ZONE_MAX_OPACITY = 0.78
const ZONE_INSET = 1.2 // gap between adjacent zones

interface RoleHeatmapProps {
  player: Player
  team: Team
}

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P7-${playerPart}-ROLE-HEATMAP-2026`
}

function primaryZoneTranslationKeys(zone: string): {
  row: 'topWing' | 'bottomWing' | 'centralChannel'
  col:
    | 'ownDefensiveThird'
    | 'deepBuildUp'
    | 'midfieldThird'
    | 'attackingThird'
    | 'finalThirdBoxEdge'
} {
  const match = /^r(\d+)c(\d+)$/.exec(zone)
  if (!match) return { row: 'centralChannel', col: 'midfieldThird' }
  const row = Number(match[1])
  const col = Number(match[2])

  const rowName =
    row <= 1 ? 'topWing' : row >= 4 ? 'bottomWing' : 'centralChannel'
  const colName =
    col <= 1
      ? 'ownDefensiveThird'
      : col <= 3
        ? 'deepBuildUp'
        : col <= 5
          ? 'midfieldThird'
          : col <= 7
            ? 'attackingThird'
            : 'finalThirdBoxEdge'

  return { row: rowName, col: colName }
}

interface PitchLinesProps {
  outlineColor: string
}

function PitchLines({ outlineColor }: PitchLinesProps) {
  const halfwayX = PITCH_PAD_X + PITCH_W / 2
  const centerY = PITCH_PAD_Y + PITCH_H / 2

  return (
    <g
      stroke={outlineColor}
      strokeWidth={1.25}
      fill="none"
      strokeOpacity={0.55}
      pointerEvents="none"
    >
      {/* Outer pitch */}
      <rect
        x={PITCH_PAD_X}
        y={PITCH_PAD_Y}
        width={PITCH_W}
        height={PITCH_H}
        rx={4}
      />
      {/* Halfway line */}
      <line x1={halfwayX} y1={PITCH_PAD_Y} x2={halfwayX} y2={PITCH_PAD_Y + PITCH_H} />
      {/* Center circle + spot */}
      <circle cx={halfwayX} cy={centerY} r={CENTER_CIRCLE_R} />
      <circle cx={halfwayX} cy={centerY} r={2} fill={outlineColor} stroke="none" />

      {/* Left penalty box */}
      <rect
        x={PITCH_PAD_X}
        y={PITCH_PAD_Y + (PITCH_H - PEN_BOX_H) / 2}
        width={PEN_BOX_W}
        height={PEN_BOX_H}
      />
      {/* Left goal box */}
      <rect
        x={PITCH_PAD_X}
        y={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2}
        width={GOAL_BOX_W}
        height={GOAL_BOX_H}
      />
      {/* Left goal mouth */}
      <line
        x1={PITCH_PAD_X - 4}
        y1={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2 + GOAL_BOX_H * 0.25}
        x2={PITCH_PAD_X - 4}
        y2={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2 + GOAL_BOX_H * 0.75}
        strokeWidth={2.5}
      />

      {/* Right penalty box */}
      <rect
        x={PITCH_PAD_X + PITCH_W - PEN_BOX_W}
        y={PITCH_PAD_Y + (PITCH_H - PEN_BOX_H) / 2}
        width={PEN_BOX_W}
        height={PEN_BOX_H}
      />
      {/* Right goal box */}
      <rect
        x={PITCH_PAD_X + PITCH_W - GOAL_BOX_W}
        y={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2}
        width={GOAL_BOX_W}
        height={GOAL_BOX_H}
      />
      {/* Right goal mouth */}
      <line
        x1={PITCH_PAD_X + PITCH_W + 4}
        y1={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2 + GOAL_BOX_H * 0.25}
        x2={PITCH_PAD_X + PITCH_W + 4}
        y2={PITCH_PAD_Y + (PITCH_H - GOAL_BOX_H) / 2 + GOAL_BOX_H * 0.75}
        strokeWidth={2.5}
      />
    </g>
  )
}

interface HeatmapGridProps {
  zoneIntensities: Record<string, number>
  primaryZone: string
  accentColor: string
}

function HeatmapGrid({ zoneIntensities, primaryZone, accentColor }: HeatmapGridProps) {
  const cells: React.ReactNode[] = []
  for (let r = 0; r < PITCH_ROWS; r++) {
    for (let c = 0; c < PITCH_COLS; c++) {
      const key = `r${r}c${c}`
      const intensity = zoneIntensities[key] ?? 0
      if (intensity <= 0.005) continue
      const opacity =
        ZONE_MIN_OPACITY + (ZONE_MAX_OPACITY - ZONE_MIN_OPACITY) * intensity
      const x = PITCH_PAD_X + c * ZONE_W + ZONE_INSET
      const y = PITCH_PAD_Y + r * ZONE_H + ZONE_INSET
      const w = ZONE_W - ZONE_INSET * 2
      const h = ZONE_H - ZONE_INSET * 2
      const isPrimary = key === primaryZone

      cells.push(
        <rect
          key={key}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={3}
          fill={accentColor}
          fillOpacity={opacity}
          stroke={isPrimary ? accentColor : 'none'}
          strokeOpacity={isPrimary ? 0.95 : 0}
          strokeWidth={isPrimary ? 1.5 : 0}
        />,
      )
    }
  }
  return <g pointerEvents="none">{cells}</g>
}

export default async function RoleHeatmap({ player, team }: RoleHeatmapProps) {
  const t = await getTranslations('roleHeatmap')

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const heatmap = computeRoleHeatmap(player, team)
  const primaryRoleTag = heatmap.roleTags[0] ?? player.position
  const zoneKeys = primaryZoneTranslationKeys(heatmap.primaryZone)
  const zoneDescription = t('primaryZones.description', {
    row: t(`primaryZones.rows.${zoneKeys.row}`),
    col: t(`primaryZones.cols.${zoneKeys.col}`),
  })

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={t('scoutVerdict', {
            player: player.name,
            role: primaryRoleTag,
          })}
          signalCount={heatmap.signalCount}
          sourceCount={heatmap.sourceCount}
          lastUpdatedAt={new Date().toISOString()}
          accentColor={accentColor}
        >
          <div className="flex flex-col gap-5">
            {/* Role tag chips */}
            <div className="flex flex-col gap-2">
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                {t('roleTagsLabel')}
              </p>
              <ul className="flex flex-wrap gap-2 list-none p-0">
                {heatmap.roleTags.map((tag) => (
                  <li key={tag}>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full font-label text-[11px] uppercase tracking-widest border"
                      style={{
                        color: accentColor,
                        borderColor: `${accentColor}66`,
                        background: `${accentColor}14`,
                      }}
                    >
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Inline pitch heatmap */}
            <div
              className="relative rounded-xl overflow-hidden border border-white/5"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${SURFACE.surfaceContainerLow}, ${SURFACE.surfaceContainerLowest})`,
              }}
            >
              <svg
                viewBox={`0 0 ${PITCH_VIEW_W} ${PITCH_VIEW_H}`}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={t('pitchAriaLabel', {
                  player: player.name,
                  role: primaryRoleTag,
                  zone: zoneDescription,
                })}
                className="block w-full h-auto"
              >
                <HeatmapGrid
                  zoneIntensities={heatmap.zoneIntensities}
                  primaryZone={heatmap.primaryZone}
                  accentColor={accentColor}
                />
                <PitchLines outlineColor={SURFACE.outline} />
              </svg>
            </div>

            {/* Primary zone caption */}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                {t('primaryZoneLabel')}
              </p>
              <p
                className="font-mono text-xs"
                style={{ color: accentColor }}
              >
                {zoneDescription}
              </p>
            </div>
          </div>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
