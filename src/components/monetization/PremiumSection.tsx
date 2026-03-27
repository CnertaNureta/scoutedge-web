'use client'

import Paywall from '@/components/monetization/Paywall'
import type { PaywallVariant } from '@/components/monetization/Paywall'
import SectionHeader from '@/components/ui/SectionHeader'

interface PremiumSectionProps {
  children: React.ReactNode
  /** Feature label shown in the paywall CTA */
  feature: string
  /** Paywall variant for CTA messaging */
  variant?: PaywallVariant
  /** Optional teaser title shown above the blur gradient */
  teaserTitle?: string
  /** Optional teaser description shown before the gate */
  teaserDescription?: string
  /** Tracking key for conversion analytics */
  trackingKey?: string
}

/**
 * Wraps a full page section behind the Paywall.
 * Shows a section header teaser + blur gradient for free users.
 * Pro users see the full children content.
 */
export default function PremiumSection({
  children,
  feature,
  variant = 'data',
  teaserTitle,
  teaserDescription,
}: PremiumSectionProps) {
  const preview = teaserTitle ? (
    <div className="max-w-[1440px] mx-auto px-6 pb-8">
      <SectionHeader>{teaserTitle}</SectionHeader>
      {teaserDescription && (
        <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
          {teaserDescription}
        </p>
      )}
    </div>
  ) : undefined

  return (
    <section className="mb-16">
      <Paywall
        feature={feature}
        variant={variant}
        preview={preview}
      >
        {children}
      </Paywall>
    </section>
  )
}
