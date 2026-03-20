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
