# Runbook — ScoutEdge Intelligence (WC2026)

Operations runbook for the WC2026 prediction service. Covers database migrations, first-time deploy, smoke tests, cron operations, rollback, and the production cutover.

For the day-to-day Fly.io deploy mechanics, see [DEPLOY.md](./DEPLOY.md). This runbook does **not** duplicate it — it links into it where relevant.

---

## 1. Overview

ScoutEdge Intelligence is the WC2026 prediction engine — a stateless FastAPI service deployed as a sidecar on Fly.io (`scoutedge-intelligence`, region `sjc`) and called from the Vercel-hosted Next.js frontend over HTTPS / WebSockets. All persistent state lives in Supabase Postgres (and Redis for ephemeral caching). This runbook covers what the operator does *outside* of `fly deploy`: applying database migrations, validating the production environment, smoke-testing the service end-to-end, scheduling and verifying GitHub Actions cron jobs, and rolling back when something goes wrong.

---

## 2. Pre-deploy Checklist

Run through this list before the first production cutover. Each item must be confirmed (not just "probably fine").

- [ ] **Anthropic API key** — confirm the key in `ANTHROPIC_API_KEY` is on a tier with sufficient input/output tokens for Sonnet 4.6 + Haiku 4.5 daily volume. Check the Anthropic console "Workspace → Limits" page.
- [ ] **Polymarket Gamma reachable** — `curl -sS https://gamma-api.polymarket.com/events?closed=false | head -c 200` returns JSON, not an error. No auth required for read. See `KNOWN_ISSUES.md §1` — per-match 1X2 markets do not exist yet for WC2026; the pipeline degrades gracefully.
- [ ] **The Odds API key + monthly limit** — `ODDS_API_KEY` set; visit `https://api.the-odds-api.com/v4/sports/?apiKey=<key>` and confirm the response includes a `x-requests-remaining` header with enough budget for `/v4/sports/soccer_fifa_world_cup/odds` calls every 30 min for a month.
- [ ] **api-football key** — `API_FOOTBALL_KEY` set and within rate budget.
- [ ] **Supabase service-role key** — `SUPABASE_SERVICE_ROLE_KEY` is the *production* service-role key (not anon, not staging). Verify in the Supabase dashboard under Project Settings → API.
- [ ] **DATABASE_URL** — points to the **production** Supabase Postgres instance. The string MUST contain the prod project ref, not staging. Cross-check `SUPABASE_URL` and `DATABASE_URL` resolve to the same project.
- [ ] **CORS origins** — set `CORS_ORIGINS` to the exact production and preview origins that may call the API. The FastAPI `Settings.cors_origins` field feeds `CORSMiddleware.allow_origins`, and the env value should be a JSON array, for example `["https://scoutedge.app","https://kickoracle.com","https://scoutedge-web-git-main-cnertanureta.vercel.app"]`.
- [ ] **Redis URL** — `REDIS_URL` resolves to a managed Redis with persistence, not `localhost`.
- [ ] **GitHub Actions secrets** — `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ODDS_API_KEY`, `API_FOOTBALL_KEY`, `SCOUTEDGE_WEEKLY_WEBHOOK` all populated in repo settings.

---

## 3. Database Migrations (Supabase)

Five migrations land the WC2026 schema:

| File | Adds |
|---|---|
| `20260505100001_wc2026_core.sql` | `teams`/`matches`/`players` columns, `elo_ratings`, `elo_history` |
| `20260505100002_wc2026_predictions_audits.sql` | `prediction_audits`, `polymarket_snapshots` |
| `20260505100003_wc2026_ugc.sql` | `user_predictions`, `bracket_forks`, `divergence_diagnoses_displayed` |
| `20260505100004_wc2026_ab_experiments.sql` | `ab_audits` |
| `20260508000001_predictions_prediction_type.sql` | adds 11 ORM-expected columns to `predictions` (`prediction_type`, `predicted_home_goals`, `predicted_away_goals`, `confidence_score`, `recommended_pick`, `rationale_summary`, `source`, `facts_used`, `metadata`, `generated_at`, `updated_at`) — required after schema drift caused 500s on `/api/predict/match/{id}/live`, `/og/match/{id}`, `/api/predict/remix` |

