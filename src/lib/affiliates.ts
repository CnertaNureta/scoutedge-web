/**
 * Affiliate partner configuration for ScoutEdge betting CTAs.
 * Geo-aware, compliance-first. Placeholder affiliate IDs until approval.
 */

export interface AffiliatePartner {
  id: 'bet365' | 'fanduel' | 'draftkings' | 'betway-ca'
  name: string
  logo: string
  urlTemplate: string
  ctaText: string
  color: string
  allowedGeoRegions: string[] // ISO 3166-1 alpha-2
  blockedUsStates: string[]
  responsibleGamblingUrl?: string
  responsibleGamblingText?: string
}

export type AffiliatePlacement =
  | 'match-card-inline'
  | 'match-card-footer'
  | 'predictions-banner'
  | 'market-intel'

export const AFFILIATES: AffiliatePartner[] = [
  {
    id: 'bet365',
    name: 'Bet365',
    logo: '/affiliates/bet365.svg',
    urlTemplate:
      'https://www.bet365.com/?affiliate=PLACEHOLDER&utm_source=scoutedge&utm_medium={placement}&utm_campaign={matchId}',
    ctaText: 'Bet on {favorite}',
    color: '#1e7e34',
    allowedGeoRegions: ['GB', 'AU', 'CA', 'NZ', 'IE', 'DE', 'ES', 'IT', 'NL', 'IN'],
    blockedUsStates: [],
    responsibleGamblingUrl: 'https://www.begambleaware.org',
    responsibleGamblingText: 'Gamble Responsibly. BeGambleAware.org',
  },
  {
    id: 'fanduel',
    name: 'FanDuel',
    logo: '/affiliates/fanduel.svg',
    urlTemplate:
      'https://www.fanduel.com/join?pid=affiliates&utm_source=scoutedge&utm_medium={placement}&utm_campaign={matchId}',
    ctaText: 'Bet {favorite} on FanDuel',
    color: '#1a73e8',
    allowedGeoRegions: ['US'],
    blockedUsStates: ['UT', 'HI', 'AL', 'AK', 'ID', 'CA'],
  },
  {
    id: 'draftkings',
    name: 'DraftKings',
    logo: '/affiliates/draftkings.svg',
    urlTemplate:
      'https://sportsbook.draftkings.com/promos?utm_source=scoutedge&utm_medium={placement}&utm_campaign={matchId}',
    ctaText: 'See {favorite} Odds at DraftKings',
    color: '#53d337',
    allowedGeoRegions: ['US'],
    blockedUsStates: ['UT', 'HI', 'AL', 'AK', 'ID', 'CA'],
  },
  {
    id: 'betway-ca',
    name: 'Betway',
    logo: '/affiliates/betway.svg',
    urlTemplate:
      'https://www.betway.com/en-ca/?affiliate=PLACEHOLDER&utm_source=scoutedge&utm_medium={placement}&utm_campaign={matchId}',
    ctaText: 'Bet on {favorite} at Betway',
    color: '#00a826',
    allowedGeoRegions: ['CA'],
    blockedUsStates: [],
    responsibleGamblingUrl: 'https://www.responsiblegambling.org',
    responsibleGamblingText: 'Play responsibly.',
  },
]

/**
 * Filter partners by country/state. Returns empty array if no partners available.
 */
export function getEligiblePartners(
  country: string | null,
  usState: string | null
): AffiliatePartner[] {
  if (!country) return []
  return AFFILIATES.filter(
    (p) =>
      p.allowedGeoRegions.includes(country) &&
      !(usState && p.blockedUsStates.includes(usState))
  )
}

/**
 * Build the final affiliate URL from a partner's template.
 */
export function buildAffiliateUrl(
  partner: AffiliatePartner,
  placement: AffiliatePlacement,
  matchId: string
): string {
  return partner.urlTemplate
    .replace('{placement}', placement)
    .replace('{matchId}', matchId)
}

/**
 * Build CTA text with the favorite team name substituted.
 */
export function buildCtaText(partner: AffiliatePartner, favorite: string): string {
  return partner.ctaText.replace('{favorite}', favorite)
}
