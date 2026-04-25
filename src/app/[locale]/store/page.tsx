'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'
import type { StoreItem, StoreItemCategory, PointBalance } from '@/lib/points-types'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/lib/points-types'

const CATEGORIES: (StoreItemCategory | 'all')[] = ['all', 'premium_trial', 'ai_credits', 'wallpaper', 'badge', 'booster']

export default function StorePage() {
  const { user, loading: authLoading } = useAuth()
  const { apiFetch } = useApi()

  const [items, setItems] = useState<StoreItem[]>([])
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [activeCategory, setActiveCategory] = useState<StoreItemCategory | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchaseResult, setPurchaseResult] = useState<{ itemId: string; success: boolean; message: string } | null>(null)
  const t = useTranslations('storePage')

  const loadData = useCallback(async () => {
    try {
      const [storeRes, balRes] = await Promise.all([
        apiFetch('/api/store/items'),
        user ? apiFetch('/api/points/balance') : Promise.resolve(null),
      ])
      setItems(storeRes.items)
      if (balRes) setBalance(balRes)
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false)
    }
  }, [apiFetch, user])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(item => item.category === activeCategory)

  const pointItems = filteredItems.filter(i => !i.real_money_cents)
  const moneyItems = filteredItems.filter(i => i.real_money_cents)

  async function handlePointPurchase(item: StoreItem) {
    if (!user) return
    setPurchasing(item.id)
    setPurchaseResult(null)
    try {
      const result = await apiFetch('/api/store/purchase', {
        method: 'POST',
        body: JSON.stringify({ item_id: item.id }),
      })
      setPurchaseResult({ itemId: item.id, success: true, message: `${result.item_name} purchased!` })
      setBalance(prev => prev ? { ...prev, balance: result.new_balance } : prev)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('purchaseFailed')
      setPurchaseResult({ itemId: item.id, success: false, message: msg })
    } finally {
      setPurchasing(null)
    }
  }

  async function handleBoosterPurchase(item: StoreItem) {
    if (!user) return
    setPurchasing(item.id)
    try {
      const result = await apiFetch('/api/store/purchase-booster', {
        method: 'POST',
        body: JSON.stringify({ item_slug: item.slug }),
      })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      }
    } catch {
      setPurchaseResult({ itemId: item.id, success: false, message: t('checkoutFailed') })
    } finally {
      setPurchasing(null)
    }
  }

  function canAfford(item: StoreItem): boolean {
    return (balance?.balance ?? 0) >= item.point_cost
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 pb-28 md:pb-12">
        <div className="h-10 bg-white/[0.06] rounded w-1/3 mx-auto mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/[0.08] p-6 animate-pulse">
              <div className="h-32 bg-white/[0.06] rounded-xl mb-4" />
              <div className="h-5 bg-white/[0.06] rounded w-2/3 mb-2" />
              <div className="h-4 bg-white/[0.06] rounded w-full mb-4" />
              <div className="h-10 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-28 md:pb-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl md:text-5xl text-on-surface tracking-wide">
          {t('heading')}
        </h1>
        <p className="text-on-surface-variant mt-2 font-body">
          {t('description')}
        </p>
      </div>

      {/* Balance Bar */}
      {user && (
        <GlassCard className="p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-mono text-2xl font-black text-primary tabular-nums">
                {(balance?.balance ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                {t('scoutCoins')}
              </div>
            </div>
            <Link
              href="/points"
              className="text-xs font-label uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              {t('earnMore')}
            </Link>
          </div>
        </GlassCard>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-on-primary'
                : 'bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.1]'
            }`}
          >
            {cat === 'all' ? t('all') : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
          </button>
        ))}
      </div>

      {/* Featured Boosters (Real Money) */}
      {moneyItems.length > 0 && (
        <div className="mb-10">
          <h2 className="font-headline text-xl text-on-surface mb-4 flex items-center gap-2">
            <span className="text-tertiary">&#x26A1;</span> {t('pointBoosters')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {moneyItems.map(item => (
              <GlassCard key={item.id} className="p-6 relative overflow-hidden">
                {item.is_featured && (
                  <div className="absolute top-3 right-3 text-[10px] font-label uppercase tracking-widest bg-tertiary/15 text-tertiary px-2 py-0.5 rounded-full">
                    {t('popular')}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-tertiary/[0.04] to-transparent" />
                <div className="relative">
                  <div className="text-3xl mb-3">{CATEGORY_ICONS[item.category]}</div>
                  <h3 className="font-headline text-lg text-on-surface mb-1">{item.name}</h3>
                  <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{item.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xl font-black text-tertiary">
                      ${((item.real_money_cents ?? 0) / 100).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleBoosterPurchase(item)}
                      disabled={!user || purchasing === item.id}
                      className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-default"
                    >
                      {purchasing === item.id ? t('loading') : t('buyNow')}
                    </button>
                  </div>

                  {purchaseResult?.itemId === item.id && (
                    <div className={`mt-3 p-2 rounded-lg text-xs ${
                      purchaseResult.success ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {purchaseResult.message}
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Point-Based Items */}
      {pointItems.length > 0 && (
        <div>
          <h2 className="font-headline text-xl text-on-surface mb-4">
            {moneyItems.length > 0 ? t('redeemWithCoins') : t('storeItems')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pointItems.map(item => {
              const affordable = canAfford(item)
              return (
                <GlassCard key={item.id} className="p-6 flex flex-col">
                  <div className="text-3xl mb-3">{CATEGORY_ICONS[item.category]}</div>
                  <span className="self-start text-[10px] font-label uppercase tracking-widest bg-white/[0.06] text-on-surface-variant px-2 py-0.5 rounded-full mb-3">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <h3 className="font-headline text-lg text-on-surface mb-1">{item.name}</h3>
                  <p className="text-sm text-on-surface-variant mb-4 flex-1 line-clamp-2">{item.description}</p>

                  {item.stock !== null && item.stock <= 10 && (
                    <div className="text-[10px] font-label uppercase tracking-widest text-secondary mb-2">
                      {t('onlyLeft', { count: item.stock })}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <div className="font-mono text-lg font-bold text-primary tabular-nums">
                      {t('coins', { count: item.point_cost.toLocaleString() })}
                    </div>
                    <button
                      onClick={() => handlePointPurchase(item)}
                      disabled={!user || !affordable || purchasing === item.id}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        !user
                          ? 'bg-white/[0.06] text-on-surface-variant cursor-default'
                          : affordable
                            ? 'bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]'
                            : 'bg-white/[0.06] text-on-surface-variant cursor-default'
                      }`}
                    >
                      {purchasing === item.id
                        ? t('buying')
                        : !user
                          ? t('signIn')
                          : affordable
                            ? t('redeem')
                            : t('notEnough')}
                    </button>
                  </div>

                  {purchaseResult?.itemId === item.id && (
                    <div className={`mt-3 p-2 rounded-lg text-xs ${
                      purchaseResult.success ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {purchaseResult.message}
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}

      {filteredItems.length === 0 && (
        <GlassCard className="p-8 text-center">
          <p className="text-on-surface-variant">{t('emptyCategory')}</p>
        </GlassCard>
      )}

      {/* Sign In CTA for non-authenticated */}
      {!user && (
        <GlassCard className="p-8 text-center mt-8">
          <h2 className="font-headline text-xl text-on-surface mb-3">{t('startEarning')}</h2>
          <p className="text-on-surface-variant mb-6">{t('signInToEarn')}</p>
          <Link
            href="/auth/login"
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all inline-block"
          >
            {t('signIn')}
          </Link>
        </GlassCard>
      )}
    </div>
  )
}
