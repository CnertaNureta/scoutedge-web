/**
 * tests/e2e/_helpers/test-ids.ts
 *
 * 按真实 src/components/ 目录结构组织。
 * 这是测试与 UI 的契约层——迁移时**绝不**许删 testid。
 *
 * 23 个组件目录映射：
 *   home-magazine/ ──→ HOME_MAGAZINE
 *   live-match/    ──→ LIVE_MATCH
 *   predict/       ──→ PREDICT (ML 预测 UI)
 *   odds/          ──→ ODDS (Polymarket / 庄家)
 *   team/          ──→ TEAM
 *   player/        ──→ PLAYER
 *   signals/       ──→ SIGNALS
 *   formations/    ──→ FORMATIONS
 *   compare/       ──→ COMPARE
 *   pk-battle/     ──→ PK_BATTLE
 *   fan-card/      ──→ FAN_CARD
 *   quiz/          ──→ QUIZ
 *   chat/          ──→ CHAT
 *   layout/        ──→ NAV
 */
export const TEST_IDS = {
  // ──────────────────────────────────────────────
  // layout/ — 全站布局
  // ──────────────────────────────────────────────
  navBar: 'nav-bar',
  navLogo: 'nav-logo',
  navLinkMatches: 'nav-link-matches',
  navLinkTeams: 'nav-link-teams',
  navLinkPredictions: 'nav-link-predictions',
  navLinkPowerRankings: 'nav-link-power-rankings',
  navLinkBracket: 'nav-link-bracket',
  navLinkLeaderboard: 'nav-link-leaderboard',
  localeSwitcher: 'locale-switcher',
  userMenu: 'user-menu',
  logoutButton: 'logout-button',

  // ──────────────────────────────────────────────
  // home-magazine/ — 杂志式首页
  // (HeroA / HeroLiveCard / HeroLiveTicker / MagazineHomePage /
  //  MoreModules / NextMatch / TopContenders)
  // ──────────────────────────────────────────────
  homeMagazine: 'home-magazine',
  heroA: 'hero-a',
  heroLiveCard: 'hero-live-card',
  heroLiveTicker: 'hero-live-ticker',
  nextMatch: 'next-match',
  topContenders: 'top-contenders',
  moreModules: 'more-modules',

  // ──────────────────────────────────────────────
  // live-match/ — 比赛进行中
  // (LiveLeaderboard / LiveMatchHeader / LiveMatchStats /
  //  MatchCommentSection / MatchInteractionHub / MatchPollWidget /
  //  MatchReactionBar)
  // ──────────────────────────────────────────────
  liveMatchHeader: 'live-match-header',
  liveMatchStats: 'live-match-stats',
  liveLeaderboard: 'live-leaderboard',
  matchInteractionHub: 'match-interaction-hub',
  matchCommentSection: 'match-comment-section',
  matchPollWidget: 'match-poll-widget',
  matchReactionBar: 'match-reaction-bar',
  liveIndicator: 'live-indicator',
  scoreUpdateTimestamp: 'score-update-timestamp',

  // ──────────────────────────────────────────────
  // 通用 match 元素（出现在多个 surface）
  // ──────────────────────────────────────────────
  matchCard: 'match-card',
  matchScore: 'match-score',
  matchHomeTeam: 'match-home-team',
  matchAwayTeam: 'match-away-team',
  matchStatus: 'match-status', // scheduled / live / completed / postponed / cancelled
  matchKickoff: 'match-kickoff',
  matchVenue: 'match-venue',

  // ──────────────────────────────────────────────
  // predict/ — ML 预测
  // ──────────────────────────────────────────────
  predictionWidget: 'prediction-widget',
  predictionHomeWinProb: 'prediction-home-win-prob',
  predictionDrawProb: 'prediction-draw-prob',
  predictionAwayWinProb: 'prediction-away-win-prob',
  predictionConfidence: 'prediction-confidence',
  predictionRecommendedPick: 'prediction-recommended-pick',
  predictionGoalsForecast: 'prediction-goals-forecast', // predicted_home/away_goals

  // ──────────────────────────────────────────────
  // odds/ — 三方综合（如果 UI 把 ML + Polymarket + 庄家三层放一起）
  // ──────────────────────────────────────────────
  oddsWidget: 'odds-widget',
  oddsRowMl: 'odds-row-ml',
  oddsRowPolymarket: 'odds-row-polymarket',
  oddsRowSportsbook: 'odds-row-sportsbook',
  oddsRowSynthesis: 'odds-row-synthesis',
  oddsTable: 'odds-table',
  oddsRow: 'odds-row',
  oddsLastUpdated: 'odds-last-updated',
  oddsRefreshButton: 'odds-refresh-button',

  // ──────────────────────────────────────────────
  // team/ — 球队详情
  // ──────────────────────────────────────────────
  teamCard: 'team-card',
  teamStats: 'team-stats',
  teamElo: 'team-elo-rating',           // teams.elo_rating
  teamEloRank: 'team-elo-rank',         // teams.elo_rank
  teamFifaRanking: 'team-fifa-ranking',
  teamGroupCode: 'team-group-code',
  teamXgFor: 'team-xg-for',             // team_stats.expected_goals_for
  teamXgAgainst: 'team-xg-against',     // team_stats.expected_goals_against
  teamPossession: 'team-possession-pct',
  teamPowerScore: 'team-power-score',

  // Power rankings page（最接近"ELO 排名"）
  powerRankingsTable: 'power-rankings-table',
  powerRankingsRow: 'power-rankings-row',
  powerRankingsSortButton: 'power-rankings-sort-button',

  // ──────────────────────────────────────────────
  // player/ — 球员
  // ──────────────────────────────────────────────
  playerCard: 'player-card',
  playerFitnessStatus: 'player-fitness-status', // green/amber/red/unknown
  playerSentimentScore: 'player-sentiment-score',

  // ──────────────────────────────────────────────
  // signals/ — injury/transfer/form 信号
  // ──────────────────────────────────────────────
  signalsList: 'signals-list',
  signalItem: 'signal-item',
  signalImpactHigh: 'signal-impact-high',

  // ──────────────────────────────────────────────
  // standings / qualification
  // ──────────────────────────────────────────────
  standingsTable: 'standings-table',
  standingsRow: 'standings-row',
  qualificationStatus: 'qualification-status', // pending/qualified/best_third_place/eliminated

  // ──────────────────────────────────────────────
  // pk-battle/ quiz/ fan-card/ — 用户互动
  // ──────────────────────────────────────────────
  pkBattleWidget: 'pk-battle-widget',
  quizWidget: 'quiz-widget',
  fanCard: 'fan-card',

  // ──────────────────────────────────────────────
  // Auth (src/app/auth/ — locale 之外)
  // ──────────────────────────────────────────────
  loginForm: 'login-form',
  loginEmail: 'login-email-input',
  loginPassword: 'login-password-input',
  loginSubmit: 'login-submit-button',
  loginError: 'login-error',
} as const;
