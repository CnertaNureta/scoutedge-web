# WorldCapIQ Core Football Schema

This document describes the core football fact-layer introduced for `ZON-6`.

## Design goals

- Preserve the current app's slug-first data contracts while introducing internal UUID primary keys.
- Support both current-state reads and historical/model snapshots.
- Keep write-path metadata consistent with reserved pipeline fields such as `source`, `updated_at`, `model_version`, and `facts_used`.
- Index the main read paths used by predictions, team pages, player pages, power rankings, and daily briefing surfaces.

## Table summary

### `teams`

- Purpose: canonical team dimension for all football facts.
- Key fields: `slug`, `name`, `flag`, `group_code`, `confederation`, `fifa_ranking`, `elo_rating`, `elo_rank`, `coach_name`, `archetype_match`, `key_insight`, `seo_article`.
- Reserved ingest fields: `source`, `source_external_id`, `facts_used`, `metadata`.
- Main indexes: `slug` unique, `group_code`, `confederation`, `fifa_ranking`, `elo_rank`, unique external ID by source.

### `players`

- Purpose: canonical player dimension tied to a team.
- Key fields: `team_id`, `slug`, `position`, `number`, `club`, `caps`, `goals`, `assists`, `rating`, `fitness_status`, `fitness_note`, `sentiment_score`, `sentiment_label`.
- Compatibility note: current frontend logic filters players by team and slug, so `(team_id, slug)` is unique and indexed.
- Main indexes: `team_id`, `(team_id, position)`, `slug`, unique external ID by source.

### `team_stats`

- Purpose: snapshot table for team-level quantitative stats used by dashboards and prediction inputs.
- Key fields: `team_id`, `competition_code`, `season_year`, `stat_scope`, `as_of_date`, `matches_played`, `wins`, `draws`, `losses`, `goals_for`, `goals_against`, `goal_difference`, `clean_sheets`, `expected_goals_for`, `expected_goals_against`, `possession_pct`, `pass_completion_pct`, `shots_per_match`, `points`, `power_score`.
- Pipeline fields: `source`, `model_version`, `facts_used`.
- Main indexes: `team_id + as_of_date`, `competition_code + season_year + stat_scope + as_of_date`.

### `matches`

- Purpose: canonical match fixture/result table.
- Key fields: `home_team_id` / `away_team_id` for resolved participants, `home_placeholder_slug` / `away_placeholder_slug` for unresolved bracket slots, plus `round`, `group_code`, `matchday`, `venue`, `city`, `kickoff_utc`, `match_status`, scores, and penalty scores.
- Pipeline fields: `source`, `source_match_id`, `model_version`, `facts_used`, `source_payload`.
- Compatibility note: includes `source_match_id` to carry external IDs from feeds like TheSportsDB while preserving room for enriched or inferred fixture facts. Knockout fixtures can keep canonical team foreign keys once known, but may temporarily use placeholder slugs such as `tbd-1a` or `tbd-r32-w1` before bracket participants resolve.
- Main indexes: `kickoff_utc`, `group_code + kickoff_utc`, `round + kickoff_utc`, home-team and away-team lookups, placeholder-participant lookups, status/time, unique fixture identity, and unique `(source, source_match_id)` when present.

### `standings`

- Purpose: snapshot standings table for group tables and best-third-place evaluation.
- Key fields: `group_code`, `team_id`, `ranking`, `played`, `wins`, `draws`, `losses`, `goals_for`, `goals_against`, `goal_difference`, `points`, `qualification_status`, `snapshot_at`.
- Main indexes: `group_code + snapshot_at + ranking`, `team_id + snapshot_at`.

### `head_to_head`

- Purpose: stored aggregate matchup history between two teams.
- Key fields: `team_a_id`, `team_b_id`, `total_matches`, win/draw counts, goals, `last_met_at`, `last_result`, `world_cup_meetings`, `notable_meetings`.
- Canonical pairing: enforced by a unique index on `least(team_a_id, team_b_id)` and `greatest(team_a_id, team_b_id)`.
- Main indexes: canonical pair unique index plus direct indexes on each team column.

### `predictions`

