/**
 * tests/e2e/_helpers/test-ids.ts
 *
 * 所有 data-testid 的单一来源。
 *
 * 用法：
 *   - 组件里：<div data-testid={TEST_IDS.matchScore}>...</div>
 *   - 测试里：page.getByTestId(TEST_IDS.matchScore)
 *
 * 为什么不用 class 或 text selector：
 *   - class 会随设计变（migration 经常改 Tailwind class）
 *   - text 会随 i18n 或 copy 变
 *   - data-testid 是稳定的契约层
 *
 * 给 implementer subagent 的规则：
 *   迁移组件时，新 UI 的关键元素必须沿用旧组件的 testId。
 */
export const TEST_IDS = {
  // ──────────────────────────────────────────────
  // Layout / nav
  // ──────────────────────────────────────────────
  navBar: 'nav-bar',
  navMatches: 'nav-link-matches',
  navTeams: 'nav-link-teams',
  navElo: 'nav-link-elo',
  navOdds: 'nav-link-odds',
  navLogin: 'nav-link-login',
  userMenu: 'user-menu',
  logoutButton: 'logout-button',

  // ──────────────────────────────────────────────
  // Match detail
  // ──────────────────────────────────────────────
  matchCard: 'match-card',
  matchScore: 'match-score',
  matchHomeTeam: 'match-home-team',
  matchAwayTeam: 'match-away-team',
  matchXg: 'match-xg',
  matchStatus: 'match-status', // upcoming / live / finished

  // ──────────────────────────────────────────────
  // Probability widget (triple-layer)
  // ──────────────────────────────────────────────
  probabilityWidget: 'probability-widget',
  probabilityMl: 'probability-ml',           // ML model 预测
  probabilityPolymarket: 'probability-polymarket',  // Polymarket 众包
  probabilitySportsbook: 'probability-sportsbook',  // 庄家共识
  probabilitySynthesis: 'probability-synthesis',    // 三层综合

  // ──────────────────────────────────────────────
  // ELO ranking
  // ──────────────────────────────────────────────
  eloTable: 'elo-table',
  eloRow: 'elo-row',           // 用 getByTestId(...).filter({ hasText: 'Brazil' })
  eloRank: 'elo-rank',
  eloRating: 'elo-rating',
  eloSortButton: 'elo-sort-button',

  // ──────────────────────────────────────────────
  // Odds table (Polymarket)
  // ──────────────────────────────────────────────
  oddsTable: 'odds-table',
  oddsRow: 'odds-row',
  oddsLastUpdated: 'odds-last-updated',
  oddsRefreshButton: 'odds-refresh-button',

  // ──────────────────────────────────────────────
  // Team
  // ──────────────────────────────────────────────
  teamCard: 'team-card',
  teamStats: 'team-stats',
  teamFourFactors: 'team-four-factors', // Football Four Factors

  // ──────────────────────────────────────────────
  // Auth
  // ──────────────────────────────────────────────
  loginForm: 'login-form',
  loginEmail: 'login-email-input',
  loginPassword: 'login-password-input',
  loginSubmit: 'login-submit-button',
  loginError: 'login-error',

  // ──────────────────────────────────────────────
  // Live updates
  // ──────────────────────────────────────────────
  liveIndicator: 'live-indicator', // 比赛进行中的指示器
  scoreUpdateTimestamp: 'score-update-timestamp',
} as const;
