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
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', flag: '🇮🇹', hreflang: 'it' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', flag: '🇳🇱', hreflang: 'nl' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷', hreflang: 'tr' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', flag: '🇵🇱', hreflang: 'pl' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩', hreflang: 'id' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺', hreflang: 'ru' },
  fa: { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', flag: '🇮🇷', hreflang: 'fa' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', flag: '🇹🇭', hreflang: 'th' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', flag: '🇻🇳', hreflang: 'vi' },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr', flag: '🇭🇺', hreflang: 'hu' },
}
