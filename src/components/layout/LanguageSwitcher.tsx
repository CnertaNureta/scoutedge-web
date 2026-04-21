'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const current = LOCALE_CONFIGS[locale]

  function switchLocale(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 font-label text-xs text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="Switch language"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50" role="menu">
        <div className="glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 min-w-[180px]">
          {SUPPORTED_LOCALES.map((loc) => {
            const cfg = LOCALE_CONFIGS[loc]
            const isActive = loc === locale
            return (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`w-full text-left px-4 py-2.5 font-label text-sm flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'text-primary bg-white/[0.06]'
                    : 'text-on-surface-variant hover:text-primary hover:bg-white/[0.04]'
                }`}
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="text-base">{cfg.flag}</span>
                <span>{cfg.nativeName}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
