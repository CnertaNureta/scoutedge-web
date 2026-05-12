/**
 * tests/e2e/_helpers/mock-data.ts
 *
 * 测试 fixture 数据。形状基于 ScoutEdge 的 Supabase schema。
 *
 * ⚠️ 改了真实 schema 后要同步改这里——否则 mock 会和真实后端漂移。
 * TODO: 把 types 从 supabase gen 出来的文件 import 进来，强制对齐。
 */

export const MOCK_TEAMS = [
  { id: 'br', name: 'Brazil', short_name: 'BRA', elo_rating: 2050, fbref_id: 'br-1' },
  { id: 'ar', name: 'Argentina', short_name: 'ARG', elo_rating: 2030, fbref_id: 'ar-1' },
  { id: 'fr', name: 'France', short_name: 'FRA', elo_rating: 2010, fbref_id: 'fr-1' },
  { id: 'en', name: 'England', short_name: 'ENG', elo_rating: 1995, fbref_id: 'en-1' },
  { id: 'es', name: 'Spain', short_name: 'ESP', elo_rating: 1980, fbref_id: 'es-1' },
];

export const MOCK_MATCHES = [
  {
    id: 'match-001',
    home_team_id: 'br',
    away_team_id: 'ar',
    kickoff_at: '2026-06-15T20:00:00Z',
    status: 'upcoming',
    home_score: null,
    away_score: null,
    home_xg: null,
    away_xg: null,
  },
  {
    id: 'match-002',
    home_team_id: 'fr',
    away_team_id: 'en',
    kickoff_at: '2026-05-12T15:00:00Z', // live
    status: 'live',
    home_score: 1,
    away_score: 0,
    home_xg: 1.4,
    away_xg: 0.8,
  },
  {
    id: 'match-003',
    home_team_id: 'es',
    away_team_id: 'br',
    kickoff_at: '2026-05-10T18:00:00Z', // finished
    status: 'finished',
    home_score: 2,
    away_score: 2,
    home_xg: 1.9,
    away_xg: 2.1,
  },
];

// Triple-layer probability synthesis
export const MOCK_PROBABILITIES = {
  'match-001': {
    match_id: 'match-001',
    ml_model: { home_win: 0.42, draw: 0.28, away_win: 0.30 },
    polymarket: { home_win: 0.45, draw: 0.25, away_win: 0.30 },
    sportsbook: { home_win: 0.44, draw: 0.27, away_win: 0.29 },
    synthesis: { home_win: 0.44, draw: 0.27, away_win: 0.29, confidence: 0.82 },
    updated_at: '2026-05-12T10:00:00Z',
  },
};

// Polymarket-style odds (cents on the dollar, 0-100)
export const MOCK_POLYMARKET_ODDS = [
  {
    market_id: 'pm-match-001-home',
    match_id: 'match-001',
    outcome: 'home_win',
    price: 0.45,
    volume_24h: 125000,
    last_updated: '2026-05-12T10:30:00Z',
  },
  {
    market_id: 'pm-match-001-draw',
    match_id: 'match-001',
    outcome: 'draw',
    price: 0.25,
    volume_24h: 80000,
    last_updated: '2026-05-12T10:30:00Z',
  },
  {
    market_id: 'pm-match-001-away',
    match_id: 'match-001',
    outcome: 'away_win',
    price: 0.30,
    volume_24h: 95000,
    last_updated: '2026-05-12T10:30:00Z',
  },
];

// Football Four Factors (从 FBref 算出来的)
export const MOCK_FOUR_FACTORS = {
  br: {
    team_id: 'br',
    shot_quality: 0.18,     // xG per shot
    finishing: 0.12,        // actual - expected goals
    possession_value: 0.55, // weighted possession by zone
    defensive_solidity: 0.78, // 1 - opp_xG_per_match / league_avg
  },
};
