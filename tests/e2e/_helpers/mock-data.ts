/**
 * tests/e2e/_helpers/mock-data.ts
 *
 * 与真实 ScoutEdge Supabase schema 对齐：
 *   - teams (uuid id, slug, elo_rating, elo_rank, group_code, confederation, fifa_ranking)
 *   - matches (kickoff_utc, match_status enum: scheduled/live/completed/postponed/cancelled)
 *   - predictions (home_win_prob, draw_prob, away_win_prob, recommended_pick, confidence_score)
 *   - team_stats (季级 xG 在这里，不在 matches)
 *   - standings (qualification_status)
 *
 * 改了真实 schema 要同步改这里。
 */

// 用固定 UUID 方便测试断言
const UUID = {
  brazil: '00000000-0000-0000-0001-000000000001',
  argentina: '00000000-0000-0000-0001-000000000002',
  france: '00000000-0000-0000-0001-000000000003',
  england: '00000000-0000-0000-0001-000000000004',
  spain: '00000000-0000-0000-0001-000000000005',
  match001: '00000000-0000-0000-0002-000000000001',
  match002: '00000000-0000-0000-0002-000000000002',
  match003: '00000000-0000-0000-0002-000000000003',
} as const;

export const MOCK_TEAMS = [
  {
    id: UUID.brazil,
    slug: 'brazil',
    name: 'Brazil',
    short_name: 'BRA',
    flag: '🇧🇷',
    group_code: 'G',
    confederation: 'CONMEBOL',
    fifa_ranking: 5,
    elo_rating: 2050,
    elo_rank: 1,
    coach_name: 'Dorival Júnior',
    archetype_match: 'samba-flair',
    key_insight: null,
    seo_article: null,
  },
  {
    id: UUID.argentina,
    slug: 'argentina',
    name: 'Argentina',
    short_name: 'ARG',
    flag: '🇦🇷',
    group_code: 'C',
    confederation: 'CONMEBOL',
    fifa_ranking: 1,
    elo_rating: 2030,
    elo_rank: 2,
    coach_name: 'Lionel Scaloni',
    archetype_match: 'champions',
    key_insight: null,
    seo_article: null,
  },
  {
    id: UUID.france,
    slug: 'france',
    name: 'France',
    short_name: 'FRA',
    flag: '🇫🇷',
    group_code: 'F',
    confederation: 'UEFA',
    fifa_ranking: 2,
    elo_rating: 2010,
    elo_rank: 3,
    coach_name: 'Didier Deschamps',
    archetype_match: null,
    key_insight: null,
    seo_article: null,
  },
  {
    id: UUID.england,
    slug: 'england',
    name: 'England',
    short_name: 'ENG',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    group_code: 'D',
    confederation: 'UEFA',
    fifa_ranking: 4,
    elo_rating: 1995,
    elo_rank: 4,
    coach_name: 'Thomas Tuchel',
    archetype_match: null,
    key_insight: null,
    seo_article: null,
  },
  {
    id: UUID.spain,
    slug: 'spain',
    name: 'Spain',
    short_name: 'ESP',
    flag: '🇪🇸',
    group_code: 'E',
    confederation: 'UEFA',
    fifa_ranking: 3,
    elo_rating: 1980,
    elo_rank: 5,
    coach_name: 'Luis de la Fuente',
    archetype_match: null,
    key_insight: null,
    seo_article: null,
  },
];

export const MOCK_MATCHES = [
  {
    id: UUID.match001,
    competition_code: 'FIFA_WC_2026',
    stage: 'group',
    round: 1,
    group_code: 'G',
    matchday: 1,
    home_team_id: UUID.brazil,
    away_team_id: UUID.argentina,
    home_placeholder_slug: null,
    away_placeholder_slug: null,
    venue: 'AT&T Stadium',
    city: 'Arlington',
    kickoff_utc: '2026-06-15T20:00:00Z',
    match_status: 'scheduled',
    home_score: null,
    away_score: null,
    home_penalty_score: null,
    away_penalty_score: null,
  },
  {
    id: UUID.match002,
    competition_code: 'FIFA_WC_2026',
    stage: 'group',
    round: 1,
    group_code: 'F',
    matchday: 1,
    home_team_id: UUID.france,
    away_team_id: UUID.england,
    home_placeholder_slug: null,
    away_placeholder_slug: null,
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
    kickoff_utc: '2026-05-12T15:00:00Z',
    match_status: 'live',
    home_score: 1,
    away_score: 0,
    home_penalty_score: null,
    away_penalty_score: null,
  },
  {
    id: UUID.match003,
    competition_code: 'FIFA_WC_2026',
    stage: 'group',
    round: 1,
    group_code: 'E',
    matchday: 1,
    home_team_id: UUID.spain,
    away_team_id: UUID.brazil,
    home_placeholder_slug: null,
    away_placeholder_slug: null,
    venue: 'SoFi Stadium',
    city: 'Inglewood',
    kickoff_utc: '2026-05-10T18:00:00Z',
    match_status: 'completed',
    home_score: 2,
    away_score: 2,
    home_penalty_score: null,
    away_penalty_score: null,
  },
];

export const MOCK_PREDICTIONS = [
  {
    match_id: UUID.match001,
    prediction_type: 'match_outcome',
    home_win_prob: 0.42,
    draw_prob: 0.28,
    away_win_prob: 0.30,
    predicted_home_goals: 1.6,
    predicted_away_goals: 1.2,
    confidence_score: 0.82,
    recommended_pick: 'home',
    model_version: '1.0',
    generated_at: '2026-05-12T10:00:00Z',
  },
];

// 季级 xG，按 team_stats schema
export const MOCK_TEAM_STATS = [
  {
    team_id: UUID.brazil,
    competition_code: 'FIFA_WC_2026',
    season_year: 2026,
    stat_scope: 'pre_tournament',
    as_of_date: '2026-05-01',
    matches_played: 10,
    wins: 7,
    draws: 2,
    losses: 1,
    goals_for: 22,
    goals_against: 6,
    goal_difference: 16,
    clean_sheets: 5,
    expected_goals_for: 18.4,
    expected_goals_against: 7.2,
    possession_pct: 58.3,
    pass_completion_pct: 87.2,
    shots_per_match: 14.5,
    points: 23,
    power_score: 89,
  },
];

export const MOCK_STANDINGS = [
  {
    competition_code: 'FIFA_WC_2026',
    stage: 'group',
    group_code: 'G',
    team_id: UUID.brazil,
    ranking: 1,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
    qualification_status: 'pending',
    snapshot_at: '2026-05-12T00:00:00Z',
  },
];

// Polymarket 是外部数据源，schema 不一定有专门表——根据你实际 fetch 处的 shape 改
export const MOCK_POLYMARKET_ODDS = [
  {
    market_id: 'pm-bra-arg-home',
    match_id: UUID.match001,
    outcome: 'home_win',
    price: 0.45,
    volume_24h: 125000,
    last_updated: '2026-05-12T10:30:00Z',
  },
  {
    market_id: 'pm-bra-arg-draw',
    match_id: UUID.match001,
    outcome: 'draw',
    price: 0.25,
    volume_24h: 80000,
    last_updated: '2026-05-12T10:30:00Z',
  },
  {
    market_id: 'pm-bra-arg-away',
    match_id: UUID.match001,
    outcome: 'away_win',
    price: 0.30,
    volume_24h: 95000,
    last_updated: '2026-05-12T10:30:00Z',
  },
];

// 暴露 UUID 给测试用
export { UUID };
