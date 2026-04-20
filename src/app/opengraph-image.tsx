import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const runtime = 'nodejs'
export const alt = 'KickOracle — AI-Powered World Cup 2026 Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = join(process.cwd(), 'public', 'fonts')

export default async function OGImage() {
  const bebasNeue = readFileSync(join(fontsDir, 'bebas-neue-400.ttf'))
  const jetbrainsMono = readFileSync(join(fontsDir, 'jetbrains-mono-400.ttf'))

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
        {/* Subtle pitch lines overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            opacity: 0.05,
          }}
        >
          {/* Center circle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 300,
              height: 300,
              borderRadius: '50%',
              border: `2px solid ${BRAND.primary}`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          {/* Center line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 2,
              height: '100%',
              backgroundColor: BRAND.primary,
            }}
          />
        </div>

        {/* Mesh gradient accents */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,212,148,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,212,148,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* IQ Icon Mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 88,
            height: 88,
            borderRadius: 20,
            backgroundColor: BRAND.primary,
            marginBottom: 28,
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 52,
              color: SURFACE.surfaceContainerLowest,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            IQ
          </span>
          {/* Diagonal accent */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 40,
              height: 3,
              backgroundColor: 'rgba(13,15,13,0.4)',
              transform: 'rotate(15deg)',
              display: 'flex',
            }}
          />
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 64,
              color: SURFACE.onSurface,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            WORLDCAP
          </span>
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 64,
              color: BRAND.primary,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            IQ
          </span>
        </div>

        {/* Tagline */}
        <span
          style={{
            fontFamily: '"JetBrains Mono"',
            fontSize: 22,
            color: SURFACE.onSurfaceVariant,
            letterSpacing: '0.04em',
            marginBottom: 32,
          }}
        >
          AI-Powered World Cup 2026 Intelligence
        </span>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 2,
            backgroundColor: BRAND.primary,
            marginBottom: 28,
            display: 'flex',
          }}
        />

        {/* Domain */}
        <span
          style={{
            fontFamily: '"JetBrains Mono"',
            fontSize: 16,
            color: BRAND.primary,
            letterSpacing: '0.08em',
          }}
        >
          kickoracle.com
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
