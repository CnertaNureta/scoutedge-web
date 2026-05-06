import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getOgMatchMetadata, type OgMatchMetadata } from '@/lib/prediction-bridge'

export const runtime = 'edge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OgType = 'match' | 'bracket' | 'slayer'

interface BracketOgMetadata {
  fork_id: string
  user_id: string
  headline: string
  subline: string
  rounds: number
  created_at: string
}

interface SlayerOgMetadata {
  user_id: string
  headline: string
  subline: string
  wins: number
  total_duels: number
  score: number
}

type OgMetadata =
  | { type: 'match'; data: OgMatchMetadata }
  | { type: 'bracket'; data: BracketOgMetadata }
  | { type: 'slayer'; data: SlayerOgMetadata }

// ---------------------------------------------------------------------------
// Cache headers
// ---------------------------------------------------------------------------

const CACHE_CONTROL = 'public, max-age=1800, s-maxage=3600'

// ---------------------------------------------------------------------------
// Image dimensions
// ---------------------------------------------------------------------------

const OG_WIDTH = 1200
const OG_HEIGHT = 630

// ---------------------------------------------------------------------------
// Metadata fetchers
// ---------------------------------------------------------------------------

async function fetchMatchMetadata(id: string): Promise<OgMetadata> {
  const data = await getOgMatchMetadata(id)
  return { type: 'match', data }
}

async function fetchBracketMetadata(id: string): Promise<OgMetadata> {
  const apiUrl = process.env.NEXT_PUBLIC_SCOUTEDGE_API_URL ?? '/api'
  const res = await fetch(`${apiUrl}/og/bracket/${encodeURIComponent(id)}`)
  if (!res.ok) {
    throw new Error(`Bracket metadata fetch failed: ${res.status}`)
  }
  const data = (await res.json()) as BracketOgMetadata
  return { type: 'bracket', data }
}

async function fetchSlayerMetadata(id: string): Promise<OgMetadata> {
  const apiUrl = process.env.NEXT_PUBLIC_SCOUTEDGE_API_URL ?? '/api'
  const res = await fetch(`${apiUrl}/og/slayer/${encodeURIComponent(id)}`)
  if (!res.ok) {
    throw new Error(`Slayer metadata fetch failed: ${res.status}`)
  }
  const data = (await res.json()) as SlayerOgMetadata
  return { type: 'slayer', data }
}

export async function fetchOgMetadata(type: OgType, id: string): Promise<OgMetadata> {
  switch (type) {
    case 'match':
      return fetchMatchMetadata(id)
    case 'bracket':
      return fetchBracketMetadata(id)
    case 'slayer':
      return fetchSlayerMetadata(id)
  }
}

// ---------------------------------------------------------------------------
// Shared style constants (oklch-based dark theme — inlined for Satori)
// ---------------------------------------------------------------------------

const BG_GRADIENT = 'linear-gradient(135deg, oklch(12% 0.02 250) 0%, oklch(18% 0.04 260) 100%)'
const ACCENT_COLOR = 'oklch(68% 0.21 250)'
const TEXT_PRIMARY = 'oklch(96% 0.01 250)'
const TEXT_SECONDARY = 'oklch(72% 0.04 250)'
const WORDMARK_COLOR = 'oklch(60% 0.12 250)'

// ---------------------------------------------------------------------------
// Layout renderers per type
// ---------------------------------------------------------------------------

