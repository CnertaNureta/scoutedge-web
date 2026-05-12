'use client'

import { useState, useCallback, useRef } from 'react'

const REACTIONS = [
  { key: 'goal', emoji: '\u26BD', label: 'Goal' },
  { key: 'fire', emoji: '\uD83D\uDD25', label: 'Fire' },
  { key: 'clap', emoji: '\uD83D\uDC4F', label: 'Clap' },
  { key: 'heart', emoji: '\u2764\uFE0F', label: 'Heart' },
  { key: 'shocked', emoji: '\uD83D\uDE31', label: 'Shocked' },
  { key: 'laugh', emoji: '\uD83D\uDE02', label: 'Laugh' },
  { key: 'cry', emoji: '\uD83D\uDE22', label: 'Cry' },
  { key: 'angry', emoji: '\uD83D\uDE21', label: 'Angry' },
] as const

interface MatchReactionBarProps {
  matchId: string
  minute: number | null
  reactionCounts?: Record<string, number>
  accessToken?: string | null
}

export default function MatchReactionBar({
  matchId,
  minute,
  reactionCounts = {},
  accessToken,
}: MatchReactionBarProps) {
  const [animating, setAnimating] = useState<string | null>(null)
  const cooldownRef = useRef<Set<string>>(new Set())

  const sendReaction = useCallback(async (reaction: string) => {
    if (!accessToken || cooldownRef.current.has(reaction)) return

    cooldownRef.current.add(reaction)
    setAnimating(reaction)

    try {
      await fetch(`/api/matches/${matchId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reaction, minute }),
      })
    } finally {
      setTimeout(() => {
        cooldownRef.current.delete(reaction)
        setAnimating(null)
      }, 1000)
    }
  }, [matchId, minute, accessToken])

  return (
    <div data-testid="match-reaction-bar" className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-hide">
      {REACTIONS.map(({ key, emoji, label }) => {
        const count = reactionCounts[key] ?? 0
        const isAnimating = animating === key

        return (
          <button
            key={key}
            onClick={() => sendReaction(key)}
            disabled={!accessToken}
            aria-label={label}
            className={`
              group relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2
              border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm
              transition-all duration-200
              hover:border-white/20 hover:bg-white/[0.08] hover:scale-110
              active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isAnimating ? 'scale-125 border-white/30' : ''}
            `}
          >
            <span className={`text-xl transition-transform duration-200 ${isAnimating ? 'animate-bounce' : ''}`}>
              {emoji}
            </span>
            {count > 0 && (
              <span className="font-mono text-[10px] text-on-surface-variant/70 tabular-nums">
                {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
