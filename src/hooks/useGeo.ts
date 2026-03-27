'use client'

import { useState, useEffect } from 'react'
import { type AffiliatePartner, getEligiblePartners } from '@/lib/affiliates'

interface GeoState {
  country: string | null
  usState: string | null
  isLoading: boolean
  eligiblePartners: AffiliatePartner[]
}

const SESSION_KEY = 'scoutedge-geo'

export function useGeo(): GeoState {
  const [state, setState] = useState<GeoState>({
    country: null,
    usState: null,
    isLoading: true,
    eligiblePartners: [],
  })

  useEffect(() => {
    // Check sessionStorage first to avoid repeated API calls
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) {
      try {
        const { country, region } = JSON.parse(cached)
        const usState = country === 'US' ? region : null
        setState({
          country,
          usState,
          isLoading: false,
          eligiblePartners: getEligiblePartners(country, usState),
        })
        return
      } catch {
        // Fall through to fetch
      }
    }

    fetch('/api/geo')
      .then((res) => res.json())
      .then((data: { country: string | null; region: string | null }) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
        const usState = data.country === 'US' ? data.region : null
        setState({
          country: data.country,
          usState,
          isLoading: false,
          eligiblePartners: getEligiblePartners(data.country, usState),
        })
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isLoading: false }))
      })
  }, [])

  return state
}
