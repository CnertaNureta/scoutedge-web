/**
 * Anti-regression guard: every generateMetadata export must emit
 *   - alternates.canonical === https://kickoracle.com/{locale}{path}  (self-locale only)
 *   - alternates.languages with 19+ locales + x-default pointing at the /en URL
 */
import { describe, expect, it, vi, beforeAll } from 'vitest'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog-service'
import enMessages from '../../../messages/en.json'

// ---------------------------------------------------------------------------
// Stub server-only so Vite doesn't error on the bare "server-only" package
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Mock @/lib/site-data (uses server-only + Supabase — not needed for metadata)
// ---------------------------------------------------------------------------
vi.mock('@/lib/site-data', () => ({
  getHomePageData: vi.fn(async () => ({ teams: [], faqs: [] })),
  getTeamsPageData: vi.fn(async () => ({ groups: [], teamsByGroup: {}, totalTeams: 48 })),
  getTeamPageData: vi.fn(async (slug: string) => ({
    team: { name: slug, group: 'A', fifaRanking: 1, chemistry: 80, morale: 80, stability: 80, familiarity: 80, slug },
    seoMeta: null,
  })),
  getDailyBriefingPageData: vi.fn(async () => ({ signals: [] })),
}))

// ---------------------------------------------------------------------------
// Mock @/lib/news-service (used by daily-briefing page)
// ---------------------------------------------------------------------------
vi.mock('@/lib/news-service', () => ({
  fetchWorldCupNews: vi.fn(async () => []),
}))

