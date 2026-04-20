'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import AffiliateClickTracker from '@/components/analytics/AffiliateClickTracker'
import SubscriptionSuccessTracker from '@/components/analytics/SubscriptionSuccessTracker'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AffiliateClickTracker />
      <Suspense>
        <SubscriptionSuccessTracker />
      </Suspense>
    </AuthProvider>
  )
}