**Note:** `matches`, `predictions`, and `teams` are pre-existing. The new migrations `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` against them. There is no `ab_experiments` table — only `ab_audits`. The DDL is **idempotent** (`IF NOT EXISTS` everywhere observed) so safe to re-run.

### 3.0 Migration apply gotchas (learned the hard way)

Production schema may have drifted from what an earlier migration assumed. When you write a new migration that touches a column added by an older one, do not assume the column already exists in prod — guard every `ALTER … SET DEFAULT`, `ALTER … DROP NOT NULL`, etc. with an `information_schema.columns` existence check:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'generated_at'
  ) THEN
    ALTER TABLE predictions ALTER COLUMN generated_at SET DEFAULT NOW();
  END IF;
END $$;
```

Two real incidents from the WC2026 cutover where this bit us:

- `20260505100002_wc2026_predictions_audits.sql` originally `ALTER TABLE predictions ALTER COLUMN generated_at SET DEFAULT NOW()` failed because prod's `predictions` table never had `generated_at` (the assumed older migration was never deployed there). Fix: wrap in `DO $$ … $$` block guarded by `information_schema.columns`.
- `20260505100003_wc2026_ugc.sql` originally created `user_predictions_unique` index, which collided with the legacy `user_match_predictions_unique` index name space and failed. Fix: rename to `user_predictions_user_match_unique`.

If a `supabase db push` fails on a non-idempotent statement, **do not** retry blindly — read stderr, identify the failing statement, edit the migration to make it idempotent, then re-run.

### 3.1 Apply to STAGING first

```bash
# From repo root
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push
```

### 3.2 Smoke-test the schema (staging)

```bash
psql "$STAGING_DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN (
      'matches','predictions','prediction_audits',
      'polymarket_snapshots','divergence_diagnoses_displayed',
      'bracket_forks','user_predictions','ab_audits',
      'elo_ratings','elo_history'
    )
  ORDER BY tablename;
"
```

Expected: 10 rows. If any row is missing, investigate before proceeding.

Spot-check a couple of new columns:

```bash
psql "$STAGING_DATABASE_URL" -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_name='matches'
    AND column_name IN ('venue_city','venue_altitude_m','finished','home_goals')
  ORDER BY column_name;
"
```

Expected: 4 rows.

### 3.3 Repeat against PRODUCTION

```bash
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
# Re-run the two psql smoke queries above against $PROD_DATABASE_URL.
```

### 3.4 Roll-forward strategy

The migrations are idempotent at DDL level (every `CREATE TABLE` and `ADD COLUMN` is guarded by `IF NOT EXISTS`). If `supabase db push` fails mid-way:

1. Capture stderr — identify the failing statement.
2. Re-run `supabase db push`. Idempotent guards skip the steps that already applied.
3. If a non-idempotent statement (e.g. an index creation, a check constraint) is the failure point, apply the remainder manually:
   ```bash
   psql "$PROD_DATABASE_URL" -f supabase/migrations/20260505100002_wc2026_predictions_audits.sql
   ```
4. **Down migrations are NOT provided.** For destructive rollback see §7.2.

---

## 4. First-Time Fly.io Deploy

For the bulk of the workflow (`fly auth login` → `fly apps create` → `fly deploy`), see [DEPLOY.md](./DEPLOY.md). The gaps below are runbook-specific.

### 4.1 Set every required secret

Sourced from `.env.example`. Run as a single batch:

```bash
cd scoutedge_intelligence