- Purpose: model outputs for match outcomes.
- Key fields: `match_id`, `prediction_type`, `home_win_prob`, `draw_prob`, `away_win_prob`, `predicted_home_goals`, `predicted_away_goals`, `confidence_score`, `recommended_pick`, `rationale_summary`, `generated_at`.
- Compatibility note: directly matches the current frontend need for home/draw/away probabilities.
- Main indexes: `match_id + generated_at`, `model_version + generated_at`.

### `team_chemistry`

- Purpose: dated chemistry snapshots aligned to the current WorldCapIQ power-score model.
- Key fields: `team_id`, `snapshot_date`, `chemistry`, `familiarity`, `stability`, `morale`, `chemistry_rank`, `rationale`.
- Compatibility note: supports the current weighted formula used in power rankings and compare utilities.
- Main indexes: `team_id + snapshot_date`, `snapshot_date + chemistry_rank`.

### `player_intel`

- Purpose: player-level intelligence snapshots for fitness, sentiment, and readiness.
- Key fields: `player_id`, `captured_at`, `fitness_status`, `fitness_note`, `sentiment_score`, `sentiment_label`, `availability_status`, `workload_note`, `analyst_note`, `recent_signals`, `last_signal_at`.
- Compatibility note: use `updated_at` as the stable `last_updated` field for downstream readers; `recent_signals` caches the latest supporting evidence payload and is constrained to an array of `{ type, text }` records where `type` is one of `training`, `quote`, or `data`.
- Main indexes: `player_id + captured_at`, `fitness_status + captured_at`, `last_signal_at`.

### `signals`

- Purpose: time-ordered intelligence feed for daily briefing and entity updates.
- Key fields: `signal_type`, `impact`, `headline`, `detail`, `signal_at`, optional `team_id`, `player_id`, `match_id`.
- Compatibility note: matches the current daily briefing shape of type, impact, headline, detail, and entity linkage, and constrains `signal_type` to the currently supported categories `injury`, `transfer`, `form`, `tactical`, and `sentiment`.
- Main indexes: `signal_at`, per-entity descending time indexes, `impact + signal_at`.

### `narratives`

- Purpose: structured AI/editorial content for team previews, group analysis, match previews, and player reports.
- Key fields: `cache_key`, `competition_code`, `content_type`, `slug`, `title`, `summary`, `source_date`, `match_key`, `home_team_slug`, `away_team_slug`, `team_slug`, `player_slug`, `fact_hash`, `body_markdown`, `body_html`, `schema_type`, `schema_payload`, optional `team_id`, `player_id`, `match_id`, `group_code`, `status`, `approved_at`, `published_at`.
- Compatibility note: supports tournament-wide content such as power rankings in addition to team/player/match/group scoped narratives, reserves the cache/status fields the later publishing pipeline expects so out-of-order merges do not break migrations, and keeps the narrative status vocabulary compatible across `draft`, `approved`, `published`, and `archived`.
- Main indexes: `slug` unique, `competition_code + content_type + published_at`, team/player/match/group lookup indexes, `status + published_at`.

## Compatibility views

- `team_profiles_current`
  - Purpose: expose one team-facing snapshot per `teams` row, enriched with the latest `team_chemistry` record so current consumers can read chemistry, familiarity, stability, and morale without assembling that join themselves.
  - Compatibility note: includes frontend-friendly camelCase aliases such as `group`, `isPlayoff`, `fifaRanking`, `coachName`, `archetypeMatch`, and `seoArticle` in addition to canonical snake_case columns, and coalesces nullable source fields to non-null defaults (`group -> TBD`, `fifaRanking -> 999`, chemistry metrics -> `50`, missing text fields -> `TBD` or empty string) so current team UIs keep their required shape.
- `player_profiles_current`
  - Purpose: expose one player-facing snapshot per `players` row, enriched with the latest `player_intel` record so current consumers can read the freshest fitness/sentiment/recent-signal payload alongside the canonical roster row.
  - Compatibility note: includes camelCase aliases such as `teamSlug`, `fitnessStatus`, `fitnessNote`, `sentimentScore`, `recentSignals`, `imageUrl`, and `cutoutUrl`, coalesces nullable roster/intel fields to non-null defaults such as `club -> Unknown club`, `rating -> 0`, `sentimentScore -> 50`, `sentimentLabel -> neutral`, and `recentSignals -> []`, and normalizes raw `unknown` fitness values to `amber` so the current UI contract stays within `green | amber | red`.
