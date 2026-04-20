'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=1600&q=80&fit=crop&crop=center'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await resetPassword(email)
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
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
                If an account exists for{' '}
                <span className="text-on-surface font-bold">{email}</span>, we sent a password
                reset link.
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
            Account Recovery
          </p>
          <h2 className="font-headline text-4xl xl:text-5xl leading-[0.95] text-on-surface/90 mb-4">
            Get Back
            <br />
            <span className="text-primary">In The Game</span>
          </h2>
          <p className="text-on-surface-variant text-sm max-w-md leading-relaxed">
            Reset your password and get back to tracking your predictions and climbing the
            leaderboard.
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
              Account Recovery
            </p>
          </div>

          <div className="glass-hero-card rounded-2xl border border-white/[0.06] p-8 relative overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
              style={{ background: '#a0d494' }}
            />

            <div className="relative">
              <div className="text-center mb-8">
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
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <h1 className="font-headline text-4xl tracking-tight uppercase mb-2">
                  <span className="text-on-surface">Reset</span>{' '}
                  <span className="text-primary">Password</span>
                </h1>
                <p className="text-on-surface-variant text-sm">
                  Enter your email and we&apos;ll send a reset link
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-tight text-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-on-surface-variant">
                Remember your password?{' '}
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
