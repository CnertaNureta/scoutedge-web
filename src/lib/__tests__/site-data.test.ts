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

  it('pages through Supabase tables instead of returning only the first batch', () => {
    expect(siteDataSource).toContain('const SUPABASE_PAGE_SIZE = 1000')
    expect(siteDataSource).toContain('.range(offset, offset + SUPABASE_PAGE_SIZE - 1)')
  })

  it('sanitizes database HTML overrides before wiring them into seoArticle', () => {
    const sanitizedUsageMatches = siteDataSource.match(
      /sanitizeHtmlOverride\(readString\(row, 'seoArticle', 'seo_article'\)\)/g
    )

    expect(siteDataSource).toContain('const UNSAFE_HTML_OVERRIDE_PATTERN =')
    expect(sanitizedUsageMatches?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
