'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CommentNewPayload } from '@/lib/realtime-channels'

interface Comment {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  body: string
  minute: number | null
  likes_count: number
  is_pinned: boolean
  created_at: string
}

interface MatchCommentSectionProps {
  matchId: string
  minute: number | null
  accessToken?: string | null
  realtimeComments?: CommentNewPayload[]
}

export default function MatchCommentSection({
  matchId,
  minute,
  accessToken,
  realtimeComments = [],
}: MatchCommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/comments?limit=30`)
        const data = await res.json()
        setComments(data.comments ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [matchId])

  useEffect(() => {
    if (realtimeComments.length === 0) return

    const latest = realtimeComments[realtimeComments.length - 1]
    setComments(prev => {
      if (prev.some(c => c.id === latest.id)) return prev
      return [{
        id: latest.id,
        user_id: latest.user_id,
        display_name: latest.display_name,
        avatar_url: latest.avatar_url,
        body: latest.body,
        minute: latest.minute,
        likes_count: 0,
        is_pinned: false,
        created_at: latest.created_at,
      }, ...prev]
    })
  }, [realtimeComments])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !accessToken || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: text.trim(), minute }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setComments(prev => [comment, ...prev])
        setText('')
      }
    } finally {
      setSending(false)
    }
  }, [matchId, text, minute, accessToken, sending])

  const handleLike = useCallback(async (commentId: string) => {
    if (!accessToken) return

    await fetch(`/api/matches/${matchId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, likes_count: c.likes_count + 1 } : c
    ))
  }, [matchId, accessToken])

  return (
    <div data-testid="match-comment-section" className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 px-3 py-2 min-h-0 scrollbar-thin scrollbar-thumb-white/10"
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant/60 py-8">
            No comments yet. Be the first!
          </p>
        )}

        {comments.map(comment => (
          <div
            key={comment.id}
            className={`
              group rounded-xl border border-white/[0.05] bg-white/[0.02] p-3
              transition-colors hover:border-white/10
              ${comment.is_pinned ? 'border-secondary/30 bg-secondary/5' : ''}
            `}
          >
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase text-white">
                  {comment.display_name.slice(0, 2)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-label text-xs font-semibold text-on-surface truncate">
                    {comment.display_name}
                  </span>
                  {comment.minute !== null && (
                    <span className="shrink-0 font-mono text-[10px] text-on-surface-variant/50">
                      {comment.minute}&apos;
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface/80 mt-0.5 break-words">
                  {comment.body}
                </p>
              </div>

              <button
                onClick={() => handleLike(comment.id)}
                disabled={!accessToken}
                className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs
                  text-on-surface-variant/50 transition-colors
                  hover:text-secondary hover:bg-secondary/10
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {comment.likes_count > 0 && (
                  <span className="tabular-nums">{comment.likes_count}</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-white/[0.06] px-3 py-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={accessToken ? 'Say something...' : 'Sign in to comment'}
            disabled={!accessToken}
            maxLength={500}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
              text-sm text-on-surface placeholder:text-on-surface-variant/40
              focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20
              disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!text.trim() || !accessToken || sending}
            className="shrink-0 rounded-xl bg-primary/20 border border-primary/30 px-4 py-2.5
              font-label text-xs font-bold uppercase tracking-widest text-primary
              transition-all hover:bg-primary/30 hover:border-primary/50
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
