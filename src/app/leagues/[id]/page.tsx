'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'

interface LeagueDetail {
  league: {
    id: string
    name: string
    description: string | null
    league_type: 'public' | 'private'
    tier: string
    invite_code: string | null
    max_members: number
    season: string
    is_active: boolean
    created_by: string
  }
  members: Array<{
    user_id: string
    role: string
    joined_at: string
    user_profiles: { display_name: string | null; avatar_url: string | null; favorite_team_slug: string | null }
  }>
  standings: Array<{
    user_id: string
    display_name: string | null
    avatar_url: string | null
    total_points: number
    correct_predictions: number
    exact_scores: number
    total_predictions: number
    rank: number
  }>
  is_member: boolean
  member_count: number
}

export default function LeagueDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const { apiFetch, isAuthenticated } = useApi()
  const [data, setData] = useState<LeagueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const leagueId = params.id as string

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    apiFetch(`/api/leagues/${leagueId}`)
      .then(setData)
      .catch(() => setError('Failed to load league'))
      .finally(() => setLoading(false))
  }, [leagueId, isAuthenticated, apiFetch])

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await apiFetch(`/api/leagues/${leagueId}/join`, {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode || undefined }),
      })
      const refreshed = await apiFetch(`/api/leagues/${leagueId}`)
      setData(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 animate-pulse">
          <div className="h-8 bg-white/[0.06] rounded w-1/3 mb-4" />
          <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-8" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.06] rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <GlassCard className="p-8 text-center">
          <p className="text-on-surface-variant">{error || 'League not found'}</p>
          <Link href="/leagues" className="text-primary font-bold mt-4 inline-block">Back to Leagues</Link>
        </GlassCard>
      </div>
    )
  }

  const { league, members, standings, is_member } = data
  const isOwner = user?.id === league.created_by

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/leagues" className="text-sm text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">
        &larr; Back to Leagues
      </Link>

      <GlassCard className="p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight text-primary">{league.name}</h1>
            {league.description && (
              <p className="text-on-surface-variant mt-2">{league.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/[0.06] text-on-surface-variant capitalize">
              {league.league_type}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary capitalize">
              {league.tier}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-on-surface-variant">
          <span>{members.length} / {league.max_members} members</span>
          <span>Season {league.season}</span>
        </div>

        {league.league_type === 'private' && isOwner && league.invite_code && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">Invite Code: </span>
            <code className="text-amber-300 font-mono ml-2">{league.invite_code}</code>
          </div>
        )}
      </GlassCard>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!is_member && user && (
        <GlassCard className="p-6 mb-8">
          <h2 className="font-headline text-lg text-on-surface mb-4">Join This League</h2>
          {league.league_type === 'private' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-white/[0.08] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join League'}
          </button>
        </GlassCard>
      )}

      {is_member && (
        <div className="mb-8">
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Make Predictions
          </Link>
        </div>
      )}

      <GlassCard className="p-6">
        <h2 className="font-headline text-xl uppercase tracking-widest text-on-surface-variant mb-6">
          Leaderboard
        </h2>

        {standings.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">
            No scores yet. Make predictions and wait for matches to finish!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-on-surface-variant uppercase tracking-widest border-b border-white/[0.06]">
                  <th className="text-left py-3 pr-4">#</th>
                  <th className="text-left py-3 pr-4">Player</th>
                  <th className="text-right py-3 pr-4">Points</th>
                  <th className="text-right py-3 pr-4">Correct</th>
                  <th className="text-right py-3 pr-4">Exact</th>
                  <th className="text-right py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.user_id}
                    className={`border-b border-white/[0.04] ${row.user_id === user?.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${row.rank <= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {(row.display_name ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="text-on-surface font-medium">
                          {row.display_name ?? 'Anonymous'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-primary">{row.total_points}</td>
                    <td className="py-3 pr-4 text-right text-on-surface-variant">{row.correct_predictions}</td>
                    <td className="py-3 pr-4 text-right text-on-surface-variant">{row.exact_scores}</td>
                    <td className="py-3 text-right text-on-surface-variant">{row.total_predictions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
