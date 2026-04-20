'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRealtimeChannel } from './useRealtimeChannel'
import {
  channels,
  RealtimeEvent,
  type CommentNewPayload,
  type ReactionBurstPayload,
  type PollVoteUpdatePayload,
  type PresenceUpdatePayload,
  type ReactionType,
} from '@/lib/realtime-channels'

type InteractionPayload =
  | CommentNewPayload
  | ReactionBurstPayload
  | PollVoteUpdatePayload
  | PresenceUpdatePayload

export interface MatchInteractionState {
  comments: CommentNewPayload[]
  reactionCounts: Record<ReactionType, number>
  viewerCount: number
  pollUpdates: Map<string, Record<string, number>>
}

const COMMENT_EVENTS = [RealtimeEvent.COMMENT_NEW]
const REACTION_EVENTS = [RealtimeEvent.REACTION_BURST]
const PRESENCE_EVENTS = [RealtimeEvent.PRESENCE_UPDATE]

export function useMatchInteractions(matchId: string | null) {
  const [comments, setComments] = useState<CommentNewPayload[]>([])
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [viewerCount, setViewerCount] = useState(0)

  const commentTopic = useMemo(
    () => (matchId ? channels.matchComments(matchId) : ''),
    [matchId],
  )
  const reactionTopic = useMemo(
    () => (matchId ? channels.matchReactions(matchId) : ''),
    [matchId],
  )
  const presenceTopic = useMemo(
    () => (matchId ? channels.matchPresence(matchId) : ''),
    [matchId],
  )

  const handleComment = useCallback((_event: string, payload: InteractionPayload) => {
    const p = payload as CommentNewPayload
    setComments(prev => [...prev.slice(-99), p])
  }, [])

  const handleReaction = useCallback((_event: string, payload: InteractionPayload) => {
    const p = payload as ReactionBurstPayload
    setReactionCounts(prev => {
      const next = { ...prev }
      for (const [key, count] of Object.entries(p.reactions)) {
        next[key] = (next[key] ?? 0) + count
      }
      return next
    })
  }, [])

  const handlePresence = useCallback((_event: string, payload: InteractionPayload) => {
    const p = payload as PresenceUpdatePayload
    setViewerCount(p.viewer_count)
  }, [])

  useRealtimeChannel<InteractionPayload>({
    topic: commentTopic,
    events: COMMENT_EVENTS,
    enabled: !!matchId,
    onMessage: handleComment,
  })

  useRealtimeChannel<InteractionPayload>({
    topic: reactionTopic,
    events: REACTION_EVENTS,
    enabled: !!matchId,
    onMessage: handleReaction,
  })

  useRealtimeChannel<InteractionPayload>({
    topic: presenceTopic,
    events: PRESENCE_EVENTS,
    enabled: !!matchId,
    onMessage: handlePresence,
  })

  return { comments, reactionCounts, viewerCount }
}