- `match_fixtures_current`
  - Purpose: expose one fixture-facing snapshot per `matches` row, resolving team slugs/names/flags from `teams`, preserving unresolved placeholder slugs, and attaching the latest `match_outcome` prediction record.
  - Compatibility note: includes camelCase aliases such as `homeTeamSlug`, `awayTeamSlug`, `group`, `kickoffUtc`, `homeWinProb`, `drawProb`, and `awayWinProb`, and coalesces missing knockout `group` values to `''`, missing venue/city fields to `TBD` labels, and missing prediction probabilities to a neutral `33/33/33` split so current fixture UIs still receive strings and numbers.
- `signal_feed_current`
  - Purpose: expose one signal-facing snapshot per `signals` row, resolving team context from `signals.team_id` or the linked player's team, and preserving player linkage for downstream reads.
  - Compatibility note: includes the daily-briefing-friendly aliases `type`, `signalAt`, `teamSlug`, `teamName`, `teamFlag`, `playerSlug`, `sourceUrl`, plus a `team` JSON object with `{ slug, name, flag }`. This team JSON payload mirrors the current daily-briefing team shape directly.
- `power_rankings_current`
  - Purpose: expose one ranked team-facing snapshot per team using the same composite score formula currently used by the power-rankings page.
  - Compatibility note: includes `powerScore`, `rank`, `tier`, and `movement` so the power-rankings surface can read a ready-made ranking table instead of recomputing the formula in app code.
- `group_standings_current`
  - Purpose: expose the latest standings snapshot per team within each competition/stage/group, enriched with team profile fields for group-table reads.
  - Compatibility note: includes frontend-friendly aliases such as `group`, `teamSlug`, `teamName`, `fifaRanking`, `qualificationStatus`, `snapshotAt`, and chemistry-related fields so group standings reads can stay thin.
- `head_to_head_current`
  - Purpose: expose one compare-facing snapshot per stored `head_to_head` pair, normalizing `teamA` and `teamB` into deterministic slug order even if the underlying aggregate row was written in the opposite order.
  - Compatibility note: includes `matchupKey` for the current static H2H record key plus `compareSlug` for the current compare route slug, alongside `teamASlug`, `teamBSlug`, `teamAWins`, `teamBWins`, `teamAGoals`, `teamBGoals`, `lastMet`, `lastResult`, `worldCupMeetings`, and `notableMeetings`.
- These views make the compatibility path explicit for existing football-fact reads in `src/lib/data-service.ts`, group pages, compare pages, prediction surfaces, the daily briefing, power rankings, head-to-head summaries, and future standings reads while keeping the write layer normalized and exposing the same frontend-friendly camelCase shape. Supplemental world-history and synthetic market-intel helpers still remain outside this schema for now.

## Consumer mapping

- `src/app/teams/[slug]/page.tsx`
  - Primary reads: `team_profiles_current`, `player_profiles_current`.
  - Required fields: `slug`, `name`, `group`, `flag`, `fifaRanking`, `coachName`, `chemistry`, `familiarity`, `stability`, `morale`, `archetypeMatch`, `keyInsight`, `seoArticle`, plus roster-facing player fields such as `teamSlug`, `fitnessStatus`, `recentSignals`, `imageUrl`, and `cutoutUrl`.
  - Still static: `WorldCupHistory` sections remain backed by `src/data/world-cup-history.json`.
- `src/app/teams/[slug]/players/[playerSlug]/page.tsx`
  - Primary reads: `player_profiles_current`, `team_profiles_current`.
  - Required fields: `teamSlug`, `name`, `position`, `club`, `caps`, `goals`, `assists`, `rating`, `fitnessStatus`, `fitnessNote`, `sentimentScore`, `sentimentLabel`, `recentSignals`, `seoArticle`, `imageUrl`, `cutoutUrl`.
