'use client'

import { useEffect, useRef, useState } from 'react'
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '@/lib/adsense'

type AdFormat = 'leaderboard' | 'sidebar' | 'in-feed' | 'sticky-footer'

const AD_CONFIG: Record<AdFormat, { w: string; h: string; label: string; adFormat: string }> = {
  leaderboard: { w: '728px', h: '90px', label: 'Ad', adFormat: 'horizontal' },
  sidebar: { w: '300px', h: '250px', label: 'Ad', adFormat: 'rectangle' },
  'in-feed': { w: '100%', h: '280px', label: 'Sponsored', adFormat: 'fluid' },
  'sticky-footer': { w: '320px', h: '50px', label: 'Ad', adFormat: 'horizontal' },
}

const VIEWPORT_PREFETCH_MARGIN = '200px'

interface AdSlotProps {
  format: AdFormat
  className?: string
}

export default function AdSlot({ format, className = '' }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  const [inView, setInView] = useState(false)
  const config = AD_CONFIG[format]

  // Only mount the <ins> element once the slot is within ~200px of the
  // viewport. Reserves the height up-front (minHeight on the wrapper) so
  // there's no CLS when the ad fills.
  useEffect(() => {
    if (!ADSENSE_ENABLED) return
    const node = containerRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin: VIEWPORT_PREFETCH_MARGIN },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!ADSENSE_ENABLED) return
    if (!inView || pushed.current || !adRef.current) return
    try {
      const adsWindow = window as Window & { adsbygoogle?: unknown[] }
      const adsbygoogle = adsWindow.adsbygoogle ?? (adsWindow.adsbygoogle = [])
      adsbygoogle.push({})
      pushed.current = true
    } catch {
      // AdSense not loaded yet or blocked by adblocker
    }
  }, [inView])

  if (!ADSENSE_ENABLED) return null

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center ${className}`}
      style={{ maxWidth: config.w, width: '100%', margin: '0 auto', minHeight: config.h }}
    >
      {inView ? (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: config.h }}
          data-ad-client={ADSENSE_PUBLISHER_ID}
          data-ad-format={config.adFormat === 'fluid' ? 'fluid' : 'auto'}
          data-full-width-responsive="true"
        />
      ) : null}
    </div>
  )
}
