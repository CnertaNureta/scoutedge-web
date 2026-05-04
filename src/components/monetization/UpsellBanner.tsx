'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { getUpsellTriggers, PASS_PRICES, type EntitlementType, type EntitlementWithAmount, type UpgradeQuote } from '@/lib/entitlements'
import { getSupabase } from '@/lib/supabase'
import { Link } from '@/i18n/navigation'

export default function UpsellBanner() {
  const { user, session } = useAuth()
  const { entitlements, tier } = useEntitlements()
  const [fullEntitlements, setFullEntitlements] = useState<EntitlementWithAmount[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [quote, setQuote] = useState<UpgradeQuote | null>(null)

  useEffect(() => {
    if (!user) return

    const supabase = getSupabase()
    supabase
      .from('user_entitlements')
      .select('id, entitlement_type, scope, valid_from, valid_until, amount_paid_cents')
      .eq('user_id', user.id)
      .gt('valid_until', new Date().toISOString())
      .then(({ data }) => {
        setFullEntitlements((data as EntitlementWithAmount[]) ?? [])
      })
  }, [user])

  const triggers = getUpsellTriggers(fullEntitlements)
  const activeTrigger = triggers[0]

  useEffect(() => {
    if (!activeTrigger || !session?.access_token) return

    fetch(`/api/checkout/upgrade-quote?target=${activeTrigger.targetPass}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.targetPass) setQuote(data)
      })
      .catch(() => {})
  }, [activeTrigger, session?.access_token])

  if (!activeTrigger || dismissed || tier === 'scout_pass') return null

  const pass = PASS_PRICES[activeTrigger.targetPass]

  async function handleUpgrade() {
    if (!session?.access_token) return

    const res = await fetch('/api/checkout/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ targetPass: activeTrigger.targetPass }),
    })

    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="glass-panel rounded-2xl border border-tertiary/20 p-4 shadow-[0_0_40px_rgba(233,196,0,0.08)]">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-tertiary">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-on-surface text-sm font-bold mb-1">
              {activeTrigger.message}
            </p>

            {quote && quote.creditCents > 0 && (
              <p className="text-tertiary text-xs mb-2">
                You have ${(quote.creditCents / 100).toFixed(2)} in pass credits — pay only ${(quote.netPriceCents / 100).toFixed(2)}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleUpgrade}
                className="bg-tertiary text-on-tertiary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Upgrade — ${((quote?.netPriceCents ?? pass.amount) / 100).toFixed(2)}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-on-surface-variant/50 text-xs hover:text-on-surface transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-on-surface-variant/40 hover:text-on-surface text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  )
}
