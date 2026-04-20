'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { trackEvent } from '@/lib/analytics'

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&h=1600&q=80&fit=crop&crop=center'

export default function RegisterPage() {
  const { signUp, signInWithProvider } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: authError } = await signUp(email, password, displayName || undefined)
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      trackEvent({ event: 'registration_complete', method: 'email' })
      setSuccess(true)
      setLoading(false)
    }
  }

  async function handleSocial(provider: 'google' | 'apple') {
    setError('')
    const { error: authError } = await signInWithProvider(provider)
    if (authError) {
      setError(authError.message)
    } else {
      trackEvent({ event: 'registration_complete', method: provider })
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="glass-hero-card rounded-2xl border border-white/[0.06] p-8 text-center relative overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
              style={{ background: '#a0d494' }}
            />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="font-headline text-3xl tracking-tight uppercase text-primary mb-2">
                Check your email
              </h1>
              <p className="text-on-surface-variant text-sm mb-6">
                We sent a confirmation link to{' '}
                <span className="text-on-surface font-bold">{email}</span>. Click the link to
                activate your account.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2.5 rounded-xl border border-white/[0.08] text-on-surface font-label font-bold tracking-tight hover:bg-white/[0.04] transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      {/* Left: Cinematic image panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src={AUTH_HERO_IMAGE}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
          style={{ filter: 'brightness(0.3) saturate(1.3)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30" />

        <div className="absolute bottom-12 left-10 right-10 z-10">
          <p className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/80 mb-3">
            Join the Community
          </p>
          <h2 className="font-headline text-4xl xl:text-5xl leading-[0.95] text-on-surface/90 mb-4">
            Predict.
            <br />
            Compete.
            <br />
            <span className="text-primary">Win.</span>
          </h2>
          <p className="text-on-surface-variant text-sm max-w-md leading-relaxed">
            Create prediction leagues with friends, climb the global leaderboard, and prove your
            football IQ before the World Cup kicks off.
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(160,212,148,0.5), rgba(96,165,250,0.4), transparent)',
          }}
        />
      </div>

      {/* Right: Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <p className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/70 mb-2">
              World Cup 2026
            </p>
          </div>

          <div className="glass-hero-card rounded-2xl border border-white/[0.06] p-8 relative overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
              style={{ background: '#a0d494' }}
            />

            <div className="relative">
              <div className="text-center mb-8">
                <h1 className="font-headline text-4xl tracking-tight uppercase mb-2">
                  <span className="text-on-surface">Create</span>{' '}
                  <span className="text-primary">Account</span>
                </h1>
                <p className="text-on-surface-variant text-sm">
                  Join KickOracle for premium World Cup intel
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2"
                  >
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="Your name (optional)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-tight text-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label">
                  or
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleSocial('google')}
                  className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-on-surface font-label font-bold tracking-tight hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => handleSocial('apple')}
                  className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-on-surface font-label font-bold tracking-tight hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-primary/80 font-bold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
