# Player Intel Pipeline

## Goal

ZON-9 adds a repeatable pipeline that turns text/news-like player signals into structured `signals` and aggregated `player_intel`.

The current implementation writes three local artifacts every time `npm run generate:player-intel` runs:

- `src/data/generated-player-signals.json`
- `src/data/generated-player-intel.json`
- `reports/player-intel-validation.json`

If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the same payloads are also upserted into:

- `signals`
- `player_intel`

## Current Sources

The pipeline currently uses two repo-native inputs:

1. `src/data/players-data.ts`
   - `fitnessStatus`
   - `fitnessNote`
   - `sentimentScore`
   - `sentimentLabel`
   - `seoArticle`
2. `src/data/player-social.ts`
   - `recentPosts`
   - `buzzScore`
   - `trending`

This means the pipeline already supports:

- injury / fitness
- morale / sentiment
- tactical / selection risk

without waiting for full social ingestion or player-specific external RSS matching.

## Signal Mapping

Each player currently gets 4-6 signals:

1. Fitness baseline from `fitnessStatus` + `fitnessNote`
2. Morale baseline from `sentimentScore` + `sentimentLabel`
3. One article-derived text signal from `seoArticle`
4. One derived tactical / selection signal from caps, rating, age, and availability
5. Up to two recent social signals when `player-social.ts` has coverage

Signals are normalized into records with:

- `id`
- `player_key`
- `player_slug`
- `team_slug`
- `category`
- `signal_type`
- `source_type`
- `summary`
- `evidence`
- `sentiment`
- `confidence`
- `happened_at`

`player_intel` is then aggregated into:

- `player_key`
- `fitness_status`
- `fitness_note`
- `morale_score`
- `morale_label`
- `tactical_risk`
- `tactical_note`
- `selection_risk`
- `selection_note`
- `recent_signals`
- `source_signal_ids`
- `signal_count`
- `last_signal_at`
- `last_updated`

## Validation Snapshot

Validation snapshot generated on April 3, 2026:

- Players covered: `1103`
- Signals generated: `4427`
- Validation artifact: `reports/player-intel-validation.json`

Five sample outputs:

| Player | Team | Fitness | Morale | Selection Risk | Signal Count |
| --- | --- | --- | --- | --- | --- |
| Guillermo Ochoa | mexico | amber | 62 (neutral) | medium | 4 |
| Kylian Mbappe | france | green | 100 (positive) | low | 6 |
| Lionel Messi | argentina | amber | 100 (positive) | medium | 6 |
| Christian Pulisic | usa | green | 100 (positive) | low | 6 |
| Hiroki Ito | japan | green | 70 (positive) | low | 5 |

## Signals To Intel Evidence

Example: `guillermo-ochoa`

Source signals:

- fitness profile signal -> `amber` availability from `Veteran managing minor knee inflammation`
- tactical derived signal -> `medium` lineup risk from workload + age
- morale baseline signal -> `62/100 neutral`
- article signal -> veteran/composure text used as tactical context

Aggregated intel:

- `fitness_status=amber`
- `fitness_note=Veteran managing minor knee inflammation`
- `selection_risk=medium`
- `selection_note=manageable lineup risk because medical workload is being monitored; age/workload management is part of the decision`

Example: `kylian-mbappe`

Source signals:

- positive fitness baseline
- positive training-camp social signal
- positive season-recap social signal
- positive morale baseline
- low-risk tactical derived signal

Aggregated intel:

- `fitness_status=green`
- `fitness_note=Fully fit Recent training/camp activity supports current availability.`
- `morale_score=100`
- `selection_risk=low`
- `recent_signals` contains fresh social/training evidence first

## Repeat Execution Check

On April 3, 2026, the pipeline was run twice in sequence with:

```bash
npm run generate:player-intel && shasum src/data/generated-player-signals.json src/data/generated-player-intel.json reports/player-intel-validation.json
```

Both runs produced the same hashes:

```text
c3204edd9a435401162bfee6698712a870e8dd22  src/data/generated-player-signals.json
3bc6e74f66bb734d438802e1c881f62dccb8745c  src/data/generated-player-intel.json
3412bc4ee1756f3355d5fdd6f673d4ee3a17654a  reports/player-intel-validation.json
```

That gives us same-day deterministic output for local artifacts and stable signal IDs for DB upserts.

The pipeline uses `player_key = team_slug::player_slug` as its storage key so duplicate slugs across national teams do not overwrite each other.

## Current Limitations

- External player-specific news is not yet matched directly from RSS feeds; current "text" coverage comes from repo-local `seoArticle` content plus seeded social data.
- `src/data/player-social.ts` only covers a small key-player subset, so most players currently rely on profile + article + derived signals.
- Social sample dates are currently seeded around May 2026, which means some `last_signal_at` values are later than the local run date of April 3, 2026.
- Tactical / selection risk is still heuristic. It uses caps, rating, age, and availability, not coach-confirmed lineup data.
- In this workspace, Supabase env vars were not configured, so remote upsert was skipped even though the schema and upsert path are implemented.
