import { routing } from '@/i18n/routing'
import { LOCALE_CONFIGS, type Locale } from '@/i18n/locales'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://kickoracle.com'

function buildLocaleUrl(locale: string, path: string): string {
  const normalized = path === '/' || path === '' ? '' : path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}/${locale}${normalized}`
}

export interface AlternatesResult {
  canonical: string
  languages: Record<string, string>
}

export function buildAlternates(locale: string, path: string): AlternatesResult {
  const safeLocale =
    routing.locales.includes(locale as Locale) ? locale : routing.defaultLocale

  const languages: Record<string, string> = {
    'x-default': buildLocaleUrl(routing.defaultLocale, path),
  }

  for (const loc of routing.locales) {
    const cfg = LOCALE_CONFIGS[loc as Locale]
    languages[cfg.hreflang] = buildLocaleUrl(loc, path)
  }

  return {
    canonical: buildLocaleUrl(safeLocale, path),
    languages,
  }
}

export function siteUrl(): string {
  return SITE_URL
}
