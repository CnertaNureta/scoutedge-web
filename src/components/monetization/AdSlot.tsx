'use client'

import { useEffect, useRef } from 'react'

type AdFormat = 'leaderboard' | 'sidebar' | 'in-feed' | 'sticky-footer'

const AD_CONFIG: Record<AdFormat, { w: string; h: string; label: string; adFormat: string }> = {
  leaderboard: { w: '728px', h: '90px', label: 'Ad', adFormat: 'horizontal' },
  sidebar: { w: '300px', h: '250px', label: 'Ad', adFormat: 'rectangle' },
  'in-feed': { w: '100%', h: '280px', label: 'Sponsored', adFormat: 'fluid' },
  'sticky-footer': { w: '320px', h: '50px', label: 'Ad', adFormat: 'horizontal' },
}

interface AdSlotProps {
  format: AdFormat
  className?: string
}

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID

export default function AdSlot({ format, className = '' }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  const config = AD_CONFIG[format]

  useEffect(() => {
    if (!PUBLISHER_ID || pushed.current || !adRef.current) return
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []
      adsbygoogle.push({})
      pushed.current = true
    } catch {
      // AdSense not loaded yet or blocked by adblocker
    }
  }, [])

  if (!PUBLISHER_ID) return null

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ maxWidth: config.w, width: '100%', margin: '0 auto' }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: config.h }}
        data-ad-client={PUBLISHER_ID}
        data-ad-format={config.adFormat === 'fluid' ? 'fluid' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  )
}
