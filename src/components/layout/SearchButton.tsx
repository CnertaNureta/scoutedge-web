'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import SearchModal from './SearchModal'

export default function SearchButton() {
  const t = useTranslations('search')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('buttonPlaceholder')}
        className="hidden md:flex bg-surface-container-high hover:bg-surface-container-highest rounded-full px-4 py-2 items-center gap-2 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-on-surface-variant">{t('buttonPlaceholder')}</span>
        <kbd className="text-[11px] font-mono text-on-surface-variant/40 ml-2">&#8984;K</kbd>
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
