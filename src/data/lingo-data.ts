import type { LingoCountry, LingoPlayer, LingoTermsData } from '@/types/lingo'
import countriesJson from './lingo-countries.json'
import playersJson from './lingo-players.json'
import termsJson from './lingo-terms.json'

export const lingoCountries: LingoCountry[] = countriesJson as LingoCountry[]
export const lingoPlayers: LingoPlayer[] = playersJson as LingoPlayer[]
export const lingoTermsData: LingoTermsData = termsJson as unknown as LingoTermsData

export function getLingoCountryBySlug(slug: string): LingoCountry | undefined {
  return lingoCountries.find((c) => c.id === slug)
}

export function getLingoPlayerBySlug(slug: string): LingoPlayer | undefined {
  return lingoPlayers.find((p) => p.id === slug)
}

export function getLingoPlayersByCountry(countryId: string): LingoPlayer[] {
  return lingoPlayers.filter((p) => p.country === countryId)
}

export function getLingoCountriesByRegion(region: string): LingoCountry[] {
  return lingoCountries.filter((c) => c.region === region)
}

export function getAllLingoRegions(): string[] {
  return [...new Set(lingoCountries.map((c) => c.region))].sort()
}

export function getLingoDifficultyLabel(rating: number): string {
  if (rating <= 2) return 'Easy'
  if (rating <= 3) return 'Medium'
  return 'Hard'
}
