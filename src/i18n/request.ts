import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale
  }

  const messages = (await import(`../../messages/${locale}.json`)).default

  if (locale === routing.defaultLocale) {
    return { locale, messages }
  }

  const defaultMessages = (await import(`../../messages/${routing.defaultLocale}.json`)).default

  return {
    locale,
    messages: deepMerge(defaultMessages, messages),
  }
})

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(override)) {
    if (
      typeof result[key] === 'object' &&
      result[key] !== null &&
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        override[key] as Record<string, unknown>,
      )
    } else {
      result[key] = override[key]
    }
  }
  return result
}
