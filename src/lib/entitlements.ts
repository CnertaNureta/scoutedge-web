export type EntitlementType = 'match_pass' | 'team_pass' | 'tournament_pass' | 'scout_pass'

export type SubscriptionTier = 'free' | 'match_pass' | 'team_pass' | 'tournament_pass' | 'scout_pass'

export interface Entitlement {
  id: string
  entitlement_type: EntitlementType
  scope: string | null
  valid_from: string
  valid_until: string
}

const TIER_HIERARCHY: Record<EntitlementType, number> = {
  match_pass: 1,
  team_pass: 2,
  tournament_pass: 3,
  scout_pass: 4,
}

export type ContentType = 'match' | 'team' | 'daily_briefing' | 'prediction' | 'blog' | 'live_analytics' | 'bracket_simulator' | 'scout_report' | 'player_intel'

const SCOUT_ONLY_FEATURES = new Set<ContentType>([
  'live_analytics',
  'bracket_simulator',
  'scout_report',
  'player_intel',
])

export function hasAccess(
  entitlements: Entitlement[],
  contentType: ContentType,
  scope?: string,
): boolean {
  const now = new Date().toISOString()
  const active = entitlements.filter(e => e.valid_until > now)

  if (active.some(e => e.entitlement_type === 'scout_pass')) return true

  if (SCOUT_ONLY_FEATURES.has(contentType)) return false

  if (active.some(e => e.entitlement_type === 'tournament_pass')) return true

  if (contentType === 'team' && scope) {
    return active.some(e => e.entitlement_type === 'team_pass' && e.scope === scope)
  }

  if (contentType === 'match' && scope) {
    const hasMatchPass = active.some(e => e.entitlement_type === 'match_pass' && e.scope === scope)
    if (hasMatchPass) return true
    const teamSlug = scope.split('-vs-')[0]
    return active.some(e => e.entitlement_type === 'team_pass' && (e.scope === teamSlug || e.scope === scope.split('-vs-')[1]))
  }

  return false
}

export function getHighestTier(entitlements: Entitlement[]): SubscriptionTier {
  const now = new Date().toISOString()
  const active = entitlements.filter(e => e.valid_until > now)

  if (active.length === 0) return 'free'

  let max = 0
  let maxType: EntitlementType = 'match_pass'

  for (const e of active) {
    const rank = TIER_HIERARCHY[e.entitlement_type] ?? 0
    if (rank > max) {
      max = rank
      maxType = e.entitlement_type
    }
  }

  return maxType
}

export function getUpgradeTarget(
  entitlements: Entitlement[],
  contentType: ContentType,
): EntitlementType {
  if (SCOUT_ONLY_FEATURES.has(contentType)) return 'scout_pass'

  const tier = getHighestTier(entitlements)

  if (contentType === 'match' && (tier === 'free' || tier === 'match_pass')) {
    return 'match_pass'
  }
  if (contentType === 'team' && (tier === 'free' || tier === 'match_pass')) {
    return 'team_pass'
  }

  if (tier === 'free') return 'tournament_pass'
  if (tier === 'match_pass' || tier === 'team_pass') return 'tournament_pass'
  return 'scout_pass'
}

export const PASS_PRICES: Record<EntitlementType, { amount: number; label: string; description: string }> = {
  match_pass: { amount: 299, label: 'Match Pass', description: 'Live stats, AI model edge, odds tracking & signals for one match' },
  team_pass: { amount: 499, label: 'Team Pass', description: 'Complete intel for one team' },
  tournament_pass: { amount: 3999, label: 'Tournament Pass', description: 'All matches, all teams, full tournament' },
  scout_pass: { amount: 19900, label: 'Scout Pass', description: 'Professional-grade real-time analytics' },
}

export interface EntitlementWithAmount extends Entitlement {
  amount_paid_cents: number
}

export interface UpgradeQuote {
  targetPass: EntitlementType
  targetPriceCents: number
  creditCents: number
  netPriceCents: number
  creditSources: { type: EntitlementType; count: number; totalCents: number }[]
}

export function computeUpgradeCredit(
  entitlements: EntitlementWithAmount[],
  targetPass: EntitlementType,
): UpgradeQuote {
  const now = new Date().toISOString()
  const active = entitlements.filter(e => e.valid_until > now)

  const targetRank = TIER_HIERARCHY[targetPass]
  const targetPriceCents = PASS_PRICES[targetPass].amount

  const creditablePasses = active.filter(
    e => TIER_HIERARCHY[e.entitlement_type] < targetRank,
  )

  const byType = new Map<EntitlementType, { count: number; totalCents: number }>()
  let totalCredit = 0

  for (const e of creditablePasses) {
    const entry = byType.get(e.entitlement_type) ?? { count: 0, totalCents: 0 }
    entry.count += 1
    entry.totalCents += e.amount_paid_cents
    totalCredit += e.amount_paid_cents
    byType.set(e.entitlement_type, entry)
  }

  const creditCents = Math.min(totalCredit, targetPriceCents)
  const netPriceCents = Math.max(0, targetPriceCents - creditCents)

  const creditSources = Array.from(byType.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    totalCents: data.totalCents,
  }))

  return { targetPass, targetPriceCents, creditCents, netPriceCents, creditSources }
}

export interface UpsellTrigger {
  condition: string
  message: string
  targetPass: EntitlementType
}

export function getUpsellTriggers(entitlements: EntitlementWithAmount[]): UpsellTrigger[] {
  const now = new Date().toISOString()
  const active = entitlements.filter(e => e.valid_until > now)
  const tier = getHighestTier(active)
  const triggers: UpsellTrigger[] = []

  const matchPassCount = active.filter(e => e.entitlement_type === 'match_pass').length
  const teamPassCount = active.filter(e => e.entitlement_type === 'team_pass').length
  const matchSpendCents = active
    .filter(e => e.entitlement_type === 'match_pass')
    .reduce((s, e) => s + e.amount_paid_cents, 0)
  const teamSpendCents = active
    .filter(e => e.entitlement_type === 'team_pass')
    .reduce((s, e) => s + e.amount_paid_cents, 0)

  if (matchPassCount >= 5 && tier !== 'tournament_pass' && tier !== 'scout_pass') {
    const spent = (matchSpendCents / 100).toFixed(2)
    triggers.push({
      condition: 'match_pass_count_5',
      message: `You've spent $${spent} on match passes. Tournament Pass = ALL matches for $39.99`,
      targetPass: 'tournament_pass',
    })
  }

  if (teamPassCount >= 4 && tier !== 'tournament_pass' && tier !== 'scout_pass') {
    const spent = (teamSpendCents / 100).toFixed(2)
    triggers.push({
      condition: 'team_pass_count_4',
      message: `You've spent $${spent} on team passes. Tournament Pass = ALL teams for $39.99`,
      targetPass: 'tournament_pass',
    })
  }

  if (tier === 'tournament_pass') {
    triggers.push({
      condition: 'tournament_holder_upsell',
      message: 'Want real-time predictions? Scout Pass: live win probability, tactical shifts, AI alerts — $199',
      targetPass: 'scout_pass',
    })
  }

  return triggers
}
