'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { OgMatchMetadata } from './og-metadata'

export type { OgMatchMetadata } from './og-metadata'

// ---------------------------------------------------------------------------
// Primitive types
// ---------------------------------------------------------------------------

export type Outcome = 'home_win' | 'draw' | 'away_win'
export type ProbDict = Record<Outcome, number>
export type Confidence = 'high' | 'medium' | 'low'
export type Language = 'en' | 'zh' | 'es' | 'ja' | 'ko' | 'fr' | 'de' | 'pt' | 'it' | 'ar'

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface FullPrediction {
  match_id: string
  final_probs: ProbDict
  ml_probs: ProbDict
  sb_probs: ProbDict
  poly_probs: ProbDict | null
  weights: Record<'ml' | 'sb' | 'poly', number>
  diagnosis: Record<string, unknown> | null
  synthesizer_raw: Record<string, unknown>
  confidence: Confidence
  expected_margin: number
  risk_factor: string | null
  rationale: string
  flags: string[]
  feature_generator_output: Record<string, unknown> | null
  divergence_features: Record<string, unknown>
  explanation_text: string | null
}

export interface ExplainResponse {
  match_id: string
  explanation: string
  language: Language
  factors: Array<{ name: string; weight: number; direction: 'home' | 'away' | 'neutral' }>
}

export interface LivePredictionResponse {
  match_id: string
  minute: number
  current_probs: ProbDict
  momentum: 'home' | 'away' | 'balanced'
  live_events: Array<{ type: string; team: string; minute: number }>
  updated_at: string
}

export interface RemixRequest {
  match_id: string
  overrides: Record<string, unknown>
  language?: Language
}

export interface RemixResponse {
  final_probs: ProbDict
  weights_used: Record<'ml' | 'sb' | 'poly', number>
  overrides_applied: Record<string, number>
  delta_from_base: ProbDict
}

export interface FeedbackRequest {
  match_id: string
  user_id: string
  agreed: boolean
  comment?: string
}

export interface FeedbackResponse {
  accepted: boolean
  feedback_id: string
}

export type DuelConfidence = 'low' | 'medium' | 'high'

export interface DuelSubmitRequest {
  match_id: string
  user_id: string
  home_score: number
  away_score: number
  prob_home: number
  prob_draw: number
  prob_away: number
  confidence_level: DuelConfidence
}

export interface DuelSubmitResponse {
  ok: boolean
  user_prediction_id: string
  ai_snapshot: Record<string, unknown>
}

export interface DuelScorecardResponse {
  user_id: string
  total_duels: number
  wins: number
  losses: number
  draws: number
  score: number
  recent: Array<{ duel_id: string; outcome: string; correct: boolean; created_at: string }>
}

export interface DuelLeaderboardResponse {
  updated_at: string
  entries: Array<{ rank: number; user_id: string; score: number; wins: number }>
}

export interface BaseBracketResponse {
  version: string
  stages: {
    group: Array<{ group: string; teams: string[]; predicted_top2: string[] }>
    r16: Array<{ slot: string; predicted_winner: string; p_win: number }>
    qf: Array<{ slot: string; predicted_winner: string; p_win: number }>
    sf: Array<{ slot: string; predicted_winner: string; p_win: number }>
    final: { predicted_winner: string; p_win: number }
  }
}

export interface BracketForkRequest {
  user_id: string
  parent_fork_id?: string | null
  bracket_data: Record<string, unknown>
  forked_at_match_id?: string | null
}

export interface BracketForkResponse {
  id: string
  share_url?: string
  parent_fork_id?: string | null
  bracket_data?: Record<string, unknown>
  score?: number | null
  user_id?: string
  created_at?: string
  fork_count?: number
}

// Live WebSocket frame
export interface LiveFrame {
  type: 'update' | 'ping' | 'close'
  payload?: LivePredictionResponse
}

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'BridgeError'
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface BridgeConfig {
  baseUrl: string
  apiKey?: string
}

let _config: BridgeConfig = {
  baseUrl:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SCOUTEDGE_API_URL
      ? process.env.NEXT_PUBLIC_SCOUTEDGE_API_URL
      : '/api',
}

export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = _config

export function configureBridge(cfg: Partial<BridgeConfig>): void {
  _config = { ..._config, ...cfg }
}

function toWebSocketBase(baseUrl: string): string {
  const hasProtocol = /^(https?|wss?):\/\//i.test(baseUrl)
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost'
  const url = new URL(hasProtocol ? baseUrl : baseUrl || '/api', origin)
  const protocol = url.protocol.toLowerCase()
  const wsProtocol = protocol === 'https:' || protocol === 'wss:' ? 'wss:' : 'ws:'
  const path = url.pathname.replace(/\/api\/?$/i, '').replace(/\/+$/, '')

  return `${wsProtocol}//${url.host}${path}`
}

// ---------------------------------------------------------------------------
// In-memory cache (30s TTL, safe GETs only)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000

interface CacheEntry<T> {
  at: number
  value: T
}

const _cache = new Map<string, CacheEntry<unknown>>()

function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    _cache.delete(key)
    return undefined
  }
  return entry.value as T
}

