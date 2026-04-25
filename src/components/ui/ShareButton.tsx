'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface ShareButtonProps {
  url?: string
  title?: string
  text?: string
  className?: string
}

export default function ShareButton({
  url,
  title = 'KickOracle — World Cup 2026 Intelligence',
  text,
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const t = useTranslations('share')

  const handleShare = useCallback(async () => {
    const shareUrl = url || window.location.href
    const shareData = { title, text, url: shareUrl }

    // Use Web Share API on supported devices (mostly mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Final fallback for older browsers
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url, title, text])

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full
        bg-white/[0.06] border border-white/10 text-on-surface-variant text-xs
        font-label uppercase tracking-widest
        hover:border-primary/30 hover:text-primary transition-all ${className}`}
      aria-label={t('shareThisPage')}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('copied')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 10C6 10 7.5 12 10 12C12.5 12 14 10 14 8C14 6 12.5 4 10 4C8.5 4 7.5 5 7 5.5M10 6C10 6 8.5 4 6 4C3.5 4 2 6 2 8C2 10 3.5 12 6 12C7.5 12 8.5 11 9 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {t('share')}
        </>
      )}
    </button>
  )
}
