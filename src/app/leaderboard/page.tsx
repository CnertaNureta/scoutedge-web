'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import GlassCard from '@/components/ui/GlassCard'

interface LeaderboardEntry {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  favorite_team_slug: string | null
  total_points: number
  correct_predictions: number
  exact_scores: number
  total_predictions: number
  accuracy_pct: number
  rank: number
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard/global?limit=100')
      .then(r => r.json())
      .then(data => setEntries(data.leaderboard ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const podiumColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-primary">Global Leaderboard</h1>
          <p className="text-on-surface-variant mt-2">
            Top prediction masters across all leagues.
          </p>
        </div>
        <Link
          href="/predict"
          className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all whitespace-nowrap"
        >
          Make Predictions
        </Link>
      </div>

      {loading && (
        <GlassCard className="p-6">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-14 bg-white/[0.06] rounded animate-pulse" />
            ))}
          </div>
        </GlassCard>
      )}

      {!loading && entries.length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-on-surface-variant text-lg mb-4">No one has scored yet. Be the first!</p>
          <Link href="/predict" className="text-primary font-bold hover:underline">Start Predicting</Link>
        </GlassCard>
      )}

      {!loading && entries.length > 0 && (
        <>
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[entries[1], entries[0], entries[2]].map((entry, idx) => {
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3
                const height = idx === 1 ? 'h-32' : 'h-24'
                return (
                  <GlassCard key={entry.user_id} className={`p-4 text-center flex flex-col items-center justify-end ${height}`}>
                    <span className={`text-3xl font-bold ${podiumColors[actualRank - 1]}`}>
                      {actualRank === 1 ? '👑' : `#${actualRank}`}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm mt-2">
                      {(entry.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <p className="text-on-surface font-bold text-sm mt-1 truncate w-full">{entry.display_name ?? 'Anonymous'}</p>
                    <p className="text-primary font-bold">{entry.total_points} pts</p>
                  </GlassCard>
                )
              })}
            </div>
          )}

          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-on-surface-variant uppercase tracking-widest border-b border-white/[0.06]">
                    <th className="text-left py-4 px-6">#</th>
                    <th className="text-left py-4 px-4">Player</th>
                    <th className="text-right py-4 px-4">Points</th>
                    <th className="text-right py-4 px-4 hidden sm:table-cell">Accuracy</th>
                    <th className="text-right py-4 px-4 hidden md:table-cell">Exact</th>
                    <th className="text-right py-4 px-6 hidden md:table-cell">Predictions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                        entry.user_id === user?.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className={`font-bold ${entry.rank <= 3 ? podiumColors[entry.rank - 1] : 'text-on-surface-variant'}`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {(entry.display_name ?? '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-on-surface font-medium">{entry.display_name ?? 'Anonymous'}</p>
                            {entry.favorite_team_slug && (
                              <p className="text-xs text-on-surface-variant">{entry.favorite_team_slug}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-primary text-lg">{entry.total_points}</td>
                      <td className="py-4 px-4 text-right text-on-surface-variant hidden sm:table-cell">{entry.accuracy_pct}%</td>
                      <td className="py-4 px-4 text-right text-on-surface-variant hidden md:table-cell">{entry.exact_scores}</td>
                      <td className="py-4 px-6 text-right text-on-surface-variant hidden md:table-cell">{entry.total_predictions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
