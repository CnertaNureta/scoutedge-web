import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllTeams, getTeamBySlug, getPlayersByTeam, getPlayerBySlug } from '@/lib/data-service'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const runtime = 'nodejs'
export const alt = 'Player Profile — KickOracle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = join(process.cwd(), 'public', 'fonts')

export async function generateStaticParams() {
  const params: { slug: string; playerSlug: string }[] = []
  for (const team of getAllTeams()) {
    for (const player of getPlayersByTeam(team.slug)) {
      params.push({ slug: team.slug, playerSlug: player.slug })
    }
  }
  return params
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'GOALKEEPER',
  DEF: 'DEFENDER',
  MID: 'MIDFIELDER',
  FWD: 'FORWARD',
}

export default async function PlayerOGImage({
  params,
}: {
  params: Promise<{ slug: string; playerSlug: string }>
}) {
  const { slug, playerSlug } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)

  const bebasNeue = readFileSync(join(fontsDir, 'bebas-neue-400.ttf'))
  const jetbrainsMono = readFileSync(join(fontsDir, 'jetbrains-mono-400.ttf'))

  const playerName = player?.name ?? playerSlug.replace(/-/g, ' ')
  const position = player?.position ?? 'FWD'
  const positionLabel = POSITION_LABELS[position] ?? position
  const flag = team?.flag ?? ''
  const teamName = team?.name ?? slug.replace(/-/g, ' ')
  const rating = player?.rating ?? 0
  const goals = player?.goals ?? 0
  const caps = player?.caps ?? 0
  const number = player?.number ?? 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: SURFACE.background,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${SURFACE.background} 0%, ${SURFACE.surfaceContainer} 50%, ${SURFACE.background} 100%)`,
            display: 'flex',
          }}
        />

        {/* Large jersey number watermark */}
        {number > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 40,
              top: '50%',
              transform: 'translateY(-50%)',
              fontFamily: '"Bebas Neue"',
              fontSize: 360,
              color: 'rgba(160,212,148,0.05)',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {number}
          </div>
        )}

        {/* Green accent glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,212,148,0.1) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Left content (60%) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            width: '65%',
            position: 'relative',
          }}
        >
          {/* Position + team */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span
              style={{
                fontFamily: '"JetBrains Mono"',
                fontSize: 16,
                color: BRAND.primary,
                letterSpacing: '0.12em',
              }}
            >
              {positionLabel}
            </span>
            <span style={{ color: 'rgba(160,212,148,0.4)', fontSize: 16 }}>•</span>
            <span style={{ fontSize: 20 }}>{flag}</span>
            <span
              style={{
                fontFamily: '"JetBrains Mono"',
                fontSize: 16,
                color: SURFACE.onSurfaceVariant,
                letterSpacing: '0.06em',
              }}
            >
              {teamName.toUpperCase()}
            </span>
          </div>

          {/* Player name */}
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 72,
              color: SURFACE.onSurface,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 32,
            }}
          >
            {playerName.toUpperCase()}
          </span>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {rating > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono"',
                    fontSize: 40,
                    color: BRAND.primary,
                    lineHeight: 1,
                  }}
                >
                  {rating.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono"',
                    fontSize: 12,
                    color: SURFACE.onSurfaceVariant,
                    letterSpacing: '0.08em',
                    marginTop: 4,
                  }}
                >
                  RATING
                </span>
              </div>
            )}
            <div
              style={{
                width: 2,
                height: 36,
                backgroundColor: 'rgba(160,212,148,0.3)',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 40,
                  color: BRAND.primary,
                  lineHeight: 1,
                }}
              >
                {goals}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 12,
                  color: SURFACE.onSurfaceVariant,
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                GOALS
              </span>
            </div>
            <div
              style={{
                width: 2,
                height: 36,
                backgroundColor: 'rgba(160,212,148,0.3)',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 40,
                  color: BRAND.primary,
                  lineHeight: 1,
                }}
              >
                {caps}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 12,
                  color: SURFACE.onSurfaceVariant,
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                CAPS
              </span>
            </div>
          </div>
        </div>

        {/* Right side - stat visualization placeholder */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35%',
            position: 'relative',
          }}
        >
          {/* Hexagonal radar placeholder */}
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Outer hex */}
            <polygon
              points="100,10 178,55 178,145 100,190 22,145 22,55"
              fill="none"
              stroke="rgba(160,212,148,0.15)"
              strokeWidth="1"
            />
            {/* Mid hex */}
            <polygon
              points="100,40 152,67.5 152,132.5 100,160 48,132.5 48,67.5"
              fill="none"
              stroke="rgba(160,212,148,0.1)"
              strokeWidth="1"
            />
            {/* Inner hex */}
            <polygon
              points="100,70 126,82.5 126,117.5 100,130 74,117.5 74,82.5"
              fill="none"
              stroke="rgba(160,212,148,0.08)"
              strokeWidth="1"
            />
            {/* Filled area representing player strength */}
            <polygon
              points={`100,${25 + (1 - rating / 10) * 40} ${155 - (1 - rating / 10) * 20},${60 + (1 - rating / 10) * 10} ${160 - (1 - caps / 200) * 25},${130 + (1 - caps / 200) * 10} 100,${170 - (1 - goals / 80) * 15} ${45 + (1 - rating / 10) * 15},${135 - (1 - rating / 10) * 10} ${40 + (1 - rating / 10) * 15},${65 + (1 - rating / 10) * 10}`}
              fill="rgba(160,212,148,0.15)"
              stroke="rgba(160,212,148,0.6)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Bottom bar with branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 80px 32px',
          }}
        >
          <div
            style={{
              width: 60,
              height: 2,
              backgroundColor: 'rgba(160,212,148,0.2)',
              display: 'flex',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 22,
                color: SURFACE.onSurface,
                letterSpacing: '-0.02em',
              }}
            >
              WORLDCAP
            </span>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 22,
                color: BRAND.primary,
                letterSpacing: '-0.02em',
              }}
            >
              IQ
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bebas Neue', data: bebasNeue, style: 'normal', weight: 400 },
        { name: 'JetBrains Mono', data: jetbrainsMono, style: 'normal', weight: 400 },
      ],
    }
  )
}
