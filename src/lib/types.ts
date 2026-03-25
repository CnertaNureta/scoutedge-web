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
  type: 'training' | 'quote' | 'data'
  text: string
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
