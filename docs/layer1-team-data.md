# Layer 1 Team Data

This workspace now contains two complementary paths for issue `ZON-8`.

- `src/lib/layer1/team-data.ts`
  Builds the full in-memory Layer 1 dataset from FBref HTML and ELO HTML.
  It is the main parser used by the fixture-backed tests and sync script.
- `src/lib/layer1/csv-dataset.ts`
  Converts FBref/ELO CSV exports into the same join-ready Layer 1 dataset shape.
  This is the recommended fallback when direct FBref live fetches return `403`.
- `scripts/export-fbref-team-stats-template.ts`
  Turns three FBref competition HTML pages with visible `Squad Stats` tables into
  the checked-in `fbref-team-stats.csv` template shape. This exporter is raw-page
  oriented: it does not require the teams on the source page to exist in our
  local World Cup team catalog first. This is useful when a browser can open
  FBref but direct CLI fetches still return `403`. A template generated from a
  different competition may still need alias/catalog reconciliation before it
  can be imported into the World Cup-specific Layer 1 tables.
- `scripts/import-fbref-team-stats.mjs` and `scripts/import-elo-ratings.mjs`
  Provide small CSV-based entrypoints for dry-runs or direct table upserts.
- `src/lib/__tests__/layer1-consistency.test.ts`
  Keeps the TS parser path and the MJS importer path aligned on team catalog
  shape and alias resolution.

## Commands

Fixture-backed validation with full schedule coverage and resolved-team stats/ratings coverage:

```bash
npm run layer1:validate
```

Fixture-backed sync preview that writes a JSON report without touching Supabase:

```bash
npm run layer1:sync:fixtures -- --json-out /tmp/layer1-sync-report.json
```

Live fetch + Supabase sync when network and credentials are available:

```bash
npm run layer1:sync
```

CSV-backed sync when you have exported or mirrored source files and want the
same Supabase write path as the HTML parser flow:

```bash
FBREF_TEAM_STATS_CSV_FILE=/absolute/path/fbref-team-stats.csv \
ELO_RATINGS_CSV_FILE=/absolute/path/elo-ratings.csv \
npm run layer1:sync:csv
```

Live fetch with explicit CSV fallback if FBref blocks direct requests:

```bash
FBREF_TEAM_STATS_CSV_FILE=/absolute/path/fbref-team-stats.csv \
ELO_RATINGS_CSV_FILE=/absolute/path/elo-ratings.csv \
LAYER1_FALLBACK_TO_CSV=true \
npm run layer1:sync
```

CSV dry-runs for narrower importer checks:

```bash
npm run import:fbref-team-stats
npm run import:elo-ratings
npm run validate:layer1
```

Build an `fbref-team-stats.csv` template from browser-saved FBref HTML pages:

```bash
npm run layer1:fbref:template -- \
  --shooting-html path/to/fbref-shooting.html \
  --passing-html path/to/fbref-passing.html \
  --possession-html path/to/fbref-possession.html \
  --competition "UEFA Euro 2024" \
  --season 2024 \
  --updated-at 2026-04-04T00:00:00Z \
  --shooting-url https://fbref.com/en/comps/676/shooting/UEFA-Euro-Stats \
  --passing-url https://fbref.com/en/comps/676/passing/UEFA-Euro-Stats \
  --possession-url https://fbref.com/en/comps/676/possession/UEFA-Euro-Stats \
  --output tmp/fbref-team-stats.euro-2024.csv
```

Execute the CSV importers against Supabase:

```bash
npm run import:fbref-team-stats -- --execute --input path/to/fbref.csv
npm run import:elo-ratings -- --execute --input path/to/elo.csv
```

## Required env vars for live sync

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional overrides:

```bash
LAYER1_COMPETITION="World Cup 2026"
LAYER1_SEASON=2026
LAYER1_SOURCE_MODE=live
LAYER1_FALLBACK_TO_CSV=true
FBREF_SHOOTING_URL=https://fbref.com/...
FBREF_PASSING_URL=https://fbref.com/...
FBREF_POSSESSION_URL=https://fbref.com/...
ELO_RATINGS_URL=https://eloratings.net/
FBREF_TEAM_STATS_CSV_FILE=/absolute/path/fbref-team-stats.csv
ELO_RATINGS_CSV_FILE=/absolute/path/elo-ratings.csv
```

## Practical FBref note

- On `2026-04-04`, the `World Cup 2026` FBref `shooting/passing/possession`
  pages did not expose `Squad Stats` tables yet, so there was nothing to export
  into `fbref-team-stats.csv`.
- For template validation, use a competition page that already has live squad
  tables, such as:
  - `https://fbref.com/en/comps/676/shooting/UEFA-Euro-Stats`
  - `https://fbref.com/en/comps/676/passing/UEFA-Euro-Stats`
  - `https://fbref.com/en/comps/676/possession/UEFA-Euro-Stats`
- FBref still returns `403` to direct CLI fetches for these URLs in this
  environment, so the working path is:
  1. Open the pages in a browser.
  2. Save the page HTML.
  3. Run `npm run layer1:fbref:template`.
- On the same date, browser-exported FBref DOM snapshots for currently available
  `Passing` pages still showed blank `Cmp/Att/Cmp%` cells on both `UEFA Euro
  2024` and `2025-2026 Serie A`. The template exporter still works and now keeps
  every squad row from the source competition, but those columns remain blank
  unless FBref exposes the values in the saved HTML or a CSV export is available.

## SQL artifacts

- `supabase/migrations/20260331_create_team_layer1_tables.sql`
- `supabase/queries/zon_8_validation.sql`

The migration creates:

- `teams`
- `matches`
- `team_name_aliases`
- `team_stats`
- `team_ratings`
- `latest_team_stats`
- `latest_team_ratings`
- `latest_team_features`
- `match_team_features`

`team_stats` and `team_ratings` snapshots are keyed by source plus
`competition`, `season`, and `as_of_date`, so historical template imports can
coexist with World Cup 2026 writes without overwriting each other.

## Coverage notes

- The fixture-backed TS path keeps all `48` teams in `teams/matches`, but only counts `46` resolved teams for stats/ratings coverage.
- The two excluded placeholder slugs are `tbd-playoff-i` and `tbd-playoff-k`.
- The checked-in CSV fixtures are intentionally smaller and currently cover `9` non-placeholder teams for dry-run smoke tests.
- For real CSV-backed syncs, provide your own exported FBref/ELO files via
  `FBREF_TEAM_STATS_CSV_FILE` and `ELO_RATINGS_CSV_FILE`. Do not use the
  checked-in sample CSVs for production writes.
- Alias mappings explicitly cover provider variants such as `United States`, `Korea Republic`, `Côte d'Ivoire`, `Cape Verde`, `Curaçao`, and `IR Iran`.
- Test coverage now includes a TS/MJS consistency guard so alias changes in one
  path must be reflected in the other path before the suite passes.
