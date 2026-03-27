'use client'

import { createContext, useContext, type ReactNode } from 'react'

interface SubscriptionContextType {
  isPro: boolean
  plan: 'free' | 'pro'
  loading: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  plan: 'free',
  loading: false,
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return (
    <SubscriptionContext.Provider value={{ isPro: false, plan: 'free', loading: false }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
