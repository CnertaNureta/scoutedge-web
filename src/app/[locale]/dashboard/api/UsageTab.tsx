'use client'

import { useRef, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'

interface DailyUsage {
  date: string
  requests: number
  errors: number
}

interface UsageSummary {
  totalRequests: number
  totalErrors: number
  avgResponseTime: number
}

interface Props {
  daily: DailyUsage[]
  summary: UsageSummary
  quota: number
  loading: boolean
}

export default function UsageTab({ daily, summary, quota, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-6">
          <div className="h-[280px] bg-surface-container-high/50 rounded-xl animate-pulse" />
        </GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 h-32"><div className="animate-pulse bg-surface-container-high/50 h-full rounded-xl" /></GlassCard>
          <GlassCard className="p-5 h-32"><div className="animate-pulse bg-surface-container-high/50 h-full rounded-xl" /></GlassCard>
        </div>
      </div>
    )
  }

  if (daily.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-4xl mb-4">📊</p>
        <h3 className="font-headline text-lg font-bold uppercase text-on-surface mb-2">No usage data yet</h3>
        <p className="font-body text-sm text-on-surface-variant mb-4 max-w-sm mx-auto">
          Make your first API request to see usage data here.
        </p>
        <div className="bg-surface-container-lowest rounded-xl p-4 max-w-lg mx-auto text-left">
          <p className="font-mono text-xs text-on-surface-variant">
            curl -H &quot;X-API-Key: se_live_your_key&quot; \<br />
            &nbsp;&nbsp;https://kickoracle.com/api/v1/predictions
          </p>
        </div>
      </GlassCard>
    )
  }

  const errorRate = summary.totalRequests > 0 ? (summary.totalErrors / summary.totalRequests) * 100 : 0
  const errorColor = errorRate > 5 ? 'text-secondary' : errorRate > 1 ? 'text-tertiary' : 'text-primary'
  const quotaPct = quota > 0 ? (summary.totalRequests / quota) * 100 : 0
  const quotaColor = quotaPct > 90 ? 'bg-secondary' : quotaPct > 70 ? 'bg-tertiary' : 'bg-primary'

  return (
    <div className="space-y-4">
      <UsageChart data={daily} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Monthly Quota
          </p>
          <p className="font-mono text-xl font-bold text-on-surface">
            {summary.totalRequests.toLocaleString()} / {quota.toLocaleString()}
          </p>
          <div className="h-2 rounded-full bg-surface-container-high mt-3 mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${quotaColor}`}
              style={{ width: `${Math.min(quotaPct, 100)}%` }}
            />
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            Resets on the 1st of next month
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Errors (30 days)
          </p>
          <p className={`font-mono text-xl font-bold ${errorColor}`}>
            {summary.totalErrors.toLocaleString()} errors ({errorRate.toFixed(2)}%)
          </p>
          <div className="h-2 rounded-full bg-surface-container-high mt-3 mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${errorRate > 5 ? 'bg-secondary' : errorRate > 1 ? 'bg-tertiary' : 'bg-primary'}`}
              style={{ width: `${Math.min(errorRate, 100)}%` }}
            />
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            Avg response time: {summary.avgResponseTime}ms
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

function UsageChart({ data }: { data: DailyUsage[] }) {
  const locale = useLocale()
  const svgRef = useRef<SVGSVGElement>(null)
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState<{ x: number; date: string; value: number } | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 },
    )
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const maxVal = Math.max(...data.map((d) => d.requests), 1)
  const W = 800
  const H = 280
  const PX = 50
  const PY = 30
  const chartW = W - PX * 2
  const chartH = H - PY * 2

  const points = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * chartW,
    y: PY + chartH - (d.requests / maxVal) * chartH,
    date: d.date,
    value: d.requests,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points.at(-1)?.x ?? PX},${PY + chartH} L${PX},${PY + chartH} Z`

  const gridLines = 5
  const gridValues = Array.from({ length: gridLines }, (_, i) => Math.round((maxVal / (gridLines - 1)) * i))

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || points.length === 0) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    let closest = points[0]
    for (const p of points) {
      if (Math.abs(p.x - mouseX) < Math.abs(closest.x - mouseX)) closest = p
    }
    setTooltip({ x: closest.x, date: closest.date, value: closest.value })
  }

  return (
    <GlassCard className="p-4 md:p-6">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(160,212,148,0.3)" />
            <stop offset="100%" stopColor="rgba(160,212,148,0)" />
          </linearGradient>
        </defs>

        {gridValues.map((val, i) => {
          const y = PY + chartH - (val / maxVal) * chartH
          return (
            <g key={i}>
              <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#42493f" strokeDasharray="4 4" strokeWidth="0.5" />
              <text x={PX - 8} y={y + 4} textAnchor="end" className="fill-on-surface-variant" style={{ fontSize: 10, fontFamily: 'var(--font-label)' }}>
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            </g>
          )
        })}

        {points.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0 || i === data.length - 1).map((p) => (
          <text key={p.date} x={p.x} y={H - 8} textAnchor="middle" className="fill-on-surface-variant" style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {new Date(p.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {visible && (
          <>
            <path d={areaPath} fill="url(#usageGrad)" className="animate-fade-in-up" style={{ animationDuration: '1.2s' }} />
            <path
              d={linePath}
              fill="none"
              stroke="#a0d494"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-fade-in-up"
              style={{ animationDuration: '1.2s' }}
            />
            {points.map((p) => (
              <circle key={p.date} cx={p.x} cy={p.y} r={3} fill="#a0d494" className="animate-fade-in-up" style={{ animationDuration: '1.2s' }} />
            ))}
          </>
        )}

        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PY} x2={tooltip.x} y2={PY + chartH} stroke="#a0d494" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={tooltip.x} cy={PY + chartH - (tooltip.value / maxVal) * chartH} r={5} fill="#a0d494" stroke="#121412" strokeWidth="2" />
          </>
        )}
      </svg>

      {tooltip && (
        <div
          className="glass-panel rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none absolute z-10 border border-white/[0.08]"
          style={{
            left: `calc(${(tooltip.x / W) * 100}% - 60px)`,
            marginTop: '-2rem',
          }}
        >
          <p className="font-label text-on-surface-variant">{new Date(tooltip.date).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p className="font-mono font-bold text-on-surface">{tooltip.value.toLocaleString()} requests</p>
        </div>
      )}
    </GlassCard>
  )
}
