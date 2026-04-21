'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'

export default function CreateLeaguePage() {
  const { user, loading: authLoading } = useAuth()
  const { apiFetch } = useApi()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leagueType, setLeagueType] = useState<'public' | 'private'>('public')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!authLoading && !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <GlassCard className="p-8 text-center">
          <p className="text-on-surface-variant mb-4">You need to sign in to create a league.</p>
          <Link href="/auth/login" className="text-primary font-bold hover:underline">Sign In</Link>
        </GlassCard>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiFetch('/api/leagues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          league_type: leagueType,
        }),
      })
      router.push(`/leagues/${data.league.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Link href="/leagues" className="text-sm text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">
        &larr; Back to Leagues
      </Link>

      <GlassCard className="p-8">
        <h1 className="font-display text-3xl tracking-tight text-primary mb-2">Create League</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          Set up a prediction league and invite friends to compete.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
              League Name
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
              placeholder="e.g. The Prediction Pundits"
            />
          </div>

          <div>
            <label htmlFor="desc" className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Description (optional)
            </label>
            <textarea
              id="desc"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
              placeholder="What's your league about?"
            />
          </div>

          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-3">
              League Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['public', 'private'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeagueType(type)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    leagueType === type
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <span className="block font-headline text-sm text-on-surface capitalize">{type}</span>
                  <span className="block text-xs text-on-surface-variant mt-1">
                    {type === 'public' ? 'Anyone can join' : 'Invite code required'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-tight text-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create League'}
          </button>
        </form>
      </GlassCard>
    </div>
  )
}
