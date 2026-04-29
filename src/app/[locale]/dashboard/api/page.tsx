'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import { useToast, ToastProvider } from '@/components/ui/Toast'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import KeysTab from './KeysTab'
import UsageTab from './UsageTab'
import EndpointsTab from './EndpointsTab'
import PlanTab from './PlanTab'

const TABS = ['keys', 'usage', 'endpoints', 'billing'] as const
type Tab = (typeof TABS)[number]

interface ApiKey {
  id: string
  name: string
  tier: string
  keyPrefix: string
  rateLimitPerMinute: number
  rateLimitPerMonth: number
  isActive: boolean
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface UsageSummary {
  totalRequests: number
  totalErrors: number
  avgResponseTime: number
}

interface DailyUsage {
  date: string
  requests: number
  errors: number
}

interface EndpointUsage {
  endpoint: string
  requests: number
  errors: number
  errorRate: number
  avgResponseTime: number
}

function DashboardContent() {
  const t = useTranslations('apiDashboardClient')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { apiFetch } = useApi()
  const { toast } = useToast()

  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'keys'

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({ totalRequests: 0, totalErrors: 0, avgResponseTime: 0 })
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [endpoints, setEndpoints] = useState<EndpointUsage[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    const success = searchParams.get('success')
    const tier = searchParams.get('tier')
    if (success === 'true' && tier) {
      toast(t('subscriptionActivated', { tier }), 'success')
    }
    const canceled = searchParams.get('canceled')
    if (canceled === 'true') {
      toast(t('checkoutCanceled'), 'info')
    }
  }, [searchParams, toast, t])

  useEffect(() => {
    if (!user) return
    setLoadingKeys(true)
    apiFetch('/api/dashboard/keys')
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => toast(t('loadKeysFailed'), 'destructive'))
      .finally(() => setLoadingKeys(false))
  }, [user, apiFetch, toast, t])

  useEffect(() => {
    if (!user) return
    setLoadingUsage(true)
    apiFetch('/api/dashboard/usage?days=30')
      .then((data) => {
        setUsageSummary(data.summary ?? { totalRequests: 0, totalErrors: 0, avgResponseTime: 0 })
        setDailyUsage(data.daily ?? [])
        setEndpoints(data.endpoints ?? [])
      })
      .catch(() => toast(t('loadUsageFailed'), 'destructive'))
      .finally(() => setLoadingUsage(false))
  }, [user, apiFetch, toast, t])

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/dashboard/api?${params.toString()}`, { scroll: false })
  }

  const refreshKeys = () => {
    apiFetch('/api/dashboard/keys')
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => {})
  }

  if (authLoading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-container-high/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-24 text-center">
        <GlassCard className="p-12 max-w-md mx-auto">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="font-headline text-lg font-bold uppercase text-on-surface mb-2">{t('signInRequiredHeading')}</h2>
          <p className="font-body text-sm text-on-surface-variant">{t('signInRequiredDescription')}</p>
        </GlassCard>
      </div>
    )
  }

  const activeKeys = keys.filter((k) => k.isActive)
  const currentTier = activeKeys[0]?.tier ?? 'none'
  const monthlyQuota = activeKeys[0]?.rateLimitPerMonth ?? 0

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight text-on-surface">
          {t('title')}
        </h1>
        {currentTier !== 'none' && (
          <Badge variant="primary" size="md">
            {currentTier.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard
          value={usageSummary.totalRequests}
          label={t('stats.requests')}
          sublabel={t('stats.last30Days')}
          loading={loadingUsage}
        />
        <QuotaCard
          used={usageSummary.totalRequests}
          total={monthlyQuota}
          loading={loadingUsage}
          quotaLabel={t('stats.quotaUsed')}
        />
        <StatCard
          value={activeKeys.length}
          label={t('stats.activeKeys')}
          loading={loadingKeys}
        />
        <StatCard
          value={usageSummary.avgResponseTime}
          label={t('stats.avgLatency')}
          sublabel={t('stats.last30Days')}
          suffix="ms"
          loading={loadingUsage}
        />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-outline-variant mb-8 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-4 py-3 font-label text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
        {activeTab === 'keys' && (
          <KeysTab keys={keys} loading={loadingKeys} onRefresh={refreshKeys} />
        )}
        {activeTab === 'usage' && (
          <UsageTab
            daily={dailyUsage}
            summary={usageSummary}
            quota={monthlyQuota}
            loading={loadingUsage}
          />
        )}
        {activeTab === 'endpoints' && (
          <EndpointsTab endpoints={endpoints} loading={loadingUsage} />
        )}
        {activeTab === 'billing' && (
          <PlanTab currentTier={currentTier} />
        )}
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  sublabel,
  suffix,
  loading,
}: {
  value: number
  label: string
  sublabel?: string
  suffix?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <GlassCard className="p-4 md:p-5">
        <div className="h-8 w-20 bg-surface-container-high rounded-lg animate-pulse mb-2" />
        <div className="h-3 w-16 bg-surface-container-high rounded animate-pulse" />
      </GlassCard>
    )
  }
  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex items-baseline gap-1">
        <AnimatedNumber value={value} className="font-mono text-2xl md:text-3xl font-bold text-on-surface" />
        {suffix && <span className="font-mono text-sm text-on-surface-variant">{suffix}</span>}
      </div>
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{label}</p>
      {sublabel && <p className="font-body text-xs text-on-surface-variant">{sublabel}</p>}
    </GlassCard>
  )
}

function QuotaCard({ used, total, loading, quotaLabel }: { used: number; total: number; loading?: boolean; quotaLabel: string }) {
  if (loading) {
    return (
      <GlassCard className="p-4 md:p-5">
        <div className="h-8 w-20 bg-surface-container-high rounded-lg animate-pulse mb-2" />
        <div className="h-1.5 bg-surface-container-high rounded-full animate-pulse mt-3" />
      </GlassCard>
    )
  }
  const pct = total > 0 ? (used / total) * 100 : 0
  const barColor = pct > 90 ? 'bg-secondary' : pct > 70 ? 'bg-tertiary' : 'bg-primary'

  return (
    <GlassCard className="p-4 md:p-5">
      <p className="font-mono text-2xl md:text-3xl font-bold text-on-surface">
        {pct.toFixed(1)}%
      </p>
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">
        {quotaLabel}
      </p>
      <p className="font-body text-xs text-on-surface-variant">
        {used.toLocaleString()} / {total.toLocaleString()}
      </p>
      <div className="h-1.5 rounded-full bg-surface-container-high mt-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </GlassCard>
  )
}

export default function ApiDashboardPage() {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="max-w-[1440px] mx-auto px-6 py-12">
          <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container-high/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ToastProvider>
  )
}
