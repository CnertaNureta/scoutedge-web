# API-Football ingest

`npm run ingest:api-football` now runs a three-phase pipeline:

1. `fetch`
2. `normalize`
3. `upsert`

Raw and normalized artifacts are written to `logs/api-football/<league>-<season>/`.
The CLI auto-loads `.env.local` first and then `.env` when those files exist.

## Required environment variables

```bash
API_FOOTBALL_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`API_FOOTBALL_KEY` is only required when `fetch` runs. Supabase variables are only required when `upsert` runs against the real database. Add `--dry-run` to use an in-memory sink instead. `.env.local` / `.env` may use either `KEY=value` or `export KEY=value`, and unquoted values may include trailing inline comments.

## First live run checklist

1. Apply `supabase/migrations/20260331_create_api_football_ingest_tables.sql` to the target Supabase project.
2. Set `API_FOOTBALL_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run `npm run ingest:api-football`.
4. Run `npm run ingest:api-football:report -- --strict`.

## Common commands

```bash
# Full ingest for World Cup 2026
npm run ingest:api-football

# Free-tier live validation against World Cup 2022
npm run ingest:api-football:free-tier
npm run ingest:api-football:free-tier:report

# Debug only fetch + normalize for teams and standings
npm run ingest:api-football -- --source teams,standings --phase fetch,normalize

# Resume or limit squad fetch/normalize/upsert to specific teams
npm run ingest:api-football -- --source squads --phase fetch --team-id 33,34

# Reuse a multi-team squad artifact but normalize/upsert only the requested teams
npm run ingest:api-football -- --source squads --phase normalize,upsert --team-id 33 --dry-run

# Rebuild artifacts from scratch for the selected source
npm run ingest:api-football -- --source squads --phase fetch --force-refresh

# Debug normalize + upsert without Supabase credentials
npm run ingest:api-football -- --source squads --phase normalize,upsert --dry-run

# Report scoped Supabase row counts against normalized artifacts
npm run ingest:api-football:report -- --strict
```

Both CLIs resolve `--artifact-root` relative to the project root and store it as an absolute path, so the command behaves consistently even when run outside the repo root.

## Free-tier validation

API-Football free plans currently reject `season=2026`. When that happens, use the built-in World Cup 2022 validation route instead:

```bash
npm run ingest:api-football:free-tier
npm run ingest:api-football:free-tier:report
```

That path still exercises the live `fetch -> normalize -> upsert` chain against Supabase, while keeping the scoped rows under `league_id=1, season=2022` for matches, standings, and squads. The built-in command also slows requests down for the free-tier `10 requests / minute` ceiling.

## Cron integration

`scripts/daily-data-fetch.sh` now treats API-Football as a phased pipeline:

- it resolves the project root from the script location and auto-loads `.env.local` / `.env` defaults for cron-style runs
- with `API_FOOTBALL_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, it runs the full ingest
- with only `API_FOOTBALL_KEY`, it falls back to `--phase fetch,normalize` and logs which Supabase env vars are missing
- without `API_FOOTBALL_KEY`, it skips the API-Football phase entirely

## Sources and tables

- `teams` -> `football_teams`
- `matches` -> `football_matches` plus team upserts
- `standings` -> `football_standings` plus team upserts
- `squads` -> `football_players` and `football_team_squads` plus team upserts

## Verification report

`npm run ingest:api-football:report` reads normalized artifacts from `logs/api-football/<league>-<season>/normalized/` and compares them with the live Supabase tables.

- `football_teams` is verified against the exact team ids present in the normalized artifacts.
- `football_players` is verified against the exact player ids from the squads artifact.
- `football_team_squads`, `football_matches`, and `football_standings` are verified within the current ingest scope and report missing/unexpected rows.
- Zero-row `squads` and `standings` snapshots still emit scoped verification rows, so stale memberships / standings can be detected and cleared.
- Live Supabase verification and stale-row reconciliation now paginate `select` reads, so large scopes do not truncate at the default page cap.
- Add `--strict` to exit non-zero when any scoped table does not match the artifacts.

## Incremental / resume behavior

- `teams`, `matches`, and `standings` are single-request season snapshots and are overwritten on each fetch.
- `teams`, `matches`, and `standings` follow API-Football pagination automatically when the endpoint spans multiple pages.
- Explicit `--team-id` values can bootstrap a squad-only fetch from a cold artifact directory; prior team artifacts are optional in that path.
- `--team-id` also scopes squad `normalize` and `upsert`, so debugging a partial team subset does not accidentally rewrite every team already present in `raw/squads.json`.
- A squad artifact normalized with `--team-id` is treated as scoped data; later unscoped `upsert` or `report` runs now fail fast until `normalize` is rerun without `--team-id`, preventing stale partial `normalized/squads.json` files from being mistaken for a full snapshot.
- `squads` writes progress after every team into `logs/api-football/<league>-<season>/raw/squads.json`.
- If a squad run fails or hits the configured request budget, rerunning the same command resumes missing teams unless `--force-refresh` is used.
- A targeted `--team-id` retry only blocks on failures inside the requested team scope; older errors for other teams remain visible in the artifact but do not prevent the scoped retry from finishing.
- Full-scope squad `normalize` / `upsert` now refuse to run while the raw squad artifact still has unresolved fetch errors; rerun `fetch` first or add `--team-id` to limit the current scope.
- If a squad artifact is already complete for the requested teams, repeated `fetch` runs reuse it instead of spending more API calls.
- Database writes use upsert keys so reruns update rows instead of duplicating them.
- `--dry-run` swaps the Supabase sink for an in-memory sink so local artifact debugging can still exercise `normalize -> upsert` and emit table counts.
- Empty snapshots are preserved as zero-row normalized artifacts; for example, pre-tournament standings can normalize and then clear stale database rows without failing the run.

## Rate limit and failure handling

- Default request budget is `95` per run to stay below the free-tier limit.
- Default inter-request delay is `1250ms`.
- `429` and `5xx` responses are retried with backoff before the run fails.
- Logical API-Football rate-limit errors returned inside a `200` response, such as `Too many requests`, now also back off and retry.
- If API-Football rejects a season because the key is on the free plan, the error now points to the `World Cup 2022` free-tier validation command.
- Every phase writes `state.json` and `last-run.json`; when a run fails, the active source/phase is marked with `status: failed` (or `partial` when resumable progress already exists).
- If any raw or normalized artifact JSON is corrupted, the failing command now reports the exact artifact file path instead of only surfacing a bare JSON parse error.
- A later successful rerun clears stale `error` / `failedAt` fields from that phase state so `state.json` reflects the latest outcome instead of historical failure residue.
