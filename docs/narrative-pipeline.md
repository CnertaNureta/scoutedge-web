# Narrative Pipeline

## Goal

Create a stable ScoutEdge narrative chain that turns structured facts into cacheable drafts, publishable `ai_content`, and frontend-readable markdown.

## Storage Model

- `narratives`
  - Source-of-truth cache for generated narrative drafts.
  - Uniqueness is anchored by `cache_key`, which includes content type, scope, source date, and a deterministic hash of `facts_used`.
  - Stores `facts_used`, `fact_hash`, `body_markdown`, `status`, and entity scope fields such as `match_key` or `team_slug`.
- `ai_content`
  - Publish layer for frontend export and editorial workflows.
  - Tracks `source_narrative_id`, `slug`, `status`, `published_at`, `facts_used`, and related entity ids.
  - Keeps the existing `export-ai-content.mjs` flow compatible while adding narrative lineage.

## Status Flow

1. `draft`
   - Content is generated and cached but not publishable.
2. `approved`
   - Content is editorially safe to export.
3. `published`
   - Content has been written to the frontend content directory and timestamped.

`export-ai-content.mjs` only exports rows in `approved` state and then marks both `ai_content` and linked `narratives` rows as `published`.

## Fact Constraints

- Every narrative must include a non-empty `facts_used` array.
- Only claims directly supported by stored fixture, team, player, or future structured fact tables may appear in published copy.
- `fact_hash` changes when the anchored fact set changes, which invalidates the cache key and forces a fresh draft.
- The narrative text includes a fact-constraint note so downstream editors understand what the content is and is not allowed to imply.
- Live news, quotes, transfers, and injuries are out of scope unless they are first written into structured storage and referenced from `facts_used`.

## Offline Validation

Generate two sample narratives without touching Supabase:

```bash
npm run narratives:sample
node scripts/export-ai-content.mjs --input-file logs/narrative-samples.json
```

This produces:

- one `match_preview`
- one `daily_briefing`
- a local snapshot of `narratives` + `ai_content`
- exported markdown in `src/content/blog`

## Supabase Validation

With `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured:

```bash
node --experimental-strip-types scripts/generate-sample-narratives.ts --status approved --persist
node scripts/export-ai-content.mjs
```

That path verifies:

- rows are written to `narratives`
- rows are written to `ai_content`
- approved rows are exported
- statuses advance to `published`
