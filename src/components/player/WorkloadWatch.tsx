import { getTranslations } from 'next-intl/server'
import type { Player, Team } from '@/lib/types'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import Paywall from '@/components/monetization/Paywall'
import { BRAND, COLOR, POSITION_HEX, SURFACE } from '@/lib/brand-tokens'
import {
  computeWorkload,
  type WorkloadBreakdown,
  type WorkloadMonth,
  type WorkloadStatus,
} from '@/lib/intelligence/workload'

// ── Sparkline geometry ────────────────────────────────────────
const SPARK_WIDTH = 320
const SPARK_HEIGHT = 64
const SPARK_PAD_X = 4
const SPARK_PAD_Y = 6

const AMBER_ZONE_THRESHOLD_MINUTES = 4000

function buildDossierId(teamSlug: string, playerSlug: string): string {
  const teamPart = teamSlug.toUpperCase().slice(0, 3)
  const playerPart = playerSlug
    .toUpperCase()
    .slice(0, 8)
    .replace(/[^A-Z0-9]/g, '')
  return `SCT-${teamPart}-P9-${playerPart}-WORKLOAD-2026`
}

function statusColor(status: WorkloadStatus): string {
  if (status === 'red') return COLOR.red
  if (status === 'amber') return COLOR.yellow
  if (status === 'managed') return COLOR.lime
  return BRAND.primary
}

interface SparklineProps {
  months: WorkloadMonth[]
  accentColor: string
  ariaLabel: string
}

function MinutesSparkline({ months, accentColor, ariaLabel }: SparklineProps) {
  const values = months.map((m) => m.minutes)
  const max = Math.max(1, ...values)
  const stepX =
    (SPARK_WIDTH - SPARK_PAD_X * 2) / Math.max(1, months.length - 1)
  const usableH = SPARK_HEIGHT - SPARK_PAD_Y * 2
  const baseY = SPARK_HEIGHT - SPARK_PAD_Y

  const points = months.map((m, i) => {
    const x = SPARK_PAD_X + stepX * i
    const y = SPARK_PAD_Y + usableH * (1 - m.minutes / max)
    return { x, y, m }
  })
  const linePoints = points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')
  const areaPath = `M ${points[0].x.toFixed(2)},${baseY.toFixed(2)} L ${points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' L ')} L ${points[points.length - 1].x.toFixed(2)},${baseY.toFixed(2)} Z`

  return (
    <svg
      width="100%"
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id="workload-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#workload-area)" />
      <polyline
        fill="none"
        stroke={accentColor}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={linePoints}
      />
      {points.map((p, idx) => (
        <circle
          key={p.m.monthOffset}
          cx={p.x}
          cy={p.y}
          r={idx === points.length - 1 ? 2.6 : 1.4}
          fill={accentColor}
        />
      ))}
    </svg>
  )
}

interface StatPillProps {
  label: string
  value: string | number
  accentColor?: string
}

function StatPill({ label, value, accentColor }: StatPillProps) {
  return (
    <div className="flex flex-col gap-1 py-3 px-4 rounded-lg bg-surface-container-low border border-white/5">
      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      <span
        className="font-mono text-xl font-bold"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

interface WorkloadWatchProps {
  player: Player
  team: Team
}

export default async function WorkloadWatch({
  player,
  team,
}: WorkloadWatchProps) {
  const t = await getTranslations('workload')
  const workload: WorkloadBreakdown = computeWorkload(player)

  const accentColor = statusColor(workload.status)
  const positionAccent = POSITION_HEX[player.position] ?? BRAND.primary
  const dossierId = buildDossierId(team.slug, player.slug)
  const lastUpdatedAt = new Date().toISOString()

  const statusLabel = t(
    workload.status === 'fresh'
      ? 'statusFresh'
      : workload.status === 'managed'
        ? 'statusManaged'
        : workload.status === 'amber'
          ? 'statusAmber'
          : 'statusRed',
  )

  const scoutVerdict = t('scoutVerdict', {
    player: player.name,
    status: statusLabel.toLowerCase(),
  })

  const ariaLabel = t('ariaLabelTemplate', {
    player: player.name,
    minutes: workload.totalMinutes,
    games: workload.totalGames,
  })

  const showAmberBadge =
    workload.status === 'amber' ||
    workload.status === 'red' ||
    workload.totalMinutes >= AMBER_ZONE_THRESHOLD_MINUTES

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <Paywall contentType="player_intel" scope={player.slug} previewLines={6}>
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          scoutVerdict={scoutVerdict}
          signalCount={workload.signalCount}
          sourceCount={workload.sourceCount}
          lastUpdatedAt={lastUpdatedAt}
          accentColor={accentColor}
        >
          <div className="flex flex-col gap-5">
            {/* Sparkline */}
            <div
              className="rounded-xl border p-4"
              style={{
                background: `${SURFACE.surfaceContainerLow}`,
                borderColor: `${SURFACE.outlineVariant}66`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {t('sparklineLabel')}
                </p>
                <p
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: positionAccent }}
                >
                  {player.position}
                </p>
              </div>
              <MinutesSparkline
                months={workload.months}
                accentColor={accentColor}
                ariaLabel={ariaLabel}
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatPill
                label={t('totalMinutesLabel')}
                value={workload.totalMinutes.toLocaleString()}
                accentColor={accentColor}
              />
              <StatPill
                label={t('totalGamesLabel')}
                value={workload.totalGames}
              />
              <StatPill
                label={t('nationalTeamWindowsLabel')}
                value={workload.nationalTeamWindows}
              />
              <StatPill
                label={t('statusLabel')}
                value={statusLabel}
                accentColor={accentColor}
              />
            </div>

            {/* Amber-zone + injury chips */}
            {(showAmberBadge || workload.injuryFlag.active) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {showAmberBadge && (
                  <Badge
                    variant={workload.status === 'red' ? 'secondary' : 'tertiary'}
                    size="sm"
                  >
                    {t('amberZoneBadge', {
                      minutes: workload.totalMinutes.toLocaleString(),
                    })}
                  </Badge>
                )}
                {workload.injuryFlag.active && (
                  <Badge variant="secondary" size="sm">
                    {t('injuryFlagLabel')}
                    {workload.injuryFlag.note
                      ? ` · ${workload.injuryFlag.note}`
                      : ''}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </IntelligenceModule>
      </Paywall>
    </section>
  )
}
