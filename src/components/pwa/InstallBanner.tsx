'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type BannerState = 'hidden' | 'android' | 'ios'

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISSED_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export default function InstallBanner() {
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) return

    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed && Date.now() < parseInt(dismissed, 10)) return

    if (isIOS()) {
      setBannerState('ios')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setBannerState('android')
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISSED_EXPIRES_MS))
    setBannerState('hidden')
    setShowIOSGuide(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setBannerState('hidden')
    } else {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  if (bannerState === 'hidden') return null

  return (
    <div
      role="dialog"
      aria-label="Install KickOracle"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-inset-bottom"
    >
      <div className="max-w-lg mx-auto glass-panel rounded-2xl border border-outline-variant shadow-2xl overflow-hidden">
        {/* Main banner */}
        <div className="flex items-center gap-3 p-4">
          {/* Icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface leading-tight">
              Install KickOracle
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
              {bannerState === 'ios'
                ? 'Add to your Home Screen for offline access'
                : 'Get instant access & offline predictions'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {bannerState === 'android' && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-80"
              >
                Install
              </button>
            )}
            {bannerState === 'ios' && (
              <button
                onClick={() => setShowIOSGuide(!showIOSGuide)}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-80"
              >
                How?
              </button>
            )}
            <button
              onClick={dismiss}
              aria-label="Dismiss install banner"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* iOS step-by-step guide */}
        {bannerState === 'ios' && showIOSGuide && (
          <div className="border-t border-outline-variant px-4 pb-4 pt-3">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
              Add to Home Screen
            </p>
            <ol className="space-y-2">
              {[
                { icon: '⬆️', text: 'Tap the Share button in Safari' },
                { icon: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
                { icon: '✅', text: 'Tap "Add" to confirm' },
              ].map(({ icon, text }, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-on-surface-variant">
                  <span className="text-base leading-none mt-0.5" aria-hidden="true">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
