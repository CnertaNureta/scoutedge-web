'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'
import type { PointBalance, PointTransaction, CheckinResult, TRANSACTION_LABELS as TxLabels } from '@/lib/points-types'

const TRANSACTION_LABELS: typeof TxLabels = {
  prediction_correct: 'Correct Prediction',
  prediction_exact: 'Exact Score',
  challenge_correct: 'Challenge Correct',
  checkin: 'Daily Check-in',
  checkin_streak_bonus: 'Streak Bonus',
  invite_reward: 'Friend Invited',
  booster_purchase: 'Booster Activated',
  store_redemption: 'Store Purchase',
  first_prediction_bonus: 'First Prediction',
  first_challenge_bonus: 'First Challenge',
  admin_adjustment: 'Adjustment',
}

const EARNING_OPPORTUNITIES = [
  { action: 'Daily Check-in', points: '10', icon: '\u2705', frequency: 'Daily' },
  { action: 'Correct Prediction', points: '50', icon: '\u26BD', frequency: 'Per match' },
  { action: 'Exact Score', points: '150', icon: '\uD83C\uDFAF', frequency: 'Per match' },
  { action: 'Challenge (Easy)', points: '5', icon: '\uD83E\uDDE9', frequency: 'Per question' },
  { action: 'Challenge (Medium)', points: '10', icon: '\uD83E\uDDE9', frequency: 'Per question' },
  { action: 'Challenge (Hard)', points: '20', icon: '\uD83E\uDDE9', frequency: 'Per question' },
  { action: '7-Day Streak', points: '50', icon: '\uD83D\uDD25', frequency: 'Weekly bonus' },
  { action: '14-Day Streak', points: '150', icon: '\uD83D\uDD25', frequency: 'Bi-weekly bonus' },
  { action: '30-Day Streak', points: '500', icon: '\uD83D\uDD25', frequency: 'Monthly bonus' },
  { action: 'Invite a Friend', points: '200', icon: '\uD83D\uDC65', frequency: 'Per signup' },
]