- `src/app/groups/[group]/page.tsx`
  - Primary reads: `group_standings_current`, `match_fixtures_current`.
  - Required fields: `group`, `teamSlug`, `teamName`, `teamFlag`, `fifaRanking`, `confederation`, `chemistry`, `morale`, `qualificationStatus`, `kickoffUtc`, `homeTeamSlug`, `awayTeamSlug`, `homeWinProb`, `drawProb`, `awayWinProb`, `venue`, `city`.
- `src/app/power-rankings/page.tsx`
  - Primary reads: `power_rankings_current`.
  - Required fields: `rank`, `powerScore`, `tier`, `movement`, `slug`, `name`, `flag`, `group`, `fifaRanking`, `chemistry`.
- `src/app/compare/[matchup]/page.tsx`
  - Primary reads: `team_profiles_current`, `player_profiles_current`, `head_to_head_current`.
  - Required fields: `compareSlug`, `matchupKey`, `teamASlug`, `teamBSlug`, `teamAName`, `teamBName`, `teamAWins`, `teamBWins`, `teamAGoals`, `teamBGoals`, `lastMet`, `lastResult`, `worldCupMeetings`, `notableMeetings`.
  - Still static: `WorldCupHistory` and synthetic `MarketIntelData` sections remain backed by JSON/helpers outside this migration.
- `src/app/predictions/page.tsx`
  - Primary reads: `match_fixtures_current`, `team_profiles_current`.
  - Required fields: `homeTeamSlug`, `awayTeamSlug`, `homeTeamName`, `awayTeamName`, `homeFlag`, `awayFlag`, `group`, `round`, `kickoffUtc`, `homeWinProb`, `drawProb`, `awayWinProb`.
- `src/app/daily-briefing/page.tsx`
  - Primary reads: `signal_feed_current`, `team_profiles_current`, `player_profiles_current`.
  - Required fields: `type`, `impact`, `headline`, `detail`, `signalAt`, `teamSlug`, `teamName`, `teamFlag`, `team`, `playerSlug`, `sourceUrl`, plus chemistry and player-fitness fields used to synthesize derived briefing signals.

## Foreign-key graph

- `players.team_id -> teams.id`
- `team_stats.team_id -> teams.id`
- `matches.home_team_id -> teams.id`
- `matches.away_team_id -> teams.id`
- `standings.team_id -> teams.id`
- `head_to_head.team_a_id -> teams.id`
- `head_to_head.team_b_id -> teams.id`
- `predictions.match_id -> matches.id`
- `team_chemistry.team_id -> teams.id`
- `player_intel.player_id -> players.id`
- `signals.team_id -> teams.id`
- `signals.player_id -> players.id`
- `signals.match_id -> matches.id`
- `narratives.team_id -> teams.id`
- `narratives.player_id -> players.id`
- `narratives.match_id -> matches.id`

## Trigger strategy

- `20260326000000_create_update_updated_at_function.sql` defines the shared `update_updated_at()` trigger function used by existing and new migrations.
- Every core table with `updated_at` has a `before update` trigger that refreshes the timestamp automatically.

## Validation automation

- `scripts/apply-core-football-schema.sh` applies the full `supabase/migrations/*.sql` chain to an empty Postgres database in lexical order, including the existing affiliate/push migrations plus the new helper and core football migrations.
- `scripts/doctor-core-football-schema.sh` checks whether the current shell is actually ready to publish and run runtime validation, covering `.git` writability, GitHub CLI auth, `psql`, database URL discovery, and the expected local schema artifacts.
- The schema shell wrappers resolve `psql` from `PATH` first, then fall back to common macOS install locations such as Homebrew `libpq` and Postgres.app, so a future runtime environment does not need manual PATH edits if `psql` is already installed there.
- The schema shell wrappers also resolve the database URL from `DATABASE_URL`, `SUPABASE_DB_URL`, or `POSTGRES_URL`, and if those are unset in the current shell they will also read the same variable names from `.env.local` and `.env`.
- When targeting Supabase from an IPv4-only environment, prefer the Supabase session/transaction pooler connection string over the direct `db.<project-ref>.supabase.co:5432` host, because that direct hostname may resolve only to IPv6.
- `.env.local.example` now includes placeholder Postgres connection keys for that runtime path so the checked-in env template matches the schema wrapper behavior.
- `supabase/verify-core-football-schema.sql` can be run after applying the migrations in a real Postgres environment.
- `supabase/smoke-core-football-schema.sql` can be run in the same environment to insert a minimal cross-table graph, exercise the trickiest match/signal constraints, report row counts, and roll the data back.
- Empty-database apply:
  `npm run schema:apply`
  or
  `DATABASE_URL=postgres://... bash scripts/apply-core-football-schema.sh`
  or
  `SUPABASE_DB_URL=postgres://... bash scripts/apply-core-football-schema.sh`
