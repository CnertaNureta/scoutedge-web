import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <h1 className="font-headline text-3xl uppercase tracking-wide text-primary mb-3">Sign In</h1>
          <p className="text-on-surface-variant mb-8">
            Account system launching soon. Sign up to get notified when Pro features go live.
          </p>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 border border-white/[0.06] focus:border-primary/40 focus:outline-none transition-colors"
            />
            <button className="w-full bg-primary text-on-primary px-6 py-3 rounded-xl font-label font-bold uppercase tracking-widest hover:brightness-110 transition-all">
              Get Notified
            </button>
          </div>

          <p className="text-xs text-on-surface-variant mt-6">
            <Link href="/" className="text-primary hover:underline">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
