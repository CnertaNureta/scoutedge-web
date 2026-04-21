import { locales, type Locale } from './routing'

export type { Locale }
export { locales as SUPPORTED_LOCALES }

export interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
  dir: 'ltr' | 'rtl'
  flag: string
  hreflang: string
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧', hreflang: 'en' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸', hreflang: 'es' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr', flag: '🇨🇳', hreflang: 'zh-Hans' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷', hreflang: 'pt' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦', hreflang: 'ar' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷', hreflang: 'fr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵', hreflang: 'ja' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', flag: '🇰🇷', hreflang: 'ko' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪', hreflang: 'de' },
}
