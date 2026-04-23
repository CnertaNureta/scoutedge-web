/**
 * Supabase Realtime channel definitions for ScoutEdge live data.
 *
 * Transport: Supabase Realtime (Broadcast + Postgres Changes)
 * Channels use a topic:entity_id convention for granular subscriptions.
 */

// ---------------------------------------------------------------------------
// Channel topic builders
// ---------------------------------------------------------------------------

export const channels = {
  matchLive: (matchId: string) => `match:${matchId}:live`,
  matchComments: (matchId: string) => `match:${matchId}:comments`,
  matchReactions: (matchId: string) => `match:${matchId}:reactions`,
  matchPolls: (matchId: string) => `match:${matchId}:polls`,
  matchPresence: (matchId: string) => `match:${matchId}:presence`,
  oddsMovement: (matchId: string) => `odds:${matchId}:movement`,
  signalsFeed: () => 'signals:global:feed',
  teamSignals: (teamSlug: string) => `signals:team:${teamSlug}`,
} as const

// ---------------------------------------------------------------------------
// Event names (sent as `event` in Supabase Broadcast)
// ---------------------------------------------------------------------------

export const RealtimeEvent = {
  MATCH_STATUS_CHANGE: 'match:status_change',
  MATCH_SCORE_UPDATE: 'match:score_update',
  MATCH_MINUTE_UPDATE: 'match:minute_update',
  MATCH_INCIDENT: 'match:incident',
  COMMENT_NEW: 'comment:new',
  COMMENT_LIKED: 'comment:liked',
  REACTION_BURST: 'reaction:burst',
  POLL_CREATED: 'poll:created',
  POLL_VOTE_UPDATE: 'poll:vote_update',
  PRESENCE_UPDATE: 'presence:update',
  ODDS_SHIFT: 'odds:shift',
  ODDS_SHARP_MOVE: 'odds:sharp_move',
  SIGNAL_NEW: 'signal:new',
  SIGNAL_UPGRADED: 'signal:upgraded',
} as const

export type RealtimeEventType = (typeof RealtimeEvent)[keyof typeof RealtimeEvent]

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface MatchStatusPayload {
  match_id: string
  previous_status: string
  new_status: string
  minute: number | null
  timestamp: string
}

export interface MatchScorePayload {
  match_id: string
  home_score: number
  away_score: number
  scorer: string | null
  minute: number
  timestamp: string
}

export interface MatchMinutePayload {
  match_id: string
  minute: number
  period: 'first_half' | 'second_half' | 'extra_first' | 'extra_second'
  timestamp: string
}

export interface MatchIncidentPayload {
  match_id: string
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var_decision' | 'penalty'
  player: string | null
  team_id: string | null
  minute: number
  detail: string | null
  timestamp: string
}

export interface OddsShiftPayload {
  match_id: string
  market: string
  source: string
  previous_odds: Record<string, number>
  current_odds: Record<string, number>
  shift_pct: number
  timestamp: string
}

export interface OddsSharpMovePayload {
  match_id: string
  market: string
  direction: 'home' | 'away' | 'draw' | 'over' | 'under'
  magnitude: number
  source_count: number
  timestamp: string
}

export interface SignalNewPayload {
  signal_id: string
  signal_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  team_slug: string | null
  headline: string
  source: string
  timestamp: string
}

export interface SignalUpgradedPayload {
  signal_id: string
  previous_severity: string
  new_severity: string
  reason: string
  timestamp: string
}

// --- Interaction Payloads ---

export type ReactionType = 'goal' | 'fire' | 'clap' | 'cry' | 'angry' | 'laugh' | 'heart' | 'shocked'

export interface CommentNewPayload {
  id: string
  match_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  body: string
  minute: number | null
  created_at: string
}

export interface CommentLikedPayload {
  comment_id: string
  likes_count: number
  timestamp: string
}

export interface ReactionBurstPayload {
  match_id: string
  minute: number | null
  reactions: Record<ReactionType, number>
  timestamp: string
}

export interface PollCreatedPayload {
  id: string
  match_id: string
  question: string
  options: { id: string; option_text: string; position: number }[]
  closes_at: string | null
  created_at: string
}

export interface PollVoteUpdatePayload {
  poll_id: string
  option_id: string
  total_votes: number
  option_votes: Record<string, number>
  timestamp: string
}

export interface PresenceUpdatePayload {
  match_id: string
  viewer_count: number
  timestamp: string
}

export type RealtimePayloadMap = {
  [RealtimeEvent.MATCH_STATUS_CHANGE]: MatchStatusPayload
  [RealtimeEvent.MATCH_SCORE_UPDATE]: MatchScorePayload
  [RealtimeEvent.MATCH_MINUTE_UPDATE]: MatchMinutePayload
  [RealtimeEvent.MATCH_INCIDENT]: MatchIncidentPayload
  [RealtimeEvent.COMMENT_NEW]: CommentNewPayload
  [RealtimeEvent.COMMENT_LIKED]: CommentLikedPayload
  [RealtimeEvent.REACTION_BURST]: ReactionBurstPayload
  [RealtimeEvent.POLL_CREATED]: PollCreatedPayload
  [RealtimeEvent.POLL_VOTE_UPDATE]: PollVoteUpdatePayload
  [RealtimeEvent.PRESENCE_UPDATE]: PresenceUpdatePayload
  [RealtimeEvent.ODDS_SHIFT]: OddsShiftPayload
  [RealtimeEvent.ODDS_SHARP_MOVE]: OddsSharpMovePayload
  [RealtimeEvent.SIGNAL_NEW]: SignalNewPayload
  [RealtimeEvent.SIGNAL_UPGRADED]: SignalUpgradedPayload
}