fly secrets set \
  ANTHROPIC_API_KEY="sk-ant-..." \
  ANTHROPIC_MODEL_FEATURE_GEN="claude-haiku-4-5-20251001" \
  ANTHROPIC_MODEL_TRANSLATOR="claude-haiku-4-5-20251001" \
  ANTHROPIC_MODEL_ANALYST="claude-sonnet-4-6" \
  ANTHROPIC_MODEL_SYNTHESIZER="claude-sonnet-4-6" \
  DATABASE_URL="postgresql://..." \
  SUPABASE_URL="https://<prod-ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  REDIS_URL="redis://..." \
  ODDS_API_KEY="..." \
  ODDS_API_REGIONS="us,uk,eu" \
  ODDS_API_BOOKMAKERS="pinnacle,draftkings,bet365,williamhill_us" \
  API_FOOTBALL_KEY="..." \
  POLYMARKET_GAMMA_BASE="https://gamma-api.polymarket.com" \
  POLYMARKET_WEIGHT_HARD_CAP="0.15" \
  POLYMARKET_VOLUME_THRESHOLD_USD="10000" \
  ANALYST_ENABLED="true" \
  ANALYST_HIGH_DIVERGENCE_ONLY="false" \
  CORS_ORIGINS='["https://scoutedge.app","https://kickoracle.com","https://scoutedge-web-git-main-cnertanureta.vercel.app"]'

fly secrets list  # values redacted; just confirms keys are present
```

`PORT` and `LOG_LEVEL` are already in `fly.toml [env]` and should NOT be set as secrets.

### 4.2 Volumes

The service is **stateless** — see DEPLOY.md §Notes. The `Dockerfile` declares no `VOLUME` and `fly.toml` declares no `[mounts]`. No `fly volumes create` is needed.

### 4.3 Health check

After `fly deploy` completes:

```bash
curl -sS https://scoutedge-intelligence.fly.dev/healthz
# Expected: {"status":"ok","version":"0.1.0"}
```

The Fly internal check (`fly.toml [[http_service.checks]]`) hits the same path on each machine every 30s with a 10s grace period.

---

## 5. Smoke Tests After Deploy

Run all service checks against the production URL. `BASE=https://scoutedge-intelligence.fly.dev`.

### 5.1 Health

```bash
curl -i -sS "$BASE/healthz"
```
- **Expected:** `HTTP/2 200`, body `{"status":"ok","version":"..."}`.
- **Pass criterion:** status 200 and `status` field equals `"ok"`.

Verify CORS using one of the production origins from `CORS_ORIGINS` against the
same health route, so the smoke test does not depend on a synthetic match id:

```bash
curl -i -sS -X OPTIONS "$BASE/healthz" \
  -H 'Origin: https://scoutedge.app' \
  -H 'Access-Control-Request-Method: GET'
```
- **Expected:** `HTTP/2 200` with `access-control-allow-origin: https://scoutedge.app`.
- **Pass criterion:** the returned allow-origin header exactly matches the requested production origin. If missing, confirm `CORS_ORIGINS` in `fly secrets list`, restart/redeploy the service, and re-test.

### 5.2 Predict a real match

Pick a real `match_id` from `SELECT id FROM matches WHERE finished=false ORDER BY kickoff_utc LIMIT 1;`.

```bash
MATCH_ID="<uuid-from-prod-matches>"
curl -i -sS "$BASE/api/predict/match/$MATCH_ID"
```
- **Expected:** `HTTP/2 200`, JSON body with `prob_home`, `prob_draw`, `prob_away` summing to ~1.0.
- **Pass criterion:** status 200 and the three probabilities sum within `[0.99, 1.01]`.

### 5.3 WebSocket live channel

```bash
# Requires websocat: brew install websocat
websocat "wss://scoutedge-intelligence.fly.dev/ws/live/$MATCH_ID"
```
- **Expected:** Connection upgrade succeeds (HTTP 101), then periodic JSON frames stream until you Ctrl-C.
- **Pass criterion:** at least one JSON frame received within 30s.

