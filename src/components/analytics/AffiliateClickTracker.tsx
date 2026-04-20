'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function AffiliateClickTracker() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-affiliate]')
      if (!target) return
      trackEvent({
        event: 'affiliate_click',
        affiliate_id: target.dataset.affiliate!,
        placement: target.dataset.placement,
        context: target.dataset.context,
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
