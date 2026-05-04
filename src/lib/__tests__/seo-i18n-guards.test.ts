import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function read(filePath: string): string {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8')
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