### 5.4 Divergence feedback

Use a dedicated smoke-test auth user UUID so the row is globally filterable and
safe to remove after the check:

```bash
SMOKE_USER_ID="${SMOKE_USER_ID:?set this to a dedicated auth.users smoke-test UUID}"

curl -i -sS -X POST "$BASE/api/divergence/feedback" \
  -H 'Content-Type: application/json' \
  -d '{
    "match_id": "'"$MATCH_ID"'",
    "user_id": "'"$SMOKE_USER_ID"'",
    "diagnosis_id": null,
    "expanded": true,
    "user_action": "agreed"
  }'
```
- **Expected:** `HTTP/2 200` or `HTTP/2 201`.
- **Pass criterion:** status in {200,201} and the row appears in `divergence_diagnoses_displayed` within 5s.
- **Cleanup:** remove the smoke row immediately after verification:
  ```bash
  psql "$PROD_DATABASE_URL" -c "
    DELETE FROM divergence_diagnoses_displayed
    WHERE user_id = '$SMOKE_USER_ID'
      AND match_id = '$MATCH_ID'
      AND created_at > now() - interval '15 minutes';
  "
  ```

Schema source: `api.routes.divergence_feedback.FeedbackRequest`. `user_action` must be one of `agreed`, `challenged`, `shared`, or `dismissed`; when it is `challenged`, include a non-empty `challenge_reason` and optionally `challenge_alternative_probs`.

---

## 6. GitHub Actions Cron Jobs

Defined in `.github/workflows/scoutedge_intelligence_cron.yml`. All jobs `pip install -e ".[dev]"` from `scoutedge_intelligence/` and run a Python module entrypoint.

| Job | Schedule (UTC) | What it does | Required secrets | Failure triage |
|---|---|---|---|---|
| `poly_snapshot` | `0 * * * *` (hourly) | Snapshots Polymarket Gamma WC2026 markets into `polymarket_snapshots`. | `DATABASE_URL` | Actions tab → "scoutedge-intelligence cron" → most recent **Poly Snapshot (hourly)** run. Common cause: Gamma 5xx — see `KNOWN_ISSUES.md §1`. |
| `attribution` | `*/30 * * * *` (every 30 min) | Runs result attribution: settles finished matches, updates `prediction_audits`, recomputes Brier/log-loss. | `DATABASE_URL`, `ANTHROPIC_API_KEY` | Actions tab → **Run Attribution (every 30 min)**. Check for missing match results from api-football. |
| `precompute` | `0 */6 * * *` (every 6h) | Precomputes predictions for upcoming matches and writes to `predictions`. Heaviest job — exercises the full triple-layer pipeline. | `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ODDS_API_KEY`, `API_FOOTBALL_KEY` | Actions tab → **Precompute Predictions (every 6 h)**. Watch for Anthropic rate-limit errors and Odds API quota exhaustion. |
| `weekly_report` | `0 23 * * 0` (Sun 23:00 UTC) | Generates a weekly markdown report and POSTs to the configured webhook; uploads as a GitHub artifact (90-day retention). | `DATABASE_URL`, `SCOUTEDGE_WEEKLY_WEBHOOK` | Actions tab → **Weekly Report (Sun 23:00 UTC)**. Artifact `weekly-report-<run_id>` is retained even on failure. |
| `seed-elo` | `0 4 * * *` (daily 04:00 UTC) | Walks finished matches in chronological order, recomputes `FootballELO` from scratch, persists snapshot rows to `elo_ratings`. The API server reads this table at warm-up to seed in-memory ratings. | `DATABASE_URL` | Actions tab → **Seed ELO Ratings (daily 04:00 UTC)**. If `elo_ratings` row count drops or stays at zero, check that the matches table actually has finished rows (status='finished' AND home_goals/away_goals NOT NULL). |