export default function PointsPage() {
  const t = useTranslations('pointsPage')
  const { user, loading: authLoading } = useAuth()
  const { apiFetch } = useApi()

  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        apiFetch('/api/points/balance'),
        apiFetch('/api/points/transactions?limit=10'),
      ])
      setBalance(balRes)
      setTransactions(txRes.transactions)
    } catch {
      // Graceful fallback — new user with no balance
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (!authLoading && user) loadData()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user, loadData])

  async function handleCheckin() {
    setCheckingIn(true)
    setCheckinResult(null)
    try {
      const result: CheckinResult = await apiFetch('/api/points/checkin', { method: 'POST' })
      setCheckinResult(result)
      if (result.success && result.new_balance !== undefined) {
        setBalance(prev => prev ? {
          ...prev,
          balance: result.new_balance!,
          current_streak_days: result.streak,
          checked_in_today: true,
        } : prev)
      }
    } catch {
      setCheckinResult({ success: false, reason: 'error', streak: 0 })
    } finally {
      setCheckingIn(false)
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 pb-28 md:pb-12">
        <GlassCard className="p-8 text-center">
          <h2 className="font-headline text-xl text-on-surface mb-3">{t('authHeading')}</h2>
          <p className="text-on-surface-variant mb-6">{t('authDescription')}</p>
          <Link href="/auth/login" className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all inline-block">
            {t('signIn')}
          </Link>
        </GlassCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 pb-28 md:pb-12">
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 animate-pulse mb-6">
          <div className="h-12 bg-white/[0.06] rounded w-1/3 mx-auto mb-4" />
          <div className="h-4 bg-white/[0.06] rounded w-1/4 mx-auto" />
        </div>
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-6 animate-pulse">
          <div className="h-5 bg-white/[0.06] rounded w-1/3 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.06] rounded mb-2" />
          ))}
        </div>
      </div>
    )
  }

  const streakDays = balance?.current_streak_days ?? 0
  const canCheckin = !balance?.checked_in_today

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-28 md:pb-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl text-on-surface tracking-wide">
          {t('heading')}
        </h1>
        <p className="text-on-surface-variant mt-2 font-body">
          {t('description')}
        </p>
      </div>

      {/* Balance Card */}
      <GlassCard className="p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-tertiary/[0.04]" />
        <div className="relative">
          <div className="font-mono text-5xl md:text-6xl font-black text-primary tabular-nums">
            {(balance?.balance ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant mt-2">
            {t('available')}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-on-surface tabular-nums">
                {(balance?.lifetime_earned ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                {t('totalEarned')}
              </div>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-on-surface tabular-nums">
                {(balance?.lifetime_spent ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                {t('totalSpent')}
              </div>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-tertiary tabular-nums">
                {streakDays}
              </div>
              <div className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                {t('dayStreak')}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Check-in + Store CTA Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Daily Check-in */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline text-lg text-on-surface">{t('dailyCheckin')}</h2>
            {streakDays > 0 && (
              <span className="text-xs font-label uppercase tracking-widest bg-tertiary/15 text-tertiary px-2 py-1 rounded-full">
                {t('streakBadge', { count: streakDays })}
              </span>
            )}
          </div>

          {checkinResult?.success && (
            <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-primary font-bold text-sm">
                {t('checkinSuccess', { count: checkinResult.points_earned ?? 0 })}
              </p>
              {checkinResult.bonus_description && (
                <p className="text-primary/80 text-xs mt-1">{checkinResult.bonus_description}</p>
              )}
            </div>
          )}
          {checkinResult && !checkinResult.success && checkinResult.reason === 'already_checked_in' && (
            <div className="mb-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <p className="text-on-surface-variant text-sm">{t('checkedIn')}</p>
            </div>
          )}

          <button
            onClick={handleCheckin}
            disabled={!canCheckin || checkingIn}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              canCheckin
                ? 'bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]'
                : 'bg-white/[0.06] text-on-surface-variant cursor-default'
            }`}
          >
            {checkingIn ? t('checkinButton') : canCheckin ? t('checkinButton') : t('checkedIn')}
          </button>
        </GlassCard>

        {/* Store CTA */}
        <GlassCard className="p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-tertiary/[0.06] to-transparent" />
          <div className="relative">
            <h2 className="font-headline text-lg text-on-surface mb-2">{t('rewardsStore')}</h2>
            <p className="text-on-surface-variant text-sm mb-4">
              {t('rewardsStoreDesc')}
            </p>
            <Link
              href="/store"
              className="inline-block px-6 py-3 rounded-xl bg-tertiary text-on-tertiary font-bold text-sm hover:brightness-110 transition-all"
            >
              {t('browseStore')}
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <GlassCard className="p-6 mb-8">
          <h2 className="font-headline text-lg text-on-surface mb-4">{t('recentActivity')}</h2>
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <div className="text-sm text-on-surface font-medium">
                    {TRANSACTION_LABELS[tx.type] ?? tx.type}
                  </div>
                  {tx.description && (
                    <div className="text-xs text-on-surface-variant mt-0.5">{tx.description}</div>
                  )}
                </div>
                <div className={`font-mono text-sm font-bold tabular-nums ${
                  tx.amount > 0 ? 'text-primary' : 'text-secondary'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Earning Guide */}
      <GlassCard className="p-6 mb-8">
        <h2 className="font-headline text-lg text-on-surface mb-4">{t('howToEarn')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left py-2 text-on-surface-variant font-label text-xs uppercase tracking-widest">{t('action')}</th>
                <th className="text-right py-2 text-on-surface-variant font-label text-xs uppercase tracking-widest">{t('coins')}</th>
                <th className="text-right py-2 text-on-surface-variant font-label text-xs uppercase tracking-widest hidden sm:table-cell">{t('frequency')}</th>
              </tr>
            </thead>
            <tbody>
              {EARNING_OPPORTUNITIES.map(opp => (
                <tr key={opp.action} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2.5 text-on-surface">
                    <span className="mr-2">{opp.icon}</span>
                    {opp.action}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-primary tabular-nums">
                    +{opp.points}
                  </td>
                  <td className="py-2.5 text-right text-on-surface-variant text-xs hidden sm:table-cell">
                    {opp.frequency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/predict', labelKey: 'predictions' as const, icon: '\u26BD' },
          { href: '/challenges', labelKey: 'challenges' as const, icon: '\uD83E\uDDE9' },
          { href: '/leaderboard', labelKey: 'leaderboard' as const, icon: '\uD83C\uDFC6' },
          { href: '/store', labelKey: 'store' as const, icon: '\uD83D\uDED2' },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <GlassCard className="p-4 text-center hover:translate-y-[-2px] transition-transform">
              <div className="text-2xl mb-1">{link.icon}</div>
              <div className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                {t(link.labelKey)}
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
