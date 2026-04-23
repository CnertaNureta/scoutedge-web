import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND, SURFACE } from '@/lib/brand-tokens'
import { getDailyDuel } from '@/lib/pk-battle'
import { PLAYERS } from '@/data/players-data'
import { TEAMS } from '@/data/teams-meta'

export const runtime = 'nodejs'
export const alt = 'PK Battle — Player vs Player Duel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = join(process.cwd(), 'public', 'fonts')

export default async function OGImage() {
  const bebasNeue = readFileSync(join(fontsDir, 'bebas-neue-400.ttf'))
  const jetbrainsMono = readFileSync(join(fontsDir, 'jetbrains-mono-400.ttf'))

  const [slugA, slugB] = getDailyDuel()
  const playerA = PLAYERS.find((p) => p.slug === slugA)
  const playerB = PLAYERS.find((p) => p.slug === slugB)
  const teamA = playerA ? TEAMS.find((t) => t.slug === playerA.teamSlug) : null
  const teamB = playerB ? TEAMS.find((t) => t.slug === playerB.teamSlug) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: SURFACE.background,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient accents */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND.primary}18 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND.secondary}18 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: `${BRAND.secondary}20`,
            border: `1px solid ${BRAND.secondary}40`,
            borderRadius: 999,
            padding: '8px 20px',
            marginBottom: 24,
          }}
        >
          <span style={{ fontFamily: '"JetBrains Mono"', fontSize: 14, color: BRAND.secondary, letterSpacing: '0.1em' }}>
            ⚔️ DAILY DUEL
          </span>
        </div>

        {/* Title */}
        <span
          style={{
            fontFamily: '"Bebas Neue"',
            fontSize: 56,
            color: SURFACE.onSurface,
            letterSpacing: '0.02em',
            lineHeight: 1,
            marginBottom: 40,
          }}
        >
          PK BATTLE
        </span>

        {/* Matchup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {/* Player A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 56 }}>{teamA?.flag ?? '🏳️'}</span>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 36,
                color: BRAND.primary,
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {playerA?.name ?? 'Player A'}
            </span>
            <span style={{ fontFamily: '"JetBrains Mono"', fontSize: 14, color: SURFACE.onSurfaceVariant }}>
              {playerA?.position ?? ''} · {playerA?.rating ?? ''}/10
            </span>
          </div>

          {/* VS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 48,
                color: SURFACE.onSurfaceVariant,
                lineHeight: 1,
              }}
            >
              VS
            </span>
          </div>

          {/* Player B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 56 }}>{teamB?.flag ?? '🏳️'}</span>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 36,
                color: BRAND.secondary,
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {playerB?.name ?? 'Player B'}
            </span>
            <span style={{ fontFamily: '"JetBrains Mono"', fontSize: 14, color: SURFACE.onSurfaceVariant }}>
              {playerB?.position ?? ''} · {playerB?.rating ?? ''}/10
            </span>
          </div>
        </div>

        {/* Footer */}
        <span
          style={{
            fontFamily: '"JetBrains Mono"',
            fontSize: 14,
            color: BRAND.primary,
            letterSpacing: '0.08em',
            position: 'absolute',
            bottom: 32,
          }}
        >
          kickoracle.com/play/pk-battle
        </span>
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