- Environment preflight:
  `npm run schema:doctor`
  or
  `bash scripts/doctor-core-football-schema.sh`
- Intended usage:
  `psql "$DATABASE_URL" -f supabase/verify-core-football-schema.sql`
- Smoke usage:
  `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/smoke-core-football-schema.sql`
- Convenience wrapper:
  `npm run schema:verify`
  or
  `DATABASE_URL=postgres://... bash scripts/verify-core-football-schema.sh`
  or
  `SUPABASE_DB_URL=postgres://... bash scripts/verify-core-football-schema.sh`
- Convenience smoke wrapper:
  `npm run schema:smoke`
  or
  `DATABASE_URL=postgres://... bash scripts/smoke-core-football-schema.sh`
  or
  `SUPABASE_DB_URL=postgres://... bash scripts/smoke-core-football-schema.sh`
- One-shot runtime validation:
  `npm run schema:validate`
  or
  `DATABASE_URL=postgres://... bash scripts/validate-core-football-schema.sh`
  or
  `SUPABASE_DB_URL=postgres://... bash scripts/validate-core-football-schema.sh`
- The apply script intentionally follows lexical migration order, which currently means `20260326000000_create_update_updated_at_function.sql` runs before `20260327_create_affiliate_clicks.sql`, `20260327_create_push_subscriptions.sql`, and `20260331000000_create_core_football_schema.sql`.
- Because the older affiliate/push migrations are not guaranteed to be fully reentrant, `schema:apply` and `schema:validate` are intended for a fresh or disposable database rather than a shared long-lived environment.
- The verify script raises on missing required tables, key indexes, key foreign keys, required unique constraints, required compatibility views, the shared `update_updated_at()` helper function, or any of the expected `updated_at` triggers.
- The smoke script validates a minimal happy path across all core tables plus negative checks for mixed match participants, duplicate fixtures, duplicate placeholder participants, and subject-less signals.
- The smoke script also checks that `team_profiles_current`, `player_profiles_current`, `match_fixtures_current`, `signal_feed_current`, `power_rankings_current`, `group_standings_current`, and `head_to_head_current` surface the latest chemistry, player intel, match prediction, signal, ranking, standings, and compare-friendly H2H payloads as intended.
- For local static regression without a database, use:
  `npm run test:schema`

## Compatibility notes

- The current repo does not contain separate Sprint1 or Sprint2 schema specs. Compatibility was derived from live consumers in `src/lib/types.ts`, `src/lib/data-service.ts`, `src/lib/compare-utils.ts`, `src/app/predictions/page.tsx`, `src/app/daily-briefing/page.tsx`, and `src/content/power-rankings-inaugural.md`, plus related project issues `ZON-8` (FBref/ELO stats) and `ZON-9` (signals to `player_intel` aggregation).
- The compatibility views intentionally coalesce nullable source columns to stable non-null defaults where the current app types/pages still assume required strings or numbers; that preserves today's UI contracts without forcing every raw fact-table column to be `NOT NULL`.
- `narratives` intentionally supports competition-wide records so content like the existing power rankings article does not need a synthetic team/player/match/group foreign key.
- Group-stage unresolved qualifiers such as `tbd-playoff-i` can still live in `teams`, while knockout bracket slots such as `tbd-1a` or `tbd-r32-w1` use the dedicated `home_placeholder_slug` / `away_placeholder_slug` fields until real participants are known.
- `teams.elo_rating` / `elo_rank`, `team_stats.pass_completion_pct`, and `player_intel.recent_signals` / `last_signal_at` are reserved now so later ingestion work can land without another schema reshuffle.