// ---------------------------------------------------------------------------
// Mock next-intl/server so generateMetadata calls work outside Next.js runtime
// ---------------------------------------------------------------------------
vi.mock('next-intl/server', () => {
  const interpolate = (tpl: string, params?: Record<string, unknown>) =>
    params ? tpl.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : tpl

  return {
    getTranslations: vi.fn(async ({ namespace }: { locale: string; namespace: string }) => {
      const ns = (enMessages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
      return (key: string, p?: Record<string, unknown>) => interpolate(ns[key] ?? key, p)
    }),
    setRequestLocale: vi.fn(),
    getLocale: vi.fn(async () => 'en'),
  }
})

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------
type MetadataParams = Record<string, string | string[]>
type GenerateMetadataFn<TParams extends MetadataParams> = (input: {
  params: Promise<TParams>
}) => Promise<Metadata> | Metadata

async function getMeta<TParams extends MetadataParams>(
  generate: GenerateMetadataFn<TParams>,
  params: TParams
): Promise<Metadata> {
  return generate({ params: Promise.resolve(params) })
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------
const SITE = 'https://kickoracle.com'

/** Mirror buildAlternates' normalisation: '/' and '' both become no suffix. */
function expectedUrl(locale: string, path: string): string {
  const suffix = path === '/' || path === '' ? '' : path.startsWith('/') ? path : `/${path}`
  return `${SITE}/${locale}${suffix}`
}

function assertCanonical(meta: Metadata, locale: string, path: string) {
  const expected = expectedUrl(locale, path)
  const canonical = meta.alternates?.canonical as string | undefined
  expect(canonical, `canonical for locale=${locale} path=${path}`).toBe(expected)
  // Must never be a bare no-locale URL (i.e. must always start with a locale segment)
  const localePattern = 'en|es|zh|pt|ar|fr|ja|ko|de|it|nl|tr|pl|id|ru|fa|th|vi|hu'
  expect(canonical).toMatch(new RegExp(`^${SITE}/(${localePattern})`))
}

function assertLanguages(meta: Metadata, path: string) {
  const langs = meta.alternates?.languages as Record<string, string> | undefined
  expect(langs, 'languages map must exist').toBeTruthy()
  if (!langs) return
  const keys = Object.keys(langs)
  expect(keys.length, 'hreflang entries including x-default').toBeGreaterThanOrEqual(20)
  expect(langs['x-default'], 'x-default must point to /en URL').toBe(expectedUrl('en', path))
}

// ---------------------------------------------------------------------------
// Page module imports (lazy, to allow vi.mock to be hoisted first)
// ---------------------------------------------------------------------------
let homeMeta: typeof import('@/app/[locale]/page')
let teamsMeta: typeof import('@/app/[locale]/teams/page')
let teamSlugMeta: typeof import('@/app/[locale]/teams/[slug]/page')
let playerMeta: typeof import('@/app/[locale]/players/[player]/page')
let teamPlayerMeta: typeof import('@/app/[locale]/teams/[slug]/players/[playerSlug]/page')
let cityMeta: typeof import('@/app/[locale]/cities/[city]/page')
let blogSlugMeta: typeof import('@/app/[locale]/blog/[slug]/page')
let groupMeta: typeof import('@/app/[locale]/groups/[group]/page')
let dailyBriefingMeta: typeof import('@/app/[locale]/daily-briefing/page')
let predictionsMeta: typeof import('@/app/[locale]/predictions/page')
let citiesHubMeta: typeof import('@/app/[locale]/cities/page')

beforeAll(async () => {
  ;[
    homeMeta,
    teamsMeta,
    teamSlugMeta,
    playerMeta,
    teamPlayerMeta,
    cityMeta,
    blogSlugMeta,
    groupMeta,
    dailyBriefingMeta,
    predictionsMeta,
    citiesHubMeta,
  ] = await Promise.all([
    import('@/app/[locale]/page'),
    import('@/app/[locale]/teams/page'),
    import('@/app/[locale]/teams/[slug]/page'),
    import('@/app/[locale]/players/[player]/page'),
    import('@/app/[locale]/teams/[slug]/players/[playerSlug]/page'),
    import('@/app/[locale]/cities/[city]/page'),
    import('@/app/[locale]/blog/[slug]/page'),
    import('@/app/[locale]/groups/[group]/page'),
    import('@/app/[locale]/daily-briefing/page'),
    import('@/app/[locale]/predictions/page'),
    import('@/app/[locale]/cities/page'),
  ])
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const LOCALES = ['en', 'zh', 'ar'] as const

describe('seo-canonical-guard: home page', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}: canonical is self-locale, languages has 20+ entries`, async () => {
      const meta = await getMeta(homeMeta.generateMetadata, { locale })
      assertCanonical(meta, locale, '/')
      assertLanguages(meta, '/')
    })
  }
})

describe('seo-canonical-guard: teams hub', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(teamsMeta.generateMetadata, { locale })
      assertCanonical(meta, locale, '/teams')
      assertLanguages(meta, '/teams')
    })
  }
})

describe('seo-canonical-guard: team slug (argentina)', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(teamSlugMeta.generateMetadata, { locale, slug: 'argentina' })
      assertCanonical(meta, locale, '/teams/argentina')
      assertLanguages(meta, '/teams/argentina')
    })
  }
})

describe('seo-canonical-guard: player (lionel-messi)', () => {
  // The /players/[player] route intentionally retargets its canonical to the
  // team-prefixed URL (/teams/{team}/players/{slug}) — that's the URL listed
  // in the sitemap. See generateMetadata comment in src/app/[locale]/players/[player]/page.tsx.
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(playerMeta.generateMetadata, { locale, player: 'lionel-messi' })
      assertCanonical(meta, locale, '/teams/argentina/players/lionel-messi')
      assertLanguages(meta, '/teams/argentina/players/lionel-messi')
    })
  }
})

describe('seo-canonical-guard: team player (argentina/lionel-messi)', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(teamPlayerMeta.generateMetadata, {
        locale,
        slug: 'argentina',
        playerSlug: 'lionel-messi',
      })
      assertCanonical(meta, locale, '/teams/argentina/players/lionel-messi')
      assertLanguages(meta, '/teams/argentina/players/lionel-messi')
    })
  }
})

describe('seo-canonical-guard: city (los-angeles)', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(cityMeta.generateMetadata, { locale, city: 'los-angeles' })
      assertCanonical(meta, locale, '/cities/los-angeles')
      assertLanguages(meta, '/cities/los-angeles')
    })
  }
})

describe('seo-canonical-guard: blog post', () => {
  let blogSlug: string
  beforeAll(() => {
    const posts = getAllPosts()
    if (posts.length === 0) throw new Error('No blog posts found for test fixture')
    blogSlug = posts[0].slug
  })

  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(blogSlugMeta.generateMetadata, { locale, slug: blogSlug })
      assertCanonical(meta, locale, `/blog/${blogSlug}`)
      assertLanguages(meta, `/blog/${blogSlug}`)
    })
  }
})

describe('seo-canonical-guard: group (A)', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(groupMeta.generateMetadata, { locale, group: 'A' })
      assertCanonical(meta, locale, '/groups/A')
      assertLanguages(meta, '/groups/A')
    })
  }
})

describe('seo-canonical-guard: daily-briefing', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(dailyBriefingMeta.generateMetadata, { locale })
      assertCanonical(meta, locale, '/daily-briefing')
      assertLanguages(meta, '/daily-briefing')
    })
  }
})

describe('seo-canonical-guard: predictions', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(predictionsMeta.generateMetadata, { locale })
      assertCanonical(meta, locale, '/predictions')
      assertLanguages(meta, '/predictions')
    })
  }
})

describe('seo-canonical-guard: cities hub', () => {
  for (const locale of LOCALES) {
    it(`locale=${locale}`, async () => {
      const meta = await getMeta(citiesHubMeta.generateMetadata, { locale })
      assertCanonical(meta, locale, '/cities')
      assertLanguages(meta, '/cities')
    })
  }
})
