import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Paywall from '@/components/monetization/Paywall'
import Badge from '@/components/ui/Badge'
import { BRAND, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'
import {
  computeCareerArc,
  type CareerComparable,
  type CareerPhase,
  type CareerPoint,
} from '@/lib/intelligence/career-arc'

// ── Chart geometry (viewBox units) ───────────────────────────
const CHART_W = 640
const CHART_H = 240
const PAD_X = 32
const PAD_Y = 24
const RATING_MIN = 50
const RATING_MAX = 99

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P10-${playerPart}-CAREER-ARC-2026`
}

function phaseBadgeVariant(
  phase: CareerPhase,
): 'primary' | 'tertiary' | 'secondary' | 'outline' {
  switch (phase) {
    case 'peaking':
      return 'primary'
    case 'ascending':
      return 'tertiary'
    case 'transitioning':
      return 'secondary'
    case 'declining':
    default:
      return 'outline'
  }
}

interface ChartBounds {
  minAge: number
  maxAge: number
}

function getChartBounds(
  trajectory: CareerPoint[],
  comparables: CareerComparable[],
): ChartBounds {
  let minAge = trajectory[0]?.age ?? 16
  let maxAge = trajectory[trajectory.length - 1]?.age ?? 40
  for (const c of comparables) {
    if (c.trajectory.length === 0) continue
    const first = c.trajectory[0].age
    const last = c.trajectory[c.trajectory.length - 1].age
    if (first < minAge) minAge = first
    if (last > maxAge) maxAge = last
  }
  return { minAge, maxAge }
}

function projectPoint(
  point: CareerPoint,
  bounds: ChartBounds,
): { x: number; y: number } {
  const ageSpan = Math.max(1, bounds.maxAge - bounds.minAge)
  const ratingSpan = RATING_MAX - RATING_MIN
  const x = PAD_X + ((point.age - bounds.minAge) / ageSpan) * (CHART_W - PAD_X * 2)
  const y =
    CHART_H -
    PAD_Y -
    ((point.rating - RATING_MIN) / ratingSpan) * (CHART_H - PAD_Y * 2)
  return { x, y }
}

function buildPath(points: CareerPoint[], bounds: ChartBounds): string {
  if (points.length === 0) return ''
  const segments: string[] = []
  points.forEach((point, idx) => {
    const { x, y } = projectPoint(point, bounds)
    segments.push(`${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  })
  return segments.join(' ')
}

interface CareerArcProps {
  player: Player
  team: Team
}

export default async function CareerArc({ player, team }: CareerArcProps) {
  const t = await getTranslations('careerArc')

  const breakdown = computeCareerArc(player)
  const { phase, trajectory, comparables, signalCount, sourceCount } = breakdown

  const accentColor = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const phaseLabel = t(`phase${capitalize(phase)}`)
  const topComparable = comparables[0]
  const verdictText = t('scoutVerdict', {
    player: player.name,
    phase: phaseLabel,
    topComparable: topComparable ? topComparable.name : '—',
  })
  const ariaLabel = t('ariaLabelTemplate', {
    player: player.name,
    phase: phaseLabel,
  })

  const bounds = getChartBounds(trajectory, comparables)
  const mainPath = buildPath(trajectory, bounds)

  // Project current-age marker for the player.
  const currentPoint = trajectory.find((p) => p.age === player.age)
  const currentProjected = currentPoint
    ? projectPoint(currentPoint, bounds)
    : null

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
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Badge variant={phaseBadgeVariant(phase)} size="md">
              {phaseLabel}
            </Badge>
            <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
              {t('comparableLabel')}: {comparables.length}
            </span>
          </div>

          <div className="w-full overflow-hidden rounded-md border border-white/[0.06] bg-black/10 p-2">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              role="img"
              aria-label={ariaLabel}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-auto"
            >
              {/* Horizontal gridlines at 60/75/90 */}
              {[60, 75, 90].map((tick) => {
                const y =
                  CHART_H -
                  PAD_Y -
                  ((tick - RATING_MIN) / (RATING_MAX - RATING_MIN)) *
                    (CHART_H - PAD_Y * 2)
                return (
                  <g key={`grid-${tick}`}>
                    <line
                      x1={PAD_X}
                      x2={CHART_W - PAD_X}
                      y1={y}
                      y2={y}
                      stroke={`${SURFACE.outlineVariant}55`}
                      strokeDasharray="2 4"
                    />
                    <text
                      x={4}
                      y={y + 3}
                      fontSize="9"
                      fontFamily="monospace"
                      fill={SURFACE.onSurfaceVariant}
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}

              {/* Comparable (ghost) lines */}
              {comparables.map((c) => (
                <path
                  key={`cmp-${c.name}`}
                  d={buildPath(c.trajectory, bounds)}
                  fill="none"
                  stroke={SURFACE.onSurfaceVariant}
                  strokeOpacity="0.45"
                  strokeWidth="1.4"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Main player line */}
              <path
                d={mainPath}
                fill="none"
                stroke={accentColor}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Current-age marker */}
              {currentProjected && (
                <g>
                  <circle
                    cx={currentProjected.x}
                    cy={currentProjected.y}
                    r="5"
                    fill={accentColor}
                  />
                  <circle
                    cx={currentProjected.x}
                    cy={currentProjected.y}
                    r="9"
                    fill="none"
                    stroke={accentColor}
                    strokeOpacity="0.4"
                  />
                </g>
              )}

              {/* X-axis age labels at start/current/end */}
              {[bounds.minAge, player.age, bounds.maxAge].map((age, i) => {
                const xSpan = Math.max(1, bounds.maxAge - bounds.minAge)
                const x =
                  PAD_X +
                  ((age - bounds.minAge) / xSpan) * (CHART_W - PAD_X * 2)
                return (
                  <text
                    key={`age-${age}-${i}`}
                    x={x}
                    y={CHART_H - 6}
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fill={SURFACE.onSurfaceVariant}
                  >
                    {age}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Legend */}
          <ul className="mt-5 flex flex-col gap-2 list-none p-0">
            <li className="flex items-baseline gap-3">
              <span
                className="inline-block w-6 h-[2px] shrink-0"
                style={{ background: accentColor }}
                aria-hidden="true"
              />
              <span className="font-label text-[11px] uppercase tracking-widest">
                {player.name}
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant ml-auto">
                {t('traitLabel')}: {phaseLabel}
              </span>
            </li>
            {comparables.map((c) => (
              <li key={`legend-${c.name}`} className="flex items-baseline gap-3">
                <span
                  className="inline-block w-6 h-[2px] shrink-0"
                  style={{
                    background: SURFACE.onSurfaceVariant,
                    opacity: 0.6,
                  }}
                  aria-hidden="true"
                />
                <span className="font-label text-[11px] uppercase tracking-widest">
                  {c.name}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant ml-auto truncate">
                  {c.trait}
                </span>
              </li>
            ))}
          </ul>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
