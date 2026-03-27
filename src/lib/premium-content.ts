/**
 * Premium content tier configuration.
 *
 * Defines which features / page sections are gated behind Pro.
 * Free users see a teaser preview + Paywall CTA.
 */

import type { PaywallVariant } from '@/components/monetization/Paywall'

export interface PremiumFeature {
  /** Unique key for tracking */
  key: string
  /** Human-readable label shown in the paywall */
  label: string
  /** Paywall variant controls CTA messaging */
  variant: PaywallVariant
}

/** Team page premium sections */
export const PREMIUM_TEAM_SECTIONS: Record<string, PremiumFeature> = {
  marketIntel: {
    key: 'team_market_intel',
    label: 'Market Intelligence',
    variant: 'data',
  },
  tacticalDNA: {
    key: 'team_tactical_dna',
    label: 'Tactical DNA Analysis',
    variant: 'data',
  },
  squadDepth: {
    key: 'team_squad_depth',
    label: 'Squad Depth Analysis',
    variant: 'data',
  },
}

/** Player page premium sections */
export const PREMIUM_PLAYER_SECTIONS: Record<string, PremiumFeature> = {
  playerIntel: {
    key: 'player_intel',
    label: 'AI Intelligence Report',
    variant: 'signal',
  },
}

/** Daily briefing: number of free signals before paywall */
export const DAILY_BRIEFING_FREE_SIGNALS = 3

/** Daily briefing premium feature */
export const PREMIUM_BRIEFING: PremiumFeature = {
  key: 'daily_briefing_signals',
  label: 'Full Intelligence Feed',
  variant: 'signal',
}
