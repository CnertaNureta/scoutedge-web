import { defineRouting } from 'next-intl/routing'

export const locales = ['en', 'es', 'zh', 'pt', 'ar', 'fr', 'ja', 'ko', 'de'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
