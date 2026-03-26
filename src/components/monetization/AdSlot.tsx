'use client'

/**
 * Ad slot placeholder component.
 * When AdSense/Mediavine is activated, replace the placeholder
 * content with the actual ad script tags.
 *
 * Slots:
 * - leaderboard: 728x90 (top of page, between sections)
 * - sidebar: 300x250 (sidebar, within content)
 * - in-feed: 336x280 (between content cards)
 * - sticky-footer: 320x50 mobile sticky bottom
 */

type AdFormat = 'leaderboard' | 'sidebar' | 'in-feed' | 'sticky-footer'

const AD_DIMENSIONS: Record<AdFormat, { w: string; h: string; label: string }> = {
  leaderboard: { w: '728px', h: '90px', label: 'Ad' },
  sidebar: { w: '300px', h: '250px', label: 'Ad' },
  'in-feed': { w: '100%', h: '280px', label: 'Sponsored' },
  'sticky-footer': { w: '320px', h: '50px', label: 'Ad' },
}

interface AdSlotProps {
  format: AdFormat
  className?: string
}

export default function AdSlot({ format, className = '' }: AdSlotProps) {
  const dims = AD_DIMENSIONS[format]

  // In production with real ads, this component would render the ad script.
  // For now, render a styled placeholder that shows where ads will appear.
  // Set NEXT_PUBLIC_ADS_ENABLED=true to show placeholders during development.
  if (process.env.NEXT_PUBLIC_ADS_ENABLED !== 'true') {
    return null // Hidden in production until ads are configured
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] ${className}`}
      style={{ maxWidth: dims.w, height: dims.h, width: '100%', margin: '0 auto' }}
    >
      <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
        {dims.label} — {format}
      </span>
    </div>
  )
}