function cacheSet<T>(key: string, value: T): void {
  _cache.set(key, { at: Date.now(), value })
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  init: RequestInit & { skipCache?: boolean } = {},
): Promise<T> {
  const { skipCache, ...fetchInit } = init
  const url = `${_config.baseUrl}${path}`
  const method = (fetchInit.method ?? 'GET').toUpperCase()
  const isGet = method === 'GET'

  // Cache bypass conditions: non-GET, skipCache flag, or ?nocache=1 in path
  const bypassCache = !isGet || skipCache || path.includes('nocache=1')

  if (!bypassCache) {
    const cached = cacheGet<T>(url)
    if (cached !== undefined) return cached
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers ?? {}),
  }

  if (_config.apiKey) {
    ;(headers as Record<string, string>)['X-API-Key'] = _config.apiKey
  }

  const response = await fetch(url, {
    ...fetchInit,
    headers,
  })

  if (!response.ok) {
    const retryable = response.status >= 500
    const body = await response.text().catch(() => '')
    throw new BridgeError(
      retryable
        ? `Server error ${response.status} — retry later. ${body}`.trim()
        : `Request failed with status ${response.status}. ${body}`.trim(),
      response.status,
      retryable,
    )
  }

  const data: T = (await response.json()) as T

  if (!bypassCache) {
    cacheSet<T>(url, data)
  }

  return data
}

// ---------------------------------------------------------------------------
// REST functions
// ---------------------------------------------------------------------------

export async function getMatchPrediction(
  matchId: string,
  opts?: { language?: Language },
): Promise<FullPrediction> {
  const qs = opts?.language ? `?language=${opts.language}` : ''
  return request<FullPrediction>(`/predict/match/${encodeURIComponent(matchId)}${qs}`)
}

export async function getMatchExplain(
  matchId: string,
  opts?: { language?: Language },
): Promise<ExplainResponse> {
  const qs = opts?.language ? `?language=${opts.language}` : ''
  return request<ExplainResponse>(`/predict/match/${encodeURIComponent(matchId)}/explain${qs}`)
}

export async function getMatchLive(matchId: string): Promise<LivePredictionResponse> {
  return request<LivePredictionResponse>(`/predict/match/${encodeURIComponent(matchId)}/live`, {
    cache: 'no-store',
    skipCache: true,
  })
}

export async function postRemix(input: RemixRequest): Promise<RemixResponse> {
  return request<RemixResponse>('/predict/remix', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// TODO (P8.2): GET /api/divergence/match/{match_id} — endpoint not yet implemented server-side.
// Stub: export async function getMatchDivergence(matchId: string): Promise<unknown> { ... }

export async function postDivergenceFeedback(input: FeedbackRequest): Promise<FeedbackResponse> {
  return request<FeedbackResponse>('/divergence/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function postDuelSubmit(input: DuelSubmitRequest): Promise<DuelSubmitResponse> {
  return request<DuelSubmitResponse>('/duel/submit', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getDuelScorecard(
  userId: string,
  opts?: { limit?: number; only_finished?: boolean },
): Promise<DuelScorecardResponse> {
  const params = new URLSearchParams()
  if (opts?.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts?.only_finished !== undefined) params.set('only_finished', String(opts.only_finished))
  const qs = params.size > 0 ? `?${params.toString()}` : ''
  return request<DuelScorecardResponse>(`/duel/scorecard/${encodeURIComponent(userId)}${qs}`)
}

export async function getDuelLeaderboard(opts?: { top_n?: number }): Promise<DuelLeaderboardResponse> {
  const qs = opts?.top_n !== undefined ? `?top_n=${opts.top_n}` : ''
  return request<DuelLeaderboardResponse>(`/duel/leaderboard${qs}`)
}

export async function getBaseBracket(): Promise<BaseBracketResponse> {
  return request<BaseBracketResponse>('/bracket/base')
}

export async function getBracketFork(forkId: string): Promise<BracketForkResponse> {
  return request<BracketForkResponse>(`/bracket/${encodeURIComponent(forkId)}`)
}

export async function postBracketFork(input: BracketForkRequest): Promise<BracketForkResponse> {
  return request<BracketForkResponse>('/bracket/fork', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getOgMatchMetadata(matchId: string): Promise<OgMatchMetadata> {
  return request<OgMatchMetadata>(`/og/match/${encodeURIComponent(matchId)}`, {
    skipCache: true,
  })
}

// ---------------------------------------------------------------------------
// React hook — lightweight SWR-shaped, no external dep
// ---------------------------------------------------------------------------

export function usePrediction(
  matchId: string | null,
  opts?: { language?: Language },
): {
  data: FullPrediction | null
  error: Error | null
  isLoading: boolean
  refetch: () => void
} {
  const [data, setData] = useState<FullPrediction | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  // Increment to trigger re-fetch
  const [tick, setTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!matchId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    getMatchPrediction(matchId, opts)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, opts?.language, tick])

  return { data, error, isLoading, refetch }
}

// ---------------------------------------------------------------------------
// WebSocket helper
// ---------------------------------------------------------------------------

export function openLiveSocket(
  matchId: string,
  handlers: {
    onMessage: (frame: LiveFrame) => void
    onClose?: () => void
    onError?: (e: Event) => void
  },
): { close: () => void } {
  const wsBase = toWebSocketBase(_config.baseUrl)
  const wsUrl = `${wsBase}/ws/live/${encodeURIComponent(matchId)}`
  const ws = new WebSocket(wsUrl)

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ action: 'subscribe' }))
  })

  ws.addEventListener('message', (event: MessageEvent) => {
    try {
      const frame = JSON.parse(event.data as string) as LiveFrame
      handlers.onMessage(frame)
    } catch {
      // Malformed frame — ignore silently
    }
  })

  ws.addEventListener('close', () => {
    handlers.onClose?.()
  })

  ws.addEventListener('error', (e: Event) => {
    handlers.onError?.(e)
  })

  return {
    close() {
      ws.close()
    },
  }
}
