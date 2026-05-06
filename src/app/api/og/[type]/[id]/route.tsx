import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import {
  fetchOgMetadata,
  type BracketOgMetadata,
  type OgMatchMetadata,
  type OgType,
  type SlayerOgMetadata,
} from '@/lib/og-metadata'

export const runtime = 'edge'

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
// Shared style constants (oklch-based dark theme — inlined for Satori)
// ---------------------------------------------------------------------------

const BG_GRADIENT = 'linear-gradient(135deg, oklch(12% 0.02 250) 0%, oklch(18% 0.04 260) 100%)'
const ACCENT_COLOR = 'oklch(68% 0.21 250)'
const TEXT_PRIMARY = 'oklch(96% 0.01 250)'
const TEXT_SECONDARY = 'oklch(72% 0.04 250)'
const WORDMARK_COLOR = 'oklch(60% 0.12 250)'

function safeNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function safeCount(value: unknown): number {
  return Math.max(0, Math.trunc(safeNumber(value)))
}

function formatOgDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB')
}

// ---------------------------------------------------------------------------
// Layout renderers per type
// ---------------------------------------------------------------------------

function renderMatchImage(data: OgMatchMetadata): React.ReactElement {
  const headline = data.headline || `${data.home_team} vs ${data.away_team}`
  const subline = [data.venue_city, formatOgDate(data.kickoff_utc)]
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
          {[data.title, data.share_url].filter(Boolean).join(' · ')}
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
  const correctPicks = safeCount(data.correct_picks)
  const totalPicks = safeCount(data.total_picks)
  const fallbackAccuracy = totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0
  const winRate = Math.max(0, Math.min(100, Math.round(safeNumber(data.accuracy_pct, fallbackAccuracy))))
  const badgeTier = data.badge_tier?.trim() || 'Unranked'

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
              {correctPicks}/{totalPicks}
            </span>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY, marginTop: 4 }}>Correct picks</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: TEXT_PRIMARY }}>
              {badgeTier}
            </span>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY, marginTop: 4 }}>Badge tier</span>
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
