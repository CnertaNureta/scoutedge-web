'use client'

import { useTranslations } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'

interface EndpointUsage {
  endpoint: string
  requests: number
  errors: number
  errorRate: number
  avgResponseTime: number
}

interface Props {
  endpoints: EndpointUsage[]
  loading: boolean
}

export default function EndpointsTab({ endpoints, loading }: Props) {
  const t = useTranslations('apiEndpointsTab')

  if (loading) {
    return (
      <GlassCard className="p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-outline-variant/30 last:border-0">
            <div className="h-5 w-40 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-16 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-12 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </GlassCard>
    )
  }

  if (endpoints.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h3 className="font-headline text-lg font-bold uppercase text-on-surface mb-2">{t('noDataTitle')}</h3>
        <p className="font-body text-sm text-on-surface-variant">{t('noDataDescription')}</p>
      </GlassCard>
    )
  }

  const maxRequests = Math.max(...endpoints.map((e) => e.requests), 1)

  return (
    <>
      {/* Desktop Table */}
      <GlassCard className="hidden md:block overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableEndpoint')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableRequests')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableAvgTime')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableErrorRate')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableVolume')}</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.endpoint} className="border-b border-outline-variant/30 hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-on-surface-variant mr-1.5">{t('method')}</span>
                  <span className="font-mono text-sm text-on-surface">{ep.endpoint}</span>
                </td>
                <td className="px-5 py-3 font-mono text-sm font-bold text-on-surface">
                  {ep.requests.toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-sm ${latencyColor(ep.avgResponseTime)}`}>
                    {ep.avgResponseTime}ms
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-sm ${errorColor(ep.errorRate)}`}>
                    {ep.errorRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-5 py-3 w-32">
                  <div className="h-1.5 rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${(ep.requests / maxRequests) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {endpoints.map((ep) => (
          <GlassCard key={ep.endpoint} className="p-4">
            <p className="font-mono text-sm text-on-surface mb-2">
              <span className="text-on-surface-variant">{t('method')}</span> {ep.endpoint}
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono font-bold text-on-surface">{ep.requests.toLocaleString()} {t('reqShort')}</span>
              <span className={`font-mono ${latencyColor(ep.avgResponseTime)}`}>{ep.avgResponseTime}ms</span>
              <span className={`font-mono ${errorColor(ep.errorRate)}`}>{ep.errorRate.toFixed(1)}% {t('errShort')}</span>
            </div>
            <div className="h-1 rounded-full bg-surface-container-high mt-3">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${(ep.requests / maxRequests) * 100}%` }}
              />
            </div>
          </GlassCard>
        ))}
      </div>
    </>
  )
}

function latencyColor(ms: number): string {
  if (ms < 200) return 'text-primary'
  if (ms < 500) return 'text-tertiary'
  return 'text-secondary'
}

function errorColor(rate: number): string {
  if (rate < 1) return 'text-primary'
  if (rate < 5) return 'text-tertiary'
  return 'text-secondary'
}
