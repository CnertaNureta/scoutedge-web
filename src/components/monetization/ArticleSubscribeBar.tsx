'use client'

import { useState } from 'react'

export default function ArticleSubscribeBar() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'article' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error === 'Already subscribed' ? 'Already subscribed!' : data.error || 'Something went wrong.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-surface-container/95 backdrop-blur-xl">
      <div className="max-w-[800px] mx-auto px-4 py-3">
        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-primary font-semibold">Check your inbox to confirm!</span>
            <button
              onClick={() => setDismissed(true)}
              className="text-on-surface-variant/60 hover:text-on-surface text-xs ml-4"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant text-sm shrink-0 hidden sm:inline">
              Get daily predictions in your inbox
            </span>
            <span className="text-on-surface-variant text-xs shrink-0 sm:hidden">
              Daily predictions
            </span>
            <form onSubmit={handleSubmit} className="flex gap-2 flex-1 min-w-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
              >
                {loading ? '...' : 'Subscribe'}
              </button>
            </form>
            <button
              onClick={() => setDismissed(true)}
              className="text-on-surface-variant/60 hover:text-on-surface text-lg leading-none shrink-0"
              aria-label="Close subscribe bar"
            >
              &times;
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-[10px] mt-1 text-center">{error}</p>}
      </div>
    </div>
  )
}
