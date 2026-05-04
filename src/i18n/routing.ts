import { defineRouting } from 'next-intl/routing'

export const locales = ['en', 'es', 'zh', 'pt', 'ar', 'fr', 'ja', 'ko', 'de', 'it', 'nl', 'tr', 'pl', 'id', 'ru', 'fa', 'th', 'vi', 'hu'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
})
