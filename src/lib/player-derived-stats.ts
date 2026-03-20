import type { Player } from '@/lib/types'

export interface DerivedStats {
  pace: number
  shooting: number
  passing: number
  physical: number
  defense: number
  overall: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function computeDerivedStats(player: Player): DerivedStats {
  const ratingBase = player.rating * 10

  const ageFactor = player.age <= 24 ? 1.1
    : player.age <= 29 ? 1.0
    : player.age <= 33 ? 0.9
    : 0.8
  const fitnessFactor = player.fitnessStatus === 'green' ? 1.0
    : player.fitnessStatus === 'amber' ? 0.9
    : 0.75

  const positionPace: Record<string, number> = { FWD: 85, MID: 78, DEF: 68, GK: 55 }
  const positionDefense: Record<string, number> = { GK: 85, DEF: 82, MID: 65, FWD: 42 }

  const capsNorm = Math.min(player.caps, 120)

  const pace = clamp(
    Math.round((positionPace[player.position] ?? 72) * ageFactor * fitnessFactor + (ratingBase - 70) * 0.3),
    40, 99
  )

  const goalsPerCap = capsNorm > 0 ? player.goals / capsNorm : 0
  const shooting = clamp(
    Math.round(50 + goalsPerCap * 200 + (ratingBase - 70) * 0.4),
    40, 99
  )

  const assistsPerCap = capsNorm > 0 ? player.assists / capsNorm : 0
  const passing = clamp(
    Math.round(55 + assistsPerCap * 250 + (ratingBase - 70) * 0.35),
    40, 99
  )

  const physical = clamp(
    Math.round(70 * ageFactor * fitnessFactor + (ratingBase - 70) * 0.2),
    40, 99
  )

  const defense = clamp(
    Math.round((positionDefense[player.position] ?? 60) + (ratingBase - 70) * 0.25),
    40, 99
  )

  const overall = clamp(
    Math.round(ratingBase + (player.sentimentScore - 50) * 0.05),
    40, 99
  )

  return { pace, shooting, passing, physical, defense, overall }
}