All jobs accept `workflow_dispatch` for manual runs. Concurrency groups prevent overlapping runs of the same job.

**Every script that opens a SQLAlchemy engine must coerce `DATABASE_URL` first** — see §10.1.

---

## 7. Rollback

### 7.1 Fly.io

```bash
fly releases list -a scoutedge-intelligence
# pick the previous good version number, then:
fly releases rollback <version> -a scoutedge-intelligence
```

Fly performs a rolling restart back to the named release. Verify with `curl $BASE/healthz` and `fly status`.

> Alternative pinned-image rollback (also documented in DEPLOY.md §Rollback): `fly deploy --image registry.fly.io/scoutedge-intelligence:<previous-tag>`.

### 7.2 Database

There are **no down migrations** in this set. Supported rollback paths, in order of preference:

1. **Snapshot restore (preferred for prod).** Supabase nightly backups are kept under Project Settings → Database → Backups. Pick the most recent backup taken *before* `supabase db push` ran and use the dashboard "Restore" button. This is destructive — coordinate with the team and stop cron jobs first.
2. **Point-in-Time Recovery** (Supabase paid tier only). Use the dashboard PITR slider to roll back to a timestamp seconds before the migration.
3. **Manual reverse DDL.** For an isolated bad migration on staging, hand-write `DROP TABLE IF EXISTS …` / `ALTER TABLE … DROP COLUMN IF EXISTS …` mirroring the failed migration. **Do not use this on production unless data preservation has been verified.**

Before any DB rollback: pause the cron workflows (`gh workflow disable scoutedge-intelligence cron`) so attribution / precompute jobs don't write into the rolled-back schema.

---

## 8. Production Cutover Checklist

Tick these in order on cutover day:

- [ ] **Migrations** applied to prod via `supabase db push`; smoke queries from §3.2 return all 10 expected tables.
- [ ] **Fly secrets** all present (`fly secrets list` shows every key from §4.1).
- [ ] **Fly app** running and `/healthz` returns 200 (§4.3).
- [ ] **Smoke tests** §5.1–§5.4 all pass against prod.
- [ ] **GitHub Actions secrets** populated for prod `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ODDS_API_KEY`, `API_FOOTBALL_KEY`, `SCOUTEDGE_WEEKLY_WEBHOOK`.
- [ ] **Manual `workflow_dispatch`** triggered for `precompute_predictions`; job finishes green and at least one new row lands in `predictions`:
  ```bash
  gh workflow run scoutedge_intelligence_cron.yml -f job=precompute
  # then watch:
  gh run watch
  # then verify a row landed:
  psql "$PROD_DATABASE_URL" -c "SELECT count(*) FROM predictions WHERE created_at > now() - interval '1 hour';"
  ```
- [ ] **Cron schedules** confirmed enabled (`gh workflow view "scoutedge-intelligence cron"` shows `state: active`).
- [ ] **Vercel env var** `NEXT_PUBLIC_SCOUTEDGE_API_URL` flipped from staging to `https://scoutedge-intelligence.fly.dev/api`. Trigger a Vercel redeploy of the production environment, then verify:
  - Vercel production deployment status is `Ready` and the deployment commit matches this release.
  - Production browser DevTools console/network shows ScoutEdge API calls going to `https://scoutedge-intelligence.fly.dev/api` (or the approved replacement URL), with no staging API calls remaining.
  - Direct smoke request succeeds:
    ```bash
    API_BASE="https://scoutedge-intelligence.fly.dev/api"
    curl -i -sS "$API_BASE/og/match/$MATCH_ID"
    ```
    Expected: `HTTP/2 200` or the documented route-specific non-5xx response, and no request to the old staging API base.
- [ ] **End-to-end check (10-minute SLO):** load the production frontend, navigate to a match detail page, confirm a prediction renders within 10 minutes of cutover. Record latency.

---

## 9. Operational Thresholds

