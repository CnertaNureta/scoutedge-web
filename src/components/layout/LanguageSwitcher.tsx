'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const current = LOCALE_CONFIGS[locale]
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-label text-xs text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest min-h-[40px] px-2"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Switch language"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg
          className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full right-0 pt-2 z-50"
          role="menu"
        >
          <div className="glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 min-w-[180px] max-h-[70vh] overflow-y-auto">
            {SUPPORTED_LOCALES.map((loc) => {
              const cfg = LOCALE_CONFIGS[loc]
              const isActive = loc === locale
              return (
                <Link
                  key={loc}
                  href={pathname}
                  locale={loc}
                  prefetch
                  onClick={() => setOpen(false)}
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
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
