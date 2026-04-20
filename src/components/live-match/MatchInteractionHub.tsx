'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMatchInteractions } from '@/hooks/useMatchInteractions'
import MatchCommentSection from './MatchCommentSection'
import MatchReactionBar from './MatchReactionBar'
import MatchPollWidget from './MatchPollWidget'

type Tab = 'comments' | 'polls'

interface Poll {
  id: string
  question: string
  poll_type: string
  is_active: boolean
  total_votes: number
  closes_at: string | null
  created_at: string
  poll_options: {
    id: string
    option_text: string
    vote_count: number
    position: number
  }[]
}

interface MatchInteractionHubProps {
  matchId: string
  minute: number | null
  accessToken?: string | null
  viewerCount?: number
}

export default function MatchInteractionHub({
  matchId,
  minute,
  accessToken,
  viewerCount: initialViewerCount,
}: MatchInteractionHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>('comments')
  const [polls, setPolls] = useState<Poll[]>([])

  const { comments, reactionCounts, viewerCount } = useMatchInteractions(matchId)

  useEffect(() => {
    const loadPolls = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/polls`)
        const data = await res.json()
        setPolls(data.polls ?? [])
      } catch {
        // non-critical
      }
    }
    loadPolls()
  }, [matchId])

  useEffect(() => {
    if (!accessToken) return

    const heartbeat = () => {
      fetch(`/api/matches/${matchId}/presence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {})
    }

    heartbeat()
    const interval = setInterval(heartbeat, 60_000)
    return () => clearInterval(interval)
  }, [matchId, accessToken])

  const displayViewerCount = viewerCount || initialViewerCount || 0

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'comments', label: 'Chat', count: comments.length || undefined },
    { key: 'polls', label: 'Polls', count: polls.filter(p => p.is_active).length || undefined },
  ]

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl overflow-hidden h-[560px] md:h-[640px]">
      {/* Reaction bar */}
      <div className="shrink-0 border-b border-white/[0.06] px-2">
        <MatchReactionBar
          matchId={matchId}
          minute={minute}
          reactionCounts={reactionCounts}
          accessToken={accessToken}
        />
      </div>

      {/* Tab header */}
      <div className="shrink-0 flex items-center gap-1 border-b border-white/[0.06] px-3 py-1.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-1.5
              font-label text-xs font-semibold uppercase tracking-widest
              transition-all duration-200
              ${activeTab === tab.key
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/[0.05]'
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                rounded-full px-1.5 py-0.5 font-mono text-[9px]
                ${activeTab === tab.key ? 'bg-primary/20 text-primary' : 'bg-white/[0.08] text-on-surface-variant/50'}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}

        {displayViewerCount > 0 && (
          <span className="ml-auto flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {displayViewerCount.toLocaleString()} live
          </span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'comments' && (
          <MatchCommentSection
            matchId={matchId}
            minute={minute}
            accessToken={accessToken}
            realtimeComments={comments}
          />
        )}
        {activeTab === 'polls' && (
          <MatchPollWidget
            matchId={matchId}
            polls={polls}
            accessToken={accessToken}
          />
        )}
      </div>
    </div>
  )
}