Wire these into the alerting stack (Fly metrics, Supabase logs, and the chosen APM). Until the alerting stack is finalized, the on-call owner should spot-check during peak traffic windows.

| Signal | Threshold | Action |
|---|---|---|
| `p99` latency on `GET /api/predict/match` | > 3000 ms over 5-min window | Page on-call. Check Fly machine count, Anthropic API latency, Postgres slow queries. |
| HTTP error rate (`/api/*`) | > 1% over 5-min window | Page on-call. `fly logs` for stack traces; check Supabase + Redis health. |
| Daily Anthropic spend | > $50/day | Notify owner; consider flipping `ANALYST_HIGH_DIVERGENCE_ONLY=true` to throttle Sonnet calls. |
| Daily row writes to `predictions` | < `4 × UpcomingMatchesInNext48h` rows/day once at least one match is scheduled. The scheduled `precompute` job runs every 6h and writes one prediction per match per run (example: 3 upcoming matches => alert below 12 writes/day). | Investigate cron failures; check Actions tab for skipped or failing `precompute` runs. |
| `prediction_audits` Brier score (rolling 30 matches) | drift > 0.05 from prior 30-match window | Notify modeling owner; possible model drift or upstream data issue. |
| Fly machine count | drops to 0 for > 60s during scheduled windows | Check `min_machines_running = 1` is still set in `fly.toml`. |

---

## 10. Environment & driver gotchas (lessons from WC2026 cutover)

### 10.1 DATABASE_URL coercion (REQUIRED in every entrypoint)

Supabase exposes its Postgres URL as plain `postgresql://…` (or the legacy alias `postgres://…`). SQLAlchemy 2.x **cannot** use that string directly for an async engine — it raises:

```
sqlalchemy.exc.ArgumentError: Could not parse SQLAlchemy URL from given URL string
```

The image ships **psycopg v3** (not psycopg2), so the sync engine also needs an explicit driver hint. Use `scoutedge_intelligence.utils.db_urls`:

```python
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import create_engine
from scoutedge_intelligence.utils.db_urls import (
    coerce_async_database_url,  # → postgresql+asyncpg://...
    coerce_sync_database_url,   # → postgresql+psycopg://... (v3)
)

async_engine = create_async_engine(coerce_async_database_url(database_url), echo=False)
sync_engine  = create_engine(coerce_sync_database_url(database_url),  pool_pre_ping=True)
```

Every cron script and every API warm-up path **must** call the appropriate helper. PR #39 patched 5 cron scripts (`poly_snapshot`, `precompute_predictions`, `weekly_report`, `train_ml`, `run_attribution`) that had been calling `create_async_engine(database_url)` directly and failing intermittently in production cron.