function renderMatchImage(data: OgMatchMetadata): React.ReactElement {
  const headline = data.prediction_summary || `${data.home_team} vs ${data.away_team}`
  const subline = [data.venue, data.kickoff ? new Date(data.kickoff).toLocaleDateString('en-GB') : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: OG_WIDTH,
        height: OG_HEIGHT,
        background: BG_GRADIENT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          width: 8,
          height: '100%',
          background: ACCENT_COLOR,
          flexShrink: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 72px',
          flex: 1,
        }}
      >
        {/* Teams row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: TEXT_SECONDARY,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {data.home_team}
          </span>
          <span style={{ fontSize: 22, color: ACCENT_COLOR, fontWeight: 800 }}>vs</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: TEXT_SECONDARY,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {data.away_team}
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: TEXT_PRIMARY,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          {headline}
        </div>

        {/* Subline */}
        {subline && (
          <div
            style={{
              fontSize: 24,
              color: TEXT_SECONDARY,
              letterSpacing: '0.02em',
            }}
          >
            {subline}
          </div>
        )}
      </div>

      {/* Bottom-right wordmark */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          right: 60,
          fontSize: 20,
          fontWeight: 600,
          color: WORDMARK_COLOR,
          letterSpacing: '0.06em',
        }}
      >
        scoutedge.app
      </div>
    </div>
  )
}

function renderBracketImage(data: BracketOgMetadata): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: OG_WIDTH,
        height: OG_HEIGHT,
        background: BG_GRADIENT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          width: 8,
          height: '100%',
          background: 'oklch(68% 0.21 150)',
          flexShrink: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 72px',
          flex: 1,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'oklch(68% 0.21 150)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Bracket Prediction
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: TEXT_PRIMARY,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          {data.headline}
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: 24,
            color: TEXT_SECONDARY,
          }}
        >
          {data.subline}
        </div>
      </div>

      {/* Bottom-right wordmark */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          right: 60,
          fontSize: 20,
          fontWeight: 600,
          color: WORDMARK_COLOR,
          letterSpacing: '0.06em',
        }}
      >
        scoutedge.app
      </div>
    </div>
  )
}

function renderSlayerImage(data: SlayerOgMetadata): React.ReactElement {
  const winRate =
    data.total_duels > 0 ? Math.round((data.wins / data.total_duels) * 100) : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: OG_WIDTH,
        height: OG_HEIGHT,
        background: BG_GRADIENT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          width: 8,
          height: '100%',
          background: 'oklch(65% 0.21 30)',
          flexShrink: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 72px',
          flex: 1,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'oklch(65% 0.21 30)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Slayer Scorecard
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: TEXT_PRIMARY,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          {data.headline}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'oklch(65% 0.21 30)' }}>
              {winRate}%
            </span>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY, marginTop: 4 }}>Win rate</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: TEXT_PRIMARY }}>
              {data.wins}/{data.total_duels}
            </span>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY, marginTop: 4 }}>Duels won</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: TEXT_PRIMARY }}>
              {data.score}
            </span>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY, marginTop: 4 }}>Score</span>
          </div>
        </div>
      </div>

      {/* Bottom-right wordmark */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          right: 60,
          fontSize: 20,
          fontWeight: 600,
          color: WORDMARK_COLOR,
          letterSpacing: '0.06em',
        }}
      >
        scoutedge.app
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fallback image — returned on metadata fetch failure (never 500)
// ---------------------------------------------------------------------------

function renderFallbackImage(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: OG_WIDTH,
        height: OG_HEIGHT,
        background: BG_GRADIENT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: TEXT_PRIMARY,
          letterSpacing: '-0.02em',
        }}
      >
        ScoutEdge
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function isValidType(value: string): value is OgType {
  return value === 'match' || value === 'bracket' || value === 'slayer'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
): Promise<ImageResponse | Response> {
  const { type, id } = await params

  if (!isValidType(type)) {
    return new Response(`Unknown OG type: ${type}. Expected match | bracket | slayer.`, {
      status: 400,
    })
  }

  const responseInit = {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    headers: {
      'Cache-Control': CACHE_CONTROL,
    },
  }

  try {
    const meta = await fetchOgMetadata(type, id)

    let element: React.ReactElement

    switch (meta.type) {
      case 'match':
        element = renderMatchImage(meta.data)
        break
      case 'bracket':
        element = renderBracketImage(meta.data)
        break
      case 'slayer':
        element = renderSlayerImage(meta.data)
        break
    }

    return new ImageResponse(element, responseInit)
  } catch {
    // Metadata fetch failed — return branded placeholder rather than a 500
    return new ImageResponse(renderFallbackImage(), responseInit)
  }
}
