import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const runtime = 'nodejs'
export const alt = 'Fan Identity Card — KickOracle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = join(process.cwd(), 'public', 'fonts')

export default async function FanCardOGImage() {
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
          backgroundColor: SURFACE.background,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `radial-gradient(ellipse at 30% 50%, rgba(160,212,148,0.12) 0%, transparent 60%),
                         radial-gradient(ellipse at 70% 50%, rgba(233,196,0,0.08) 0%, transparent 60%)`,
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            position: 'relative',
            padding: '60px 80px',
          }}
        >
          {/* Emoji row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {['⚽', '🏆', '🌍', '🎖️'].map((e, i) => (
              <span key={i} style={{ fontSize: 48 }}>{e}</span>
            ))}
          </div>

          {/* Title */}
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 72,
              color: SURFACE.onSurface,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            FAN IDENTITY CARD
          </span>

          {/* Subtitle */}
          <span
            style={{
              fontFamily: '"JetBrains Mono"',
              fontSize: 22,
              color: BRAND.primary,
              letterSpacing: '0.08em',
              marginBottom: 40,
            }}
          >
            WORLD CUP 2026
          </span>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 16 }}>
            {['Choose Your Team', 'Earn Badges', 'Share on Social'].map((text) => (
              <div
                key={text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 20px',
                  borderRadius: 999,
                  border: `1px solid rgba(160,212,148,0.25)`,
                  backgroundColor: 'rgba(160,212,148,0.08)',
                }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrains Mono"',
                    fontSize: 14,
                    color: BRAND.primary,
                    letterSpacing: '0.05em',
                  }}
                >
                  {text.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 80px 40px',
          }}
        >
          <div
            style={{
              width: 80,
              height: 2,
              backgroundColor: 'rgba(160,212,148,0.2)',
              display: 'flex',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 24,
                color: SURFACE.onSurface,
                letterSpacing: '-0.02em',
              }}
            >
              WORLDCAP
            </span>
            <span
              style={{
                fontFamily: '"Bebas Neue"',
                fontSize: 24,
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
    },
  )
}
