import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPlayerBySlug, getTeamBySlug } from '@/lib/data-service'
import { buildPersonSchema } from '@/lib/seo/structured-data'

const repoRoot = process.cwd()

function read(filePath: string): string {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8')
}

function walkSourceFiles(dir: string): string[] {
  const absDir = path.join(repoRoot, dir)
  return fs.readdirSync(absDir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkSourceFiles(relPath)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [relPath] : []
  })
}

describe('PR #25 i18n validations', () => {
  it('uses translated nav.pricing label in desktop header link', () => {
    const header = read('src/components/layout/Header.tsx')
    expect(header).toContain("{t('pricing')}")
    expect(header).not.toContain('>\n              Pricing\n            </Link>')
  })

  it('defines nav.pricing key in every locale message file', () => {
    const messagesDir = path.join(repoRoot, 'messages')
    const localeFiles = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json'))

    const missing: string[] = []
    for (const file of localeFiles) {
      const json = JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8'))
      if (!json?.nav || typeof json.nav.pricing !== 'string' || json.nav.pricing.trim() === '') {
        missing.push(file)
      }
    }

    expect(missing).toEqual([])
  })
})

describe('Client i18n namespace guard', () => {
  it('ships every client useTranslations namespace through the layout provider', () => {
    const clientNamespaces = new Set(
      [...read('src/i18n/client-namespaces.ts').matchAll(/'([^']+)'/g)].map((match) => match[1]),
    )
    const missing: string[] = []

    for (const file of walkSourceFiles('src')) {
      const source = read(file)
      if (!/^['"]use client['"]/m.test(source)) continue

      for (const match of source.matchAll(/useTranslations\(['"]([^'"]+)['"]\)/g)) {
        const namespaceRoot = match[1].split('.')[0]
        if (!clientNamespaces.has(namespaceRoot)) {
          missing.push(`${file}: ${namespaceRoot}`)
        }
      }
    }

    expect(missing.sort()).toEqual([])
  })
})

describe('PR #20 SEO automation guard', () => {
  it('ensures OG locale mapping exists for every supported locale', () => {
    const routing = read('src/i18n/routing.ts')
    const localeMatches = [...routing.matchAll(/'([a-z]{2})'/g)].map((m) => m[1])
    const supportedLocales = Array.from(new Set(localeMatches))

    const ogUtils = read('src/lib/og-utils.ts')
    const missingInOgMap = supportedLocales.filter((locale) => !ogUtils.includes(`  ${locale}:`))

    expect(missingInOgMap).toEqual([])
  })

  it('keeps buildOGMeta wired to OG_LOCALES fallback mapping', () => {
    const ogUtils = read('src/lib/og-utils.ts')
    expect(ogUtils).toContain("locale: OG_LOCALES[meta.locale ?? 'en'] ?? 'en_US'")
  })
})

describe('GEO copy guard', () => {
  it('keeps high-exposure GEO surfaces out of gambling-oriented wording', () => {
    const filesToCheck = [
      'docs/marketing/launch-promo-playbook.md',
      'public/llms.txt',
      'src/content/blog/dark-horses-world-cup-2026-underdog-teams-ai-likes.md',
      'src/content/blog/top-25-players-to-watch-world-cup-2026-ranked-by-ai.md',
      'src/content/blog/world-cup-2026-30-days-out-ai-predictions-every-group.md',
    ]

    const enMessages = JSON.parse(read('messages/en.json'))
    const surfaces = [
      ...filesToCheck.map((file) => ({ file, text: read(file) })),
      { file: 'messages/en.json#geo', text: JSON.stringify(enMessages.geo) },
    ]
    const blocked =
      /\b(bookmakers?|sportsbooks?|betting|gambling|pinnacle|bet365|betfair|william hill|betway|unibet|fanduel|draftkings)\b/i

    const matches = surfaces
      .filter(({ text }) => blocked.test(text))
      .map(({ file }) => file)

    expect(matches).toEqual([])
  })
})

describe('player rich result schema guard', () => {
  it('does not expose player ratings as unsupported Google review snippets', () => {
    const team = getTeamBySlug('usa')
    const player = getPlayerBySlug('usa', 'christian-pulisic')

    expect(team).toBeTruthy()
    expect(player).toBeTruthy()
    if (!team || !player) throw new Error('Christian Pulisic fixture is unavailable')

    const person = buildPersonSchema({
      player,
      team,
      locale: 'en',
      imageUrl: 'https://example.com/christian-pulisic.jpg',
    })

    expect(person).toMatchObject({
      '@type': 'Person',
      name: 'Christian Pulisic',
      sport: 'Soccer',
      memberOf: {
        '@type': 'SportsTeam',
        name: 'USA',
      },
    })
    expect(person).not.toHaveProperty('aggregateRating')
  })
})

describe('localized structured-data URL guard', () => {
  it('keeps high-exposure JSON-LD URLs aligned with locale canonicals', () => {
    const files = [
      'src/app/[locale]/cities/page.tsx',
      'src/app/[locale]/cities/[city]/page.tsx',
      'src/app/[locale]/daily-briefing/page.tsx',
      'src/app/[locale]/groups/[group]/page.tsx',
      'src/app/[locale]/lingo/page.tsx',
      'src/app/[locale]/lingo/countries/page.tsx',
      'src/app/[locale]/lingo/countries/[slug]/page.tsx',
      'src/app/[locale]/lingo/players/page.tsx',
      'src/app/[locale]/lingo/players/[slug]/page.tsx',
      'src/app/[locale]/lingo/terms/page.tsx',
      'src/app/[locale]/players/[player]/page.tsx',
      'src/app/[locale]/predictions/page.tsx',
      'src/app/[locale]/teams/[slug]/page.tsx',
      'src/app/[locale]/teams/[slug]/players/[playerSlug]/page.tsx',
      'src/app/[locale]/teams/page.tsx',
      'src/app/[locale]/volunteer/page.tsx',
    ]
    const disallowed = [
      'https://kickoracle.com/blog/${',
      'https://kickoracle.com/cities/${',
      'https://kickoracle.com/lingo/',
      'https://kickoracle.com/players/${',
      'https://kickoracle.com/teams/${',
      'https://kickoracle.com/volunteer',
    ]
    const failures: string[] = []

    for (const file of files) {
      const source = read(file)
      for (const pattern of disallowed) {
        if (source.includes(pattern)) {
          failures.push(`${file}: ${pattern}`)
        }
      }
    }

    expect(failures).toEqual([])
    expect(read('src/app/[locale]/players/[player]/page.tsx')).toContain('buildPersonSchema')
    expect(read('src/app/[locale]/teams/[slug]/players/[playerSlug]/page.tsx')).toContain('buildPersonSchema')
  })

  it('keeps sitemap breadcrumb JSON-LD URLs locale-prefixed', () => {
    const files = [
      'src/app/[locale]/bracket/page.tsx',
      'src/app/[locale]/cities/[city]/costs/page.tsx',
      'src/app/[locale]/cities/[city]/food/page.tsx',
      'src/app/[locale]/cities/[city]/hotels/page.tsx',
      'src/app/[locale]/cities/[city]/schedule/page.tsx',
      'src/app/[locale]/cities/[city]/stadium/page.tsx',
      'src/app/[locale]/cities/[city]/tickets/page.tsx',
      'src/app/[locale]/cities/[city]/transport/page.tsx',
      'src/app/[locale]/cities/from/[country]/page.tsx',
      'src/app/[locale]/gear/ball/history/[year]/page.tsx',
      'src/app/[locale]/play/pk-battle/page.tsx',
      'src/app/[locale]/play/quiz/page.tsx',
      'src/app/[locale]/players/is-playing/[slug]/page.tsx',
      'src/app/[locale]/stickers/cost-calculator/page.tsx',
      'src/app/[locale]/stickers/tracker/page.tsx',
      'src/app/[locale]/teams/[slug]/qualified/page.tsx',
      'src/app/[locale]/travel/budget-calculator/page.tsx',
      'src/app/[locale]/travel/from/[country]/page.tsx',
      'src/app/[locale]/travel/page.tsx',
      'src/app/[locale]/travel/tickets/page.tsx',
      'src/app/[locale]/travel/visa/page.tsx',
      'src/components/layout/Breadcrumbs.tsx',
    ]

    const failures = files.filter((file) =>
      /https:\/\/kickoracle\.com(?:\/|['"`])/.test(read(file))
    )

    expect(failures).toEqual([])
  })

  it('prevents newly noindexed routes from inheriting the homepage canonical', () => {
    const layouts = [
      ['src/app/[locale]/challenges/layout.tsx', '/challenges'],
      ['src/app/[locale]/dashboard/layout.tsx', '/dashboard'],
      ['src/app/[locale]/leagues/layout.tsx', '/leagues'],
      ['src/app/[locale]/offline/layout.tsx', '/offline'],
      ['src/app/[locale]/points/layout.tsx', '/points'],
      ['src/app/[locale]/predict/layout.tsx', '/predict'],
      ['src/app/[locale]/store/layout.tsx', '/store'],
    ] as const

    for (const [file, routePath] of layouts) {
      const source = read(file)
      expect(source).toContain('generateMetadata')
      expect(source).toContain(`buildAlternates(locale, '${routePath}')`)
      expect(source).toContain('robots: { index: false, follow: true }')
    }
  })
})
