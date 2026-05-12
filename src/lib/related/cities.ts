import { getAllCities, getCitiesByCountry, type HostCity } from '@/data/cities-data'

/**
 * Returns other host cities to recommend from a given city's detail page.
 *
 * Strategy:
 *  1. Prefer cities in the same country (US / MX / CA), preserving the
 *     order in `cities-data.ts` (which roughly mirrors editorial priority).
 *  2. If there are not enough same-country cities to fill `n` slots, top
 *     up from the remaining host cities so the section is always populated.
 */
export function getNearbyCities(city: HostCity, n = 3): HostCity[] {
  const sameCountry = getCitiesByCountry(city.countryCode).filter(
    (c) => c.slug !== city.slug
  )

  if (sameCountry.length >= n) return sameCountry.slice(0, n)

  const usedSlugs = new Set([city.slug, ...sameCountry.map((c) => c.slug)])
  const fallback = getAllCities().filter((c) => !usedSlugs.has(c.slug))

  return [...sameCountry, ...fallback].slice(0, n)
}
