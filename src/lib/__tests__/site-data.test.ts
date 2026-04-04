import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const siteDataPath = path.resolve(process.cwd(), 'src/lib/site-data.ts')
const siteDataSource = fs.readFileSync(siteDataPath, 'utf8')

describe('site-data Supabase fallbacks', () => {
  it('prefers current snapshot views before raw source tables', () => {
    expect(siteDataSource).toContain(
      "readSupabaseTable(['team_profiles_current', 'teams', 'team_profiles'])"
    )
    expect(siteDataSource).toContain(
      "readSupabaseTable(['player_profiles_current', 'players', 'team_players'])"
    )
    expect(siteDataSource).toContain(
      "readSupabaseTable(['match_fixtures_current', 'match_fixtures', 'fixtures'])"
    )
  })
})
