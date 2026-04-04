import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260402_create_narratives_pipeline.sql'
)
const migrationSource = fs.readFileSync(migrationPath, 'utf8')

describe('narratives pipeline migration compatibility', () => {
  it('reconciles a pre-existing narratives table from the core schema migration', () => {
    expect(migrationSource).toContain(
      'alter table narratives add column if not exists cache_key text;'
    )
    expect(migrationSource).toContain(
      'alter table narratives drop constraint if exists narratives_status_valid;'
    )
    expect(migrationSource).toContain(
      "check (status in ('draft', 'approved', 'published', 'archived'))"
    )
    expect(migrationSource).toContain(
      'drop trigger if exists narratives_updated_at on narratives;'
    )
    expect(migrationSource).toContain(
      'drop trigger if exists narratives_set_updated_at on narratives;'
    )
  })
})
