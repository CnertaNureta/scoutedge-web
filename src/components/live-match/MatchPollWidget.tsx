'use client'

import { useState, useCallback } from 'react'

interface PollOption {
  id: string
  option_text: string
  vote_count: number
  position: number
}

interface Poll {
  id: string
  question: string
  poll_type: string
  is_active: boolean
  total_votes: number
  closes_at: string | null
  created_at: string
  poll_options: PollOption[]
}

interface MatchPollWidgetProps {
  matchId: string
  polls: Poll[]
  accessToken?: string | null
  onVoteUpdate?: (pollId: string, optionVotes: Record<string, number>) => void
}

export default function MatchPollWidget({
  matchId,
  polls,
  accessToken,
  onVoteUpdate,
}: MatchPollWidgetProps) {
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set())
  const [voting, setVoting] = useState<string | null>(null)

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    if (!accessToken || votedPolls.has(pollId) || voting) return

    setVoting(optionId)
    try {
      const res = await fetch(`/api/matches/${matchId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ option_id: optionId }),
      })

      if (res.ok) {
        setVotedPolls(prev => new Set([...prev, pollId]))
      }
    } finally {
      setVoting(null)
    }
  }, [matchId, accessToken, votedPolls, voting])

  if (polls.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-on-surface-variant/50">No active polls</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-3 py-2">
      {polls.filter(p => p.is_active).map(poll => {
        const hasVoted = votedPolls.has(poll.id)
        const totalVotes = poll.total_votes || poll.poll_options.reduce((s, o) => s + o.vote_count, 0)

        return (
          <div
            key={poll.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <h4 className="font-headline text-sm font-semibold text-on-surface mb-3">
              {poll.question}
            </h4>

            <div className="space-y-2">
              {poll.poll_options
                .sort((a, b) => a.position - b.position)
                .map(option => {
                  const pct = totalVotes > 0
                    ? Math.round((option.vote_count / totalVotes) * 100)
                    : 0

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleVote(poll.id, option.id)}
                      disabled={hasVoted || !accessToken || voting === option.id}
                      className={`
                        relative w-full rounded-lg border px-4 py-2.5 text-left
                        transition-all duration-200 overflow-hidden
                        ${hasVoted
                          ? 'border-white/[0.08] cursor-default'
                          : 'border-white/[0.06] hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                        }
                        disabled:cursor-not-allowed
                      `}
                    >
                      {hasVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      )}

                      <div className="relative flex items-center justify-between">
                        <span className="text-sm text-on-surface/80">
                          {option.option_text}
                        </span>
                        {hasVoted && (
                          <span className="font-mono text-xs font-bold text-primary tabular-nums">
                            {pct}%
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </span>
              {poll.closes_at && (
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40">
                  Closes {new Date(poll.closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
