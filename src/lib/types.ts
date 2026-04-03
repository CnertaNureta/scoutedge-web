export interface TeamMeta {
  slug: string
  name: string
  flag: string
  group: string
  confederation: string
  isPlayoff?: boolean
}

export interface Team extends TeamMeta {
  fifaRanking: number
  coachName: string
  chemistry: number
  familiarity: number
  stability: number
  morale: number
  archetypeMatch: string
  keyInsight: string
  seoArticle: string
}

export interface PlayerSignal {
  id?: string
  type: 'training' | 'quote' | 'data'
  category?: 'fitness' | 'morale' | 'tactical'
  text: string
  sourceType?: 'player_profile' | 'social_post' | 'derived_rule' | 'seo_article'
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed'
  confidence?: number
  happenedAt?: string
}

export interface PlayerSignalRecord {
  id: string
  player_key: string
  player_slug: string
  player_name: string
  team_slug: string
  category: 'fitness' | 'morale' | 'tactical'
  type: PlayerSignal['type']
  source_type: NonNullable<PlayerSignal['sourceType']>
  source_key: string
  summary: string
  evidence: string
  sentiment: NonNullable<PlayerSignal['sentiment']>
  confidence: number
  weight: number
  happened_at: string
  metadata?: Record<string, unknown>
}

export interface PlayerIntelRecord {
  player_key: string
  player_slug: string
  player_name: string
  team_slug: string
  fitness_status: 'green' | 'amber' | 'red'
  fitness_note: string
  morale_score: number
  morale_label: 'positive' | 'neutral' | 'negative'
  tactical_risk: 'low' | 'medium' | 'high'
  tactical_note: string
  selection_risk: 'low' | 'medium' | 'high'
  selection_note: string
  recent_signals: PlayerSignal[]
  source_signal_ids: string[]
  signal_count: number
  last_signal_at: string
  last_updated: string
  metadata?: Record<string, unknown>
}

export interface Player {
  slug: string
  name: string
  teamSlug: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  number: number
  age: number
  club: string
  caps: number
  goals: number
  assists: number
  rating: number
  fitnessStatus: 'green' | 'amber' | 'red'
  fitnessNote: string
  sentimentScore: number
  sentimentLabel: string
  seoArticle: string
  imageUrl?: string
  cutoutUrl?: string
  recentSignals?: PlayerSignal[]
  tacticalRisk?: PlayerIntelRecord['tactical_risk']
  tacticalNote?: string
  selectionRisk?: PlayerIntelRecord['selection_risk']
  selectionNote?: string
  intelLastUpdated?: string
  intelSignalCount?: number
}

export interface MatchFixture {
  homeTeamSlug: string
  awayTeamSlug: string
  round: string
  group: string
  venue: string
  city: string
  kickoffUtc: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

export interface IconicMoment {
  year: number
  description: string
}

export interface WorldCupHistory {
  name: string
  totalAppearances: number
  bestFinish: string
  bestFinishYear: number[]
  firstAppearance: number
  titlesWon: number
  iconicMoments: IconicMoment[]
  allTimeRecord: { played: number; won: number; drawn: number; lost: number }
}

export interface VenueClimate {
  juneAvgHighC: number
  juneAvgLowC: number
  julyAvgHighC: number
  julyAvgLowC: number
  humidityPercent: number
  rainyDaysPerMonth: number
  description: string
}

export interface Venue {
  id: string
  name: string
  city: string
  metro: string
  state: string
  country: string
  countryCode: string
  capacity: number
  yearOpened: number
  surface: string
  roofType: string
  coordinates: { lat: number; lng: number }
  altitudeMeters: number
  timezone: string
  utcOffset: number
  climate: VenueClimate
  hostingRounds: string[]
  notes: string
}

export interface TeamTimezone {
  timezone: string
  utcOffset: number
  adjustmentHours: number
  notes: string
}

export interface BookmakerOdds {
  bookmaker: string
  decimalOdds: number
  impliedProbability: number
}

export interface ValueBet {
  ourProbability: number
  marketProbability: number
  edge: number
  bestOdds: number
  bestBookmaker: string
  signalStrength: 'strong' | 'moderate' | 'weak'
}

export interface MarketIntelData {
  tournamentOdds: BookmakerOdds[]
  averageOdds: number
  impliedProbability: number
  movement: 'shortening' | 'drifting' | 'stable'
  valueBet: ValueBet | null
}