When you add a new entrypoint, add a `pytest` case that runs `_make_async_engine` (or whatever the script's analogue is) against a `postgresql://` URL and asserts no exception.

### 10.2 ANTHROPIC_BASE_URL — third-party relay support

The Anthropic Python SDK reads two env vars:

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Auth token (relay-issued, not necessarily an `sk-ant-…` key) |
| `ANTHROPIC_BASE_URL` | Override host. **Required** when using a relay (e.g. `https://www.skyapi.org`). Leave unset for direct Anthropic. |

If `/api/predict/*` returns 500 with `anthropic.AuthenticationError: Error code: 401 - {'error': {'type': 'authentication_error', 'message': 'invalid x-api-key'}}` while `curl` against the relay works, the relay's host hasn't been wired through:

```bash
fly secrets set ANTHROPIC_BASE_URL="https://www.skyapi.org"
# Restart picks it up automatically.
```

When rotating relay keys, smoke-test with a direct curl against the relay before pushing the secret:

```bash
curl -sS -X POST https://www.skyapi.org/v1/messages \
  -H "x-api-key: $NEW_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":8,"messages":[{"role":"user","content":"hi"}]}'
```

A successful response includes `"type":"message"` and `"role":"assistant"`. `Invalid token` / `该令牌状态不可用` means the key is bad or disabled at the relay's control panel — fix there before touching Fly.

### 10.3 psycopg v3 (not v2)

The runtime image installs `psycopg` (v3). `pyproject.toml` does not pin `psycopg2-binary`. Anything that bypasses `coerce_sync_database_url` and lands on the bare `postgresql://` SQLAlchemy default will resolve to psycopg2 and fail with `ModuleNotFoundError: No module named 'psycopg2'`.

This includes one-off scripts run inside the Fly machine — always coerce, or pass `+psycopg` explicitly.

### 10.4 SCOUTEDGE_PARAMS_DIR + Dixon-Coles artifact

`fly.toml` sets `SCOUTEDGE_PARAMS_DIR = "/app/artifacts"`. The Dockerfile `COPY artifacts/ ./artifacts/` ships pre-fitted `params_*.json` files into the image; `.dockerignore` has an explicit `!artifacts/params_*.json` exception to allow them through. At warm-up `EngineFactory._load_dc_params_from_disk` picks the latest `params_YYYYMMDD_HHMM.json` by filename stamp.

When you re-fit Dixon-Coles via `python -m scoutedge_intelligence.scripts.train_ml`, commit the new `artifacts/params_*.json` and redeploy — the warm-up has no fallback to S3 or DB.

If no artifact exists, `predict_1x2` returns a uniform `(1/3, 1/3, 1/3)` and logs `dixon_coles.unfitted_uniform_fallback` once per process.

---

## 11. Historical match results backfill

`elo_ratings` and Dixon-Coles fitting both depend on the `matches` table actually marking historical matches as finished with goal counts. WC2022 data in production was loaded with `match_status='finished'` and `home_score`/`away_score` populated, but the new ORM expects `status='finished'` and `home_goals`/`away_goals`. Two paths:

### 11.1 Slug-parse one-off (used during cutover)

For matches where the slug encodes the result like `{home_slug}-vs-{away_slug}-{api_id}` and the legacy columns are populated:

```sql
UPDATE matches
SET
  status     = 'finished',
  home_goals = home_score,
  away_goals = away_score,
  finished   = TRUE
WHERE match_status = 'finished'
  AND home_score IS NOT NULL
  AND away_score IS NOT NULL
  AND status IS DISTINCT FROM 'finished';
```

Run inside Supabase SQL editor. Always `BEGIN; … SELECT count(*) …; ROLLBACK;` first to confirm row count, then re-run with `COMMIT`.

This recovered 60/64 historical matches at cutover. The 4 misses were Poland matches where the team row was missing from the `teams` table — see open task #4.

### 11.2 API-Football v3 backfill (preferred going forward)

`scoutedge_intelligence/scripts/backfill_match_results.py` fetches finished matches from API-Football v3 with three-tier team matching (exact name → alias → reversed pair). Runs as one-off:

```bash
cd scoutedge_intelligence
python -m scoutedge_intelligence.scripts.backfill_match_results --since 2018-01-01 --apply
```

Without `--apply` it does a dry run and prints the diff. Wire into cron once the precompute job is stable — see open task #5.

---

## 12. References

- [DEPLOY.md](./DEPLOY.md) — Fly.io quickstart
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — current caveats (Polymarket coverage, schema mismatches, etc.)
- `fly.toml` — service config (region `sjc`, `min_machines_running=1`, soft/hard concurrency 200/250)
- `.env.example` — full secret list
- `supabase/migrations/20260505100001_*` … `..._100004_*` and `20260508000001_*` — WC2026 schema additions
- `scoutedge_intelligence/utils/db_urls.py` — `coerce_async_database_url` / `coerce_sync_database_url`
- `.github/workflows/scoutedge_intelligence_cron.yml` — cron definitions (incl. `seed-elo`)
