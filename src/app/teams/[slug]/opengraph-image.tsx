import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllTeams, getTeamBySlug } from '@/lib/data-service'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const runtime = 'nodejs'
export const alt = 'Team Analysis — KickOracle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = join(process.cwd(), 'public', 'fonts')

export async function generateStaticParams() {
  return getAllTeams().map((team) => ({ slug: team.slug }))
}

export default async function TeamOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const team = getTeamBySlug(slug)

  const bebasNeue = readFileSync(join(fontsDir, 'bebas-neue-400.ttf'))
  const jetbrainsMono = readFileSync(join(fontsDir, 'jetbrains-mono-400.ttf'))

  const teamName = team?.name ?? slug.replace(/-/g, ' ').toUpperCase()
  const flag = team?.flag ?? ''
  const fifaRanking = team?.fifaRanking ?? 0
  const chemistry = team?.chemistry ?? 0
  const group = team?.group ?? ''

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
        {/* Background gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, rgba(18,20,18,0.3) 0%, rgba(18,20,18,0.95) 60%, ${SURFACE.background} 100%)`,
            display: 'flex',
          }}
        />

        {/* Decorative pitch lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            opacity: 0.04,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '35%',
              left: '60%',
              width: 250,
              height: 250,
              borderRadius: '50%',
              border: `2px solid ${BRAND.primary}`,
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 200,
              width: 2,
              height: '100%',
              backgroundColor: BRAND.primary,
              display: 'flex',
            }}
          />
        </div>

        {/* Green accent glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,212,148,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
            flex: 1,
            position: 'relative',
          }}
        >
          {/* Flag */}
          <span style={{ fontSize: 72, marginBottom: 12 }}>{flag}</span>

          {/* Team name */}
          <span
            style={{
              fontFamily: '"Bebas Neue"',
              fontSize: 80,
              color: SURFACE.onSurface,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {teamName.toUpperCase()}
          </span>

          {/* Group badge */}
          {group && (
            <span
              style={{
                fontFamily: '"JetBrains Mono"',
                fontSize: 18,
                color: BRAND.primary,
                letterSpacing: '0.1em',
                marginBottom: 32,
              }}
            >
              WORLD CUP 2026 — GROUP {group}
            </span>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {fifaRanking > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono"',
                    fontSize: 36,
                    color: BRAND.primary,
                    lineHeight: 1,
                  }}
                >
                  #{fifaRanking}
                </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono"',
                    fontSize: 13,
                    color: SURFACE.onSurfaceVariant,
                    letterSpacing: '0.08em',
                    marginTop: 4,
                  }}
                >
                  FIFA RANK
                </span>
              </div>
            )}
            <div
              style={{
                width: 2,
                height: 40,
                backgroundColor: 'rgba(160,212,148,0.3)',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 36,
                  color: BRAND.primary,
                  lineHeight: 1,
                }}
              >
                {chemistry}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono"',
                  fontSize: 13,
                  color: SURFACE.onSurfaceVariant,
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                CHEMISTRY
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar with branding */}
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
    }
  )
}
