import type { MatchFixture } from '@/lib/types'

/**
 * World Cup 2026 knockout-stage fixtures.
 * 32 matches: Round of 32 (16) + Round of 16 (8) + QF (4) + SF (2) + 3rd Place (1) + Final (1)
 *
 * Teams are TBD — shown as group position placeholders (e.g. "1A" = Winner of Group A).
 * Venues follow FIFA's announced allocation.
 */
export const KNOCKOUT_FIXTURES: MatchFixture[] = [
  // ─────────────────────────────────────────────
  // ROUND OF 32 — June 28–July 2, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-1a', awayTeamSlug: 'tbd-3c', round: 'Round of 32', group: '', venue: 'MetLife Stadium', city: 'East Rutherford', kickoffUtc: '2026-06-28T18:00:00Z', homeWinProb: 0.60, drawProb: 0.20, awayWinProb: 0.20 },
  { homeTeamSlug: 'tbd-2a', awayTeamSlug: 'tbd-2c', round: 'Round of 32', group: '', venue: 'AT&T Stadium', city: 'Arlington', kickoffUtc: '2026-06-28T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-1b', awayTeamSlug: 'tbd-3d', round: 'Round of 32', group: '', venue: 'Hard Rock Stadium', city: 'Miami', kickoffUtc: '2026-06-28T00:00:00Z', homeWinProb: 0.58, drawProb: 0.22, awayWinProb: 0.20 },
  { homeTeamSlug: 'tbd-2b', awayTeamSlug: 'tbd-2d', round: 'Round of 32', group: '', venue: 'Lincoln Financial Field', city: 'Philadelphia', kickoffUtc: '2026-06-29T03:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-1c', awayTeamSlug: 'tbd-3e', round: 'Round of 32', group: '', venue: 'Lumen Field', city: 'Seattle', kickoffUtc: '2026-06-29T18:00:00Z', homeWinProb: 0.55, drawProb: 0.23, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-2e', awayTeamSlug: 'tbd-2g', round: 'Round of 32', group: '', venue: 'SoFi Stadium', city: 'Inglewood', kickoffUtc: '2026-06-29T21:00:00Z', homeWinProb: 0.42, drawProb: 0.28, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-1d', awayTeamSlug: 'tbd-3f', round: 'Round of 32', group: '', venue: 'Gillette Stadium', city: 'Foxborough', kickoffUtc: '2026-06-30T00:00:00Z', homeWinProb: 0.57, drawProb: 0.22, awayWinProb: 0.21 },
  { homeTeamSlug: 'tbd-2f', awayTeamSlug: 'tbd-2h', round: 'Round of 32', group: '', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', kickoffUtc: '2026-06-30T03:00:00Z', homeWinProb: 0.43, drawProb: 0.27, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-1e', awayTeamSlug: 'tbd-3a', round: 'Round of 32', group: '', venue: 'Estadio Azteca', city: 'Mexico City', kickoffUtc: '2026-06-30T18:00:00Z', homeWinProb: 0.56, drawProb: 0.23, awayWinProb: 0.21 },
  { homeTeamSlug: 'tbd-1f', awayTeamSlug: 'tbd-3b', round: 'Round of 32', group: '', venue: 'NRG Stadium', city: 'Houston', kickoffUtc: '2026-06-30T21:00:00Z', homeWinProb: 0.54, drawProb: 0.24, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-1g', awayTeamSlug: 'tbd-3h', round: 'Round of 32', group: '', venue: 'BMO Field', city: 'Toronto', kickoffUtc: '2026-07-01T00:00:00Z', homeWinProb: 0.55, drawProb: 0.23, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-2i', awayTeamSlug: 'tbd-2k', round: 'Round of 32', group: '', venue: 'Arrowhead Stadium', city: 'Kansas City', kickoffUtc: '2026-07-01T03:00:00Z', homeWinProb: 0.44, drawProb: 0.26, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-1h', awayTeamSlug: 'tbd-3i', round: 'Round of 32', group: '', venue: 'Levi\'s Stadium', city: 'Santa Clara', kickoffUtc: '2026-07-01T18:00:00Z', homeWinProb: 0.56, drawProb: 0.22, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-1i', awayTeamSlug: 'tbd-3j', round: 'Round of 32', group: '', venue: 'BC Place', city: 'Vancouver', kickoffUtc: '2026-07-01T21:00:00Z', homeWinProb: 0.54, drawProb: 0.24, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-1j', awayTeamSlug: 'tbd-3k', round: 'Round of 32', group: '', venue: 'Estadio BBVA', city: 'Monterrey', kickoffUtc: '2026-07-02T00:00:00Z', homeWinProb: 0.55, drawProb: 0.23, awayWinProb: 0.22 },
  { homeTeamSlug: 'tbd-1k', awayTeamSlug: 'tbd-3l', round: 'Round of 32', group: '', venue: 'Estadio Akron', city: 'Guadalajara', kickoffUtc: '2026-07-02T03:00:00Z', homeWinProb: 0.53, drawProb: 0.25, awayWinProb: 0.22 },

  // ─────────────────────────────────────────────
  // ROUND OF 16 — July 4–7, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-r32-w1', awayTeamSlug: 'tbd-r32-w2', round: 'Round of 16', group: '', venue: 'MetLife Stadium', city: 'East Rutherford', kickoffUtc: '2026-07-04T18:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w3', awayTeamSlug: 'tbd-r32-w4', round: 'Round of 16', group: '', venue: 'AT&T Stadium', city: 'Arlington', kickoffUtc: '2026-07-04T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w5', awayTeamSlug: 'tbd-r32-w6', round: 'Round of 16', group: '', venue: 'Hard Rock Stadium', city: 'Miami', kickoffUtc: '2026-07-05T00:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w7', awayTeamSlug: 'tbd-r32-w8', round: 'Round of 16', group: '', venue: 'SoFi Stadium', city: 'Inglewood', kickoffUtc: '2026-07-05T03:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w9', awayTeamSlug: 'tbd-r32-w10', round: 'Round of 16', group: '', venue: 'Lumen Field', city: 'Seattle', kickoffUtc: '2026-07-06T18:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w11', awayTeamSlug: 'tbd-r32-w12', round: 'Round of 16', group: '', venue: 'Estadio Azteca', city: 'Mexico City', kickoffUtc: '2026-07-06T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w13', awayTeamSlug: 'tbd-r32-w14', round: 'Round of 16', group: '', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', kickoffUtc: '2026-07-07T00:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-r32-w15', awayTeamSlug: 'tbd-r32-w16', round: 'Round of 16', group: '', venue: 'Lincoln Financial Field', city: 'Philadelphia', kickoffUtc: '2026-07-07T03:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // QUARTERFINALS — July 10–11, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-qf-1', awayTeamSlug: 'tbd-qf-2', round: 'Quarterfinal', group: '', venue: 'SoFi Stadium', city: 'Inglewood', kickoffUtc: '2026-07-10T18:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-qf-3', awayTeamSlug: 'tbd-qf-4', round: 'Quarterfinal', group: '', venue: 'MetLife Stadium', city: 'East Rutherford', kickoffUtc: '2026-07-10T22:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-qf-5', awayTeamSlug: 'tbd-qf-6', round: 'Quarterfinal', group: '', venue: 'AT&T Stadium', city: 'Arlington', kickoffUtc: '2026-07-11T18:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-qf-7', awayTeamSlug: 'tbd-qf-8', round: 'Quarterfinal', group: '', venue: 'Hard Rock Stadium', city: 'Miami', kickoffUtc: '2026-07-11T22:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // SEMIFINALS — July 14–15, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-sf-1', awayTeamSlug: 'tbd-sf-2', round: 'Semifinal', group: '', venue: 'MetLife Stadium', city: 'East Rutherford', kickoffUtc: '2026-07-14T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
  { homeTeamSlug: 'tbd-sf-3', awayTeamSlug: 'tbd-sf-4', round: 'Semifinal', group: '', venue: 'AT&T Stadium', city: 'Arlington', kickoffUtc: '2026-07-15T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // THIRD-PLACE PLAY-OFF — July 18, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-3rd-1', awayTeamSlug: 'tbd-3rd-2', round: 'Third Place', group: '', venue: 'Hard Rock Stadium', city: 'Miami', kickoffUtc: '2026-07-18T21:00:00Z', homeWinProb: 0.40, drawProb: 0.30, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // FINAL — July 19, 2026
  // ─────────────────────────────────────────────
  { homeTeamSlug: 'tbd-final-1', awayTeamSlug: 'tbd-final-2', round: 'Final', group: '', venue: 'MetLife Stadium', city: 'East Rutherford', kickoffUtc: '2026-07-19T21:00:00Z', homeWinProb: 0.45, drawProb: 0.25, awayWinProb: 0.30 },
]

/** Human-readable labels for TBD knockout-stage teams */
export function getKnockoutTeamLabel(slug: string): string {
  if (slug.startsWith('tbd-final-')) return slug === 'tbd-final-1' ? 'SF Winner 1' : 'SF Winner 2'
  if (slug.startsWith('tbd-3rd-')) return slug === 'tbd-3rd-1' ? 'SF Loser 1' : 'SF Loser 2'
  if (slug.startsWith('tbd-sf-')) {
    const n = parseInt(slug.split('-')[2])
    return `QF Winner ${n <= 2 ? n : n - 2}`
  }
  if (slug.startsWith('tbd-qf-')) {
    const n = parseInt(slug.split('-')[2])
    return `R16 Winner ${Math.ceil(n / 2)}`
  }
  if (slug.startsWith('tbd-r32-w')) {
    const n = slug.replace('tbd-r32-w', '')
    return `R32 Winner ${n}`
  }
  // Group position placeholders like 'tbd-1a', 'tbd-2b', 'tbd-3c'
  const groupMatch = slug.match(/^tbd-(\d)([a-l])$/)
  if (groupMatch) {
    const pos = groupMatch[1] === '1' ? 'Winner' : groupMatch[1] === '2' ? 'Runner-up' : '3rd Place'
    return `${pos} Group ${groupMatch[2].toUpperCase()}`
  }
  return 'TBD'
}

/** All rounds in order */
export const KNOCKOUT_ROUNDS = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Third Place', 'Final'] as const
