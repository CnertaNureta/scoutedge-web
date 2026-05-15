import { getTranslations } from 'next-intl/server'
import { BRAND } from '@/lib/brand-tokens'
import { buildFormCurve, type FormCurveEntity, type FormCurveSeries } from '@/lib/intelligence/form-curve'

interface FormCurveProps {
  entity: FormCurveEntity
  slug: string
  monthsLookback?: number
  teamGlow?: string
}

interface PathGeometry {
  linePath: string
  areaPath: string
  baselineY: number
  lastX: number
  lastY: number
}

const VIEWBOX_WIDTH = 120
const VIEWBOX_HEIGHT = 40
const PADDING_X = 4
const PADDING_Y = 6
const TREND_VISIBLE_DELTA = 0.05

function buildGeometry(series: FormCurveSeries): PathGeometry {
  const { points, mean } = series
  const innerWidth = VIEWBOX_WIDTH - PADDING_X * 2
  const innerHeight = VIEWBOX_HEIGHT - PADDING_Y * 2

  const xFor = (idx: number): number => {
    if (points.length <= 1) return PADDING_X + innerWidth / 2
    return PADDING_X + (innerWidth * idx) / (points.length - 1)
  }
  const yFor = (value: number): number => PADDING_Y + innerHeight * (1 - value)

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }))

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ')

  const first = coords[0]
  const last = coords[coords.length - 1]
  const areaPath = `${linePath} L${last.x.toFixed(2)},${(VIEWBOX_HEIGHT - PADDING_Y).toFixed(2)} L${first.x.toFixed(2)},${(VIEWBOX_HEIGHT - PADDING_Y).toFixed(2)} Z`

  return {
    linePath,
    areaPath,
    baselineY: yFor(mean),
    lastX: last.x,
    lastY: last.y,
  }
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '−'
  return `${sign}${Math.abs(delta).toFixed(2)}`
}

export default async function FormCurve({
  entity,
  slug,
  monthsLookback = 6,
  teamGlow,
}: FormCurveProps) {
  const t = await getTranslations('formCurve')
  const series = buildFormCurve(entity, slug, monthsLookback)
  const geom = buildGeometry(series)

  const stroke = teamGlow ?? BRAND.primary
  const directionKey = series.trend === 'up' ? 'trendUp' : series.trend === 'down' ? 'trendDown' : 'trendFlat'
  const directionLabel = t(directionKey)
  const ariaLabel = t('ariaLabelTemplate', { entity, direction: directionLabel })
  const showTrendArrow = Math.abs(series.delta) > TREND_VISIBLE_DELTA
  const arrowGlyph = series.trend === 'up' ? '↑' : series.trend === 'down' ? '↓' : '→'
  const deltaText = formatDelta(series.delta)
  const lastValue = series.points[series.points.length - 1].value
  const gradientId = `form-curve-fill-${entity}-${slug}`.replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div className="inline-flex w-full max-w-full flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width="100%"
        height="40"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={PADDING_X}
          y1={geom.baselineY}
          x2={VIEWBOX_WIDTH - PADDING_X}
          y2={geom.baselineY}
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        <path d={geom.areaPath} fill={`url(#${gradientId})`} />
        <path
          d={geom.linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={geom.lastX}
          cy={geom.lastY}
          r="2"
          fill={stroke}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.5"
        />
      </svg>
      <div className="flex items-center justify-between gap-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        <span className="font-semibold text-on-surface">{lastValue.toFixed(2)}</span>
        <span className="text-on-surface-variant">{t('monthsLabel', { count: series.points.length })}</span>
        {showTrendArrow ? (
          <span
            className={series.trend === 'up' ? 'text-primary' : 'text-secondary'}
            data-testid="form-curve-trend"
          >
            {arrowGlyph} {deltaText}
          </span>
        ) : (
          <span className="text-on-surface-variant">{arrowGlyph} {deltaText}</span>
        )}
      </div>
    </div>
  )
}
