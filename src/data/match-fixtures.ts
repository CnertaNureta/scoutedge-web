import type { MatchFixture } from '../lib/types'

/**
 * World Cup 2026 group-stage fixtures.
 * 12 groups × 6 matches = 72 total group-stage games.
 * Each group plays 3 match days in a round-robin format.
 */
export const MATCH_FIXTURES: MatchFixture[] = [
  // ─────────────────────────────────────────────
  // GROUP A — Mexico, South Africa, South Korea, Denmark
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "mexico", awayTeamSlug: "south-africa", round: "Match Day 1", group: "A", venue: "Estadio Azteca", city: "Mexico City", kickoffUtc: "2026-06-11T18:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  { homeTeamSlug: "south-korea", awayTeamSlug: "denmark", round: "Match Day 1", group: "A", venue: "AT&T Stadium", city: "Arlington", kickoffUtc: "2026-06-11T21:00:00Z", homeWinProb: 0.35, drawProb: 0.30, awayWinProb: 0.35 },
  // Match Day 2
  { homeTeamSlug: "mexico", awayTeamSlug: "south-korea", round: "Match Day 2", group: "A", venue: "Estadio Azteca", city: "Mexico City", kickoffUtc: "2026-06-15T18:00:00Z", homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27 },
  { homeTeamSlug: "denmark", awayTeamSlug: "south-africa", round: "Match Day 2", group: "A", venue: "NRG Stadium", city: "Houston", kickoffUtc: "2026-06-15T21:00:00Z", homeWinProb: 0.50, drawProb: 0.25, awayWinProb: 0.25 },
  // Match Day 3
  { homeTeamSlug: "denmark", awayTeamSlug: "mexico", round: "Match Day 3", group: "A", venue: "NRG Stadium", city: "Houston", kickoffUtc: "2026-06-23T22:00:00Z", homeWinProb: 0.35, drawProb: 0.30, awayWinProb: 0.35 },
  { homeTeamSlug: "south-africa", awayTeamSlug: "south-korea", round: "Match Day 3", group: "A", venue: "AT&T Stadium", city: "Arlington", kickoffUtc: "2026-06-23T22:00:00Z", homeWinProb: 0.25, drawProb: 0.30, awayWinProb: 0.45 },

  // ─────────────────────────────────────────────
  // GROUP B — Switzerland, Canada, Qatar, Italy
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "switzerland", awayTeamSlug: "canada", round: "Match Day 1", group: "B", venue: "BC Place", city: "Vancouver", kickoffUtc: "2026-06-12T00:00:00Z", homeWinProb: 0.40, drawProb: 0.30, awayWinProb: 0.30 },
  { homeTeamSlug: "qatar", awayTeamSlug: "italy", round: "Match Day 1", group: "B", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-12T03:00:00Z", homeWinProb: 0.15, drawProb: 0.25, awayWinProb: 0.60 },
  // Match Day 2
  { homeTeamSlug: "switzerland", awayTeamSlug: "qatar", round: "Match Day 2", group: "B", venue: "Lincoln Financial Field", city: "Philadelphia", kickoffUtc: "2026-06-16T00:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  { homeTeamSlug: "italy", awayTeamSlug: "canada", round: "Match Day 2", group: "B", venue: "BMO Field", city: "Toronto", kickoffUtc: "2026-06-16T03:00:00Z", homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27 },
  // Match Day 3
  { homeTeamSlug: "italy", awayTeamSlug: "switzerland", round: "Match Day 3", group: "B", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-24T00:00:00Z", homeWinProb: 0.42, drawProb: 0.30, awayWinProb: 0.28 },
  { homeTeamSlug: "canada", awayTeamSlug: "qatar", round: "Match Day 3", group: "B", venue: "BC Place", city: "Vancouver", kickoffUtc: "2026-06-24T00:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },

  // ─────────────────────────────────────────────
  // GROUP C — Morocco, Brazil, Scotland, Haiti
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "morocco", awayTeamSlug: "brazil", round: "Match Day 1", group: "C", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-12T18:00:00Z", homeWinProb: 0.28, drawProb: 0.28, awayWinProb: 0.44 },
  { homeTeamSlug: "scotland", awayTeamSlug: "haiti", round: "Match Day 1", group: "C", venue: "Gillette Stadium", city: "Foxborough", kickoffUtc: "2026-06-12T21:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  // Match Day 2
  { homeTeamSlug: "morocco", awayTeamSlug: "scotland", round: "Match Day 2", group: "C", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-16T18:00:00Z", homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27 },
  { homeTeamSlug: "haiti", awayTeamSlug: "brazil", round: "Match Day 2", group: "C", venue: "GEHA Field at Arrowhead Stadium", city: "Kansas City", kickoffUtc: "2026-06-16T21:00:00Z", homeWinProb: 0.10, drawProb: 0.15, awayWinProb: 0.75 },
  // Match Day 3
  { homeTeamSlug: "haiti", awayTeamSlug: "morocco", round: "Match Day 3", group: "C", venue: "GEHA Field at Arrowhead Stadium", city: "Kansas City", kickoffUtc: "2026-06-24T22:00:00Z", homeWinProb: 0.15, drawProb: 0.25, awayWinProb: 0.60 },
  { homeTeamSlug: "brazil", awayTeamSlug: "scotland", round: "Match Day 3", group: "C", venue: "Gillette Stadium", city: "Foxborough", kickoffUtc: "2026-06-24T22:00:00Z", homeWinProb: 0.60, drawProb: 0.22, awayWinProb: 0.18 },

  // ─────────────────────────────────────────────
  // GROUP D — USA, Paraguay, Australia, Turkey
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "usa", awayTeamSlug: "paraguay", round: "Match Day 1", group: "D", venue: "SoFi Stadium", city: "Inglewood", kickoffUtc: "2026-06-13T00:00:00Z", homeWinProb: 0.50, drawProb: 0.27, awayWinProb: 0.23 },
  { homeTeamSlug: "australia", awayTeamSlug: "turkey", round: "Match Day 1", group: "D", venue: "Levi's Stadium", city: "Santa Clara", kickoffUtc: "2026-06-13T03:00:00Z", homeWinProb: 0.30, drawProb: 0.30, awayWinProb: 0.40 },
  // Match Day 2
  { homeTeamSlug: "usa", awayTeamSlug: "australia", round: "Match Day 2", group: "D", venue: "SoFi Stadium", city: "Inglewood", kickoffUtc: "2026-06-17T00:00:00Z", homeWinProb: 0.48, drawProb: 0.27, awayWinProb: 0.25 },
  { homeTeamSlug: "turkey", awayTeamSlug: "paraguay", round: "Match Day 2", group: "D", venue: "Mercedes-Benz Stadium", city: "Atlanta", kickoffUtc: "2026-06-17T03:00:00Z", homeWinProb: 0.42, drawProb: 0.30, awayWinProb: 0.28 },
  // Match Day 3
  { homeTeamSlug: "turkey", awayTeamSlug: "usa", round: "Match Day 3", group: "D", venue: "Mercedes-Benz Stadium", city: "Atlanta", kickoffUtc: "2026-06-25T00:00:00Z", homeWinProb: 0.30, drawProb: 0.30, awayWinProb: 0.40 },
  { homeTeamSlug: "paraguay", awayTeamSlug: "australia", round: "Match Day 3", group: "D", venue: "Levi's Stadium", city: "Santa Clara", kickoffUtc: "2026-06-25T00:00:00Z", homeWinProb: 0.40, drawProb: 0.30, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // GROUP E — Germany, Ivory Coast, Ecuador, Curaçao
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "germany", awayTeamSlug: "ivory-coast", round: "Match Day 1", group: "E", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-13T18:00:00Z", homeWinProb: 0.50, drawProb: 0.25, awayWinProb: 0.25 },
  { homeTeamSlug: "ecuador", awayTeamSlug: "curacao", round: "Match Day 1", group: "E", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-13T21:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  // Match Day 2
  { homeTeamSlug: "germany", awayTeamSlug: "ecuador", round: "Match Day 2", group: "E", venue: "Lincoln Financial Field", city: "Philadelphia", kickoffUtc: "2026-06-17T18:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  { homeTeamSlug: "curacao", awayTeamSlug: "ivory-coast", round: "Match Day 2", group: "E", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-17T21:00:00Z", homeWinProb: 0.18, drawProb: 0.25, awayWinProb: 0.57 },
  // Match Day 3
  { homeTeamSlug: "curacao", awayTeamSlug: "germany", round: "Match Day 3", group: "E", venue: "Lumen Field", city: "Seattle", kickoffUtc: "2026-06-25T22:00:00Z", homeWinProb: 0.08, drawProb: 0.15, awayWinProb: 0.77 },
  { homeTeamSlug: "ivory-coast", awayTeamSlug: "ecuador", round: "Match Day 3", group: "E", venue: "Lincoln Financial Field", city: "Philadelphia", kickoffUtc: "2026-06-25T22:00:00Z", homeWinProb: 0.40, drawProb: 0.30, awayWinProb: 0.30 },

  // ─────────────────────────────────────────────
  // GROUP F — Netherlands, Japan, Tunisia, Ukraine
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "netherlands", awayTeamSlug: "japan", round: "Match Day 1", group: "F", venue: "Lumen Field", city: "Seattle", kickoffUtc: "2026-06-14T00:00:00Z", homeWinProb: 0.42, drawProb: 0.28, awayWinProb: 0.30 },
  { homeTeamSlug: "tunisia", awayTeamSlug: "ukraine", round: "Match Day 1", group: "F", venue: "BC Place", city: "Vancouver", kickoffUtc: "2026-06-14T03:00:00Z", homeWinProb: 0.30, drawProb: 0.32, awayWinProb: 0.38 },
  // Match Day 2
  { homeTeamSlug: "netherlands", awayTeamSlug: "tunisia", round: "Match Day 2", group: "F", venue: "AT&T Stadium", city: "Arlington", kickoffUtc: "2026-06-18T00:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  { homeTeamSlug: "ukraine", awayTeamSlug: "japan", round: "Match Day 2", group: "F", venue: "Lumen Field", city: "Seattle", kickoffUtc: "2026-06-18T03:00:00Z", homeWinProb: 0.30, drawProb: 0.30, awayWinProb: 0.40 },
  // Match Day 3
  { homeTeamSlug: "ukraine", awayTeamSlug: "netherlands", round: "Match Day 3", group: "F", venue: "AT&T Stadium", city: "Arlington", kickoffUtc: "2026-06-26T00:00:00Z", homeWinProb: 0.22, drawProb: 0.30, awayWinProb: 0.48 },
  { homeTeamSlug: "japan", awayTeamSlug: "tunisia", round: "Match Day 3", group: "F", venue: "BC Place", city: "Vancouver", kickoffUtc: "2026-06-26T00:00:00Z", homeWinProb: 0.50, drawProb: 0.27, awayWinProb: 0.23 },

  // ─────────────────────────────────────────────
  // GROUP G — Portugal, Iran, Belgium, Egypt
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "portugal", awayTeamSlug: "iran", round: "Match Day 1", group: "G", venue: "SoFi Stadium", city: "Inglewood", kickoffUtc: "2026-06-14T18:00:00Z", homeWinProb: 0.62, drawProb: 0.20, awayWinProb: 0.18 },
  { homeTeamSlug: "belgium", awayTeamSlug: "egypt", round: "Match Day 1", group: "G", venue: "Estadio BBVA", city: "Monterrey", kickoffUtc: "2026-06-14T21:00:00Z", homeWinProb: 0.50, drawProb: 0.25, awayWinProb: 0.25 },
  // Match Day 2
  { homeTeamSlug: "portugal", awayTeamSlug: "belgium", round: "Match Day 2", group: "G", venue: "SoFi Stadium", city: "Inglewood", kickoffUtc: "2026-06-18T18:00:00Z", homeWinProb: 0.40, drawProb: 0.30, awayWinProb: 0.30 },
  { homeTeamSlug: "egypt", awayTeamSlug: "iran", round: "Match Day 2", group: "G", venue: "Estadio BBVA", city: "Monterrey", kickoffUtc: "2026-06-18T21:00:00Z", homeWinProb: 0.42, drawProb: 0.30, awayWinProb: 0.28 },
  // Match Day 3
  { homeTeamSlug: "egypt", awayTeamSlug: "portugal", round: "Match Day 3", group: "G", venue: "Estadio Akron", city: "Guadalajara", kickoffUtc: "2026-06-26T22:00:00Z", homeWinProb: 0.18, drawProb: 0.25, awayWinProb: 0.57 },
  { homeTeamSlug: "iran", awayTeamSlug: "belgium", round: "Match Day 3", group: "G", venue: "Estadio BBVA", city: "Monterrey", kickoffUtc: "2026-06-26T22:00:00Z", homeWinProb: 0.18, drawProb: 0.27, awayWinProb: 0.55 },

  // ─────────────────────────────────────────────
  // GROUP H — Spain, Cabo Verde, Saudi Arabia, Serbia
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "spain", awayTeamSlug: "cabo-verde", round: "Match Day 1", group: "H", venue: "Mercedes-Benz Stadium", city: "Atlanta", kickoffUtc: "2026-06-15T00:00:00Z", homeWinProb: 0.72, drawProb: 0.15, awayWinProb: 0.13 },
  { homeTeamSlug: "saudi-arabia", awayTeamSlug: "serbia", round: "Match Day 1", group: "H", venue: "Estadio Akron", city: "Guadalajara", kickoffUtc: "2026-06-15T03:00:00Z", homeWinProb: 0.28, drawProb: 0.30, awayWinProb: 0.42 },
  // Match Day 2
  { homeTeamSlug: "spain", awayTeamSlug: "saudi-arabia", round: "Match Day 2", group: "H", venue: "GEHA Field at Arrowhead Stadium", city: "Kansas City", kickoffUtc: "2026-06-19T00:00:00Z", homeWinProb: 0.65, drawProb: 0.20, awayWinProb: 0.15 },
  { homeTeamSlug: "serbia", awayTeamSlug: "cabo-verde", round: "Match Day 2", group: "H", venue: "Estadio Akron", city: "Guadalajara", kickoffUtc: "2026-06-19T03:00:00Z", homeWinProb: 0.52, drawProb: 0.25, awayWinProb: 0.23 },
  // Match Day 3
  { homeTeamSlug: "serbia", awayTeamSlug: "spain", round: "Match Day 3", group: "H", venue: "GEHA Field at Arrowhead Stadium", city: "Kansas City", kickoffUtc: "2026-06-27T00:00:00Z", homeWinProb: 0.22, drawProb: 0.28, awayWinProb: 0.50 },
  { homeTeamSlug: "cabo-verde", awayTeamSlug: "saudi-arabia", round: "Match Day 3", group: "H", venue: "Estadio Azteca", city: "Mexico City", kickoffUtc: "2026-06-27T00:00:00Z", homeWinProb: 0.30, drawProb: 0.32, awayWinProb: 0.38 },

  // ─────────────────────────────────────────────
  // GROUP I — France, Senegal, Norway, TBD Playoff I
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "france", awayTeamSlug: "senegal", round: "Match Day 1", group: "I", venue: "Gillette Stadium", city: "Foxborough", kickoffUtc: "2026-06-11T23:00:00Z", homeWinProb: 0.52, drawProb: 0.25, awayWinProb: 0.23 },
  { homeTeamSlug: "norway", awayTeamSlug: "tbd-playoff-i", round: "Match Day 1", group: "I", venue: "BMO Field", city: "Toronto", kickoffUtc: "2026-06-12T02:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  // Match Day 2
  { homeTeamSlug: "france", awayTeamSlug: "norway", round: "Match Day 2", group: "I", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-19T18:00:00Z", homeWinProb: 0.50, drawProb: 0.28, awayWinProb: 0.22 },
  { homeTeamSlug: "tbd-playoff-i", awayTeamSlug: "senegal", round: "Match Day 2", group: "I", venue: "BMO Field", city: "Toronto", kickoffUtc: "2026-06-19T21:00:00Z", homeWinProb: 0.25, drawProb: 0.30, awayWinProb: 0.45 },
  // Match Day 3
  { homeTeamSlug: "tbd-playoff-i", awayTeamSlug: "france", round: "Match Day 3", group: "I", venue: "Gillette Stadium", city: "Foxborough", kickoffUtc: "2026-06-27T22:00:00Z", homeWinProb: 0.10, drawProb: 0.20, awayWinProb: 0.70 },
  { homeTeamSlug: "senegal", awayTeamSlug: "norway", round: "Match Day 3", group: "I", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-27T22:00:00Z", homeWinProb: 0.38, drawProb: 0.30, awayWinProb: 0.32 },

  // ─────────────────────────────────────────────
  // GROUP J — Argentina, Algeria, Austria, Jordan
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "argentina", awayTeamSlug: "algeria", round: "Match Day 1", group: "J", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-12T18:00:00Z", homeWinProb: 0.62, drawProb: 0.20, awayWinProb: 0.18 },
  { homeTeamSlug: "austria", awayTeamSlug: "jordan", round: "Match Day 1", group: "J", venue: "NRG Stadium", city: "Houston", kickoffUtc: "2026-06-12T21:00:00Z", homeWinProb: 0.50, drawProb: 0.27, awayWinProb: 0.23 },
  // Match Day 2
  { homeTeamSlug: "argentina", awayTeamSlug: "austria", round: "Match Day 2", group: "J", venue: "Hard Rock Stadium", city: "Miami", kickoffUtc: "2026-06-20T00:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  { homeTeamSlug: "jordan", awayTeamSlug: "algeria", round: "Match Day 2", group: "J", venue: "NRG Stadium", city: "Houston", kickoffUtc: "2026-06-20T03:00:00Z", homeWinProb: 0.30, drawProb: 0.32, awayWinProb: 0.38 },
  // Match Day 3
  { homeTeamSlug: "jordan", awayTeamSlug: "argentina", round: "Match Day 3", group: "J", venue: "AT&T Stadium", city: "Arlington", kickoffUtc: "2026-06-28T00:00:00Z", homeWinProb: 0.10, drawProb: 0.18, awayWinProb: 0.72 },
  { homeTeamSlug: "algeria", awayTeamSlug: "austria", round: "Match Day 3", group: "J", venue: "NRG Stadium", city: "Houston", kickoffUtc: "2026-06-28T00:00:00Z", homeWinProb: 0.35, drawProb: 0.30, awayWinProb: 0.35 },

  // ─────────────────────────────────────────────
  // GROUP K — Colombia, Cameroon, Uzbekistan, TBD Playoff K
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "colombia", awayTeamSlug: "cameroon", round: "Match Day 1", group: "K", venue: "Mercedes-Benz Stadium", city: "Atlanta", kickoffUtc: "2026-06-13T18:00:00Z", homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27 },
  { homeTeamSlug: "uzbekistan", awayTeamSlug: "tbd-playoff-k", round: "Match Day 1", group: "K", venue: "Levi's Stadium", city: "Santa Clara", kickoffUtc: "2026-06-13T21:00:00Z", homeWinProb: 0.42, drawProb: 0.30, awayWinProb: 0.28 },
  // Match Day 2
  { homeTeamSlug: "colombia", awayTeamSlug: "uzbekistan", round: "Match Day 2", group: "K", venue: "Estadio Azteca", city: "Mexico City", kickoffUtc: "2026-06-20T18:00:00Z", homeWinProb: 0.52, drawProb: 0.25, awayWinProb: 0.23 },
  { homeTeamSlug: "tbd-playoff-k", awayTeamSlug: "cameroon", round: "Match Day 2", group: "K", venue: "Levi's Stadium", city: "Santa Clara", kickoffUtc: "2026-06-20T21:00:00Z", homeWinProb: 0.22, drawProb: 0.28, awayWinProb: 0.50 },
  // Match Day 3
  { homeTeamSlug: "tbd-playoff-k", awayTeamSlug: "colombia", round: "Match Day 3", group: "K", venue: "Estadio Azteca", city: "Mexico City", kickoffUtc: "2026-06-28T22:00:00Z", homeWinProb: 0.15, drawProb: 0.22, awayWinProb: 0.63 },
  { homeTeamSlug: "cameroon", awayTeamSlug: "uzbekistan", round: "Match Day 3", group: "K", venue: "Mercedes-Benz Stadium", city: "Atlanta", kickoffUtc: "2026-06-28T22:00:00Z", homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27 },

  // ─────────────────────────────────────────────
  // GROUP L — England, Ghana, Croatia, Panama
  // ─────────────────────────────────────────────
  // Match Day 1
  { homeTeamSlug: "england", awayTeamSlug: "ghana", round: "Match Day 1", group: "L", venue: "Lincoln Financial Field", city: "Philadelphia", kickoffUtc: "2026-06-14T18:00:00Z", homeWinProb: 0.58, drawProb: 0.22, awayWinProb: 0.20 },
  { homeTeamSlug: "croatia", awayTeamSlug: "panama", round: "Match Day 1", group: "L", venue: "BMO Field", city: "Toronto", kickoffUtc: "2026-06-14T21:00:00Z", homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20 },
  // Match Day 2
  { homeTeamSlug: "england", awayTeamSlug: "croatia", round: "Match Day 2", group: "L", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-21T00:00:00Z", homeWinProb: 0.42, drawProb: 0.30, awayWinProb: 0.28 },
  { homeTeamSlug: "panama", awayTeamSlug: "ghana", round: "Match Day 2", group: "L", venue: "BMO Field", city: "Toronto", kickoffUtc: "2026-06-21T03:00:00Z", homeWinProb: 0.30, drawProb: 0.30, awayWinProb: 0.40 },
  // Match Day 3
  { homeTeamSlug: "panama", awayTeamSlug: "england", round: "Match Day 3", group: "L", venue: "Lincoln Financial Field", city: "Philadelphia", kickoffUtc: "2026-06-29T00:00:00Z", homeWinProb: 0.10, drawProb: 0.20, awayWinProb: 0.70 },
  { homeTeamSlug: "ghana", awayTeamSlug: "croatia", round: "Match Day 3", group: "L", venue: "MetLife Stadium", city: "East Rutherford", kickoffUtc: "2026-06-29T00:00:00Z", homeWinProb: 0.28, drawProb: 0.30, awayWinProb: 0.42 },
]
