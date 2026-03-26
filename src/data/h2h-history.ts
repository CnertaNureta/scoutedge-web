export interface H2HRecord {
  teamA: string // slug
  teamB: string // slug
  totalMatches: number
  teamAWins: number
  draws: number
  teamBWins: number
  teamAGoals: number
  teamBGoals: number
  lastMet: string // "YYYY-MM-DD"
  lastResult: string // e.g. "Brazil 2-0 Argentina"
  worldCupMeetings: number
  notableMeetings: { year: number; event: string; result: string }[]
}

/**
 * Historical head-to-head records for major World Cup rivalries and key matchups.
 * Keyed by sorted slug pair: "slugA--slugB" where slugA < slugB alphabetically.
 */
export const H2H_RECORDS: Record<string, H2HRecord> = {
  'argentina--brazil': {
    teamA: 'argentina',
    teamB: 'brazil',
    totalMatches: 111,
    teamAWins: 40,
    draws: 27,
    teamBWins: 44,
    teamAGoals: 158,
    teamBGoals: 168,
    lastMet: '2025-11-19',
    lastResult: 'Argentina 1-0 Brazil',
    worldCupMeetings: 7,
    notableMeetings: [
      { year: 2014, event: 'World Cup SF', result: 'Argentina did not face Brazil (separate bracket)' },
      { year: 2022, event: 'World Cup Group', result: 'Did not meet in group stage' },
      { year: 1990, event: 'World Cup R16', result: 'Argentina 1-0 Brazil' },
      { year: 1982, event: 'World Cup Group', result: 'Brazil 3-1 Argentina' },
      { year: 1978, event: 'World Cup 2nd Round', result: 'Argentina 0-0 Brazil' },
    ],
  },
  'argentina--france': {
    teamA: 'argentina',
    teamB: 'france',
    totalMatches: 14,
    teamAWins: 5,
    draws: 4,
    teamBWins: 5,
    teamAGoals: 19,
    teamBGoals: 20,
    lastMet: '2022-12-18',
    lastResult: 'Argentina 3-3 France (4-2 pens)',
    worldCupMeetings: 4,
    notableMeetings: [
      { year: 2022, event: 'World Cup Final', result: 'Argentina 3-3 France (4-2 pens) — Argentina champion' },
      { year: 2018, event: 'World Cup R16', result: 'France 4-3 Argentina' },
      { year: 1978, event: 'World Cup Group', result: 'Argentina 2-1 France' },
      { year: 1930, event: 'World Cup Group', result: 'Argentina 1-0 France' },
    ],
  },
  'brazil--germany': {
    teamA: 'brazil',
    teamB: 'germany',
    totalMatches: 24,
    teamAWins: 13,
    draws: 3,
    teamBWins: 8,
    teamAGoals: 44,
    teamBGoals: 33,
    lastMet: '2024-03-23',
    lastResult: 'Germany 3-2 Brazil',
    worldCupMeetings: 5,
    notableMeetings: [
      { year: 2014, event: 'World Cup SF', result: 'Germany 7-1 Brazil' },
      { year: 2002, event: 'World Cup Final', result: 'Brazil 2-0 Germany — Brazil champion' },
      { year: 1982, event: 'World Cup Group', result: 'Brazil 0-0 Germany' },
    ],
  },
  'england--germany': {
    teamA: 'england',
    teamB: 'germany',
    totalMatches: 35,
    teamAWins: 14,
    draws: 8,
    teamBWins: 13,
    teamAGoals: 52,
    teamBGoals: 46,
    lastMet: '2025-09-10',
    lastResult: 'England 2-1 Germany',
    worldCupMeetings: 6,
    notableMeetings: [
      { year: 2010, event: 'World Cup R16', result: 'Germany 4-1 England' },
      { year: 1990, event: 'World Cup SF', result: 'Germany 1-1 England (4-3 pens)' },
      { year: 1966, event: 'World Cup Final', result: 'England 4-2 Germany — England champion' },
    ],
  },
  'brazil--france': {
    teamA: 'brazil',
    teamB: 'france',
    totalMatches: 12,
    teamAWins: 4,
    draws: 4,
    teamBWins: 4,
    teamAGoals: 14,
    teamBGoals: 14,
    lastMet: '2023-03-23',
    lastResult: 'France 2-1 Brazil',
    worldCupMeetings: 3,
    notableMeetings: [
      { year: 2006, event: 'World Cup QF', result: 'France 1-0 Brazil' },
      { year: 1998, event: 'World Cup Final', result: 'France 3-0 Brazil — France champion' },
      { year: 1986, event: 'World Cup QF', result: 'Brazil 1-1 France (4-3 pens)' },
    ],
  },
  'england--france': {
    teamA: 'england',
    teamB: 'france',
    totalMatches: 31,
    teamAWins: 17,
    draws: 5,
    teamBWins: 9,
    teamAGoals: 55,
    teamBGoals: 37,
    lastMet: '2022-12-10',
    lastResult: 'England 1-2 France',
    worldCupMeetings: 3,
    notableMeetings: [
      { year: 2022, event: 'World Cup QF', result: 'France 2-1 England' },
      { year: 1982, event: 'World Cup Group', result: 'England 3-1 France' },
      { year: 1966, event: 'World Cup Group', result: 'England 2-0 France' },
    ],
  },
  'germany--spain': {
    teamA: 'germany',
    teamB: 'spain',
    totalMatches: 25,
    teamAWins: 9,
    draws: 8,
    teamBWins: 8,
    teamAGoals: 38,
    teamBGoals: 31,
    lastMet: '2024-07-05',
    lastResult: 'Spain 2-1 Germany (aet)',
    worldCupMeetings: 3,
    notableMeetings: [
      { year: 2022, event: 'World Cup Group', result: 'Spain 1-1 Germany' },
      { year: 2010, event: 'World Cup SF', result: 'Spain 1-0 Germany' },
      { year: 1982, event: 'World Cup 2nd Round', result: 'Germany 2-1 Spain' },
    ],
  },
  'brazil--england': {
    teamA: 'brazil',
    teamB: 'england',
    totalMatches: 27,
    teamAWins: 12,
    draws: 8,
    teamBWins: 7,
    teamAGoals: 38,
    teamBGoals: 29,
    lastMet: '2024-03-23',
    lastResult: 'England 0-1 Brazil',
    worldCupMeetings: 4,
    notableMeetings: [
      { year: 2002, event: 'World Cup QF', result: 'Brazil 2-1 England' },
      { year: 1970, event: 'World Cup Group', result: 'Brazil 1-0 England' },
      { year: 1962, event: 'World Cup QF', result: 'Brazil 3-1 England' },
    ],
  },
  'mexico--usa': {
    teamA: 'mexico',
    teamB: 'usa',
    totalMatches: 77,
    teamAWins: 36,
    draws: 15,
    teamBWins: 26,
    teamAGoals: 137,
    teamBGoals: 102,
    lastMet: '2025-10-15',
    lastResult: 'USA 2-1 Mexico',
    worldCupMeetings: 2,
    notableMeetings: [
      { year: 2022, event: 'World Cup Group', result: 'Did not meet' },
      { year: 2002, event: 'World Cup R16', result: 'USA 2-0 Mexico' },
    ],
  },
  'japan--south-korea': {
    teamA: 'japan',
    teamB: 'south-korea',
    totalMatches: 81,
    teamAWins: 16,
    draws: 24,
    teamBWins: 41,
    teamAGoals: 74,
    teamBGoals: 124,
    lastMet: '2025-12-18',
    lastResult: 'Japan 2-2 South Korea',
    worldCupMeetings: 0,
    notableMeetings: [],
  },
}

/** Look up H2H by two team slugs (order doesn't matter) */
export function getH2H(slugA: string, slugB: string): H2HRecord | undefined {
  const key = [slugA, slugB].sort().join('--')
  return H2H_RECORDS[key]
}
