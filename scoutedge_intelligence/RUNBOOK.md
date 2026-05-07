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

Four new migrations land the WC2026 schema:

| File | Adds |
|---|---|
| `20260505100001_wc2026_core.sql` | `teams`/`matches`/`players` columns, `elo_ratings`, `elo_history` |
| `20260505100002_wc2026_predictions_audits.sql` | `prediction_audits`, `polymarket_snapshots` |
| `20260505100003_wc2026_ugc.sql` | `user_predictions`, `bracket_forks`, `divergence_diagnoses_displayed` |
| `20260505100004_wc2026_ab_experiments.sql` | `ab_audits` |

**Note:** `matches`, `predictions`, and `teams` are pre-existing. The new migrations `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` against them. There is no `ab_experiments` table — only `ab_audits`. The DDL is **idempotent** (`IF NOT EXISTS` everywhere observed) so safe to re-run.

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

All jobs accept `workflow_dispatch` for manual runs. Concurrency groups prevent overlapping runs of the same job.

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

## 10. References

- [DEPLOY.md](./DEPLOY.md) — Fly.io quickstart
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — current caveats (Polymarket coverage, schema mismatches, etc.)
- `fly.toml` — service config (region `sjc`, `min_machines_running=1`, soft/hard concurrency 200/250)
- `.env.example` — full secret list
- `supabase/migrations/20260505100001_*` … `..._100004_*` — WC2026 schema additions
- `.github/workflows/scoutedge_intelligence_cron.yml` — cron definitions
