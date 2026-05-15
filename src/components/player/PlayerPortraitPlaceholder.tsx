'use client'

import { useTranslations } from 'next-intl'
import type { Player, Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import { BRAND } from '@/lib/brand-tokens'

interface PlayerPortraitPlaceholderProps {
  player: Player
  team: Team
}

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  const first = parts[0].charAt(0)
  const last = parts[parts.length - 1].charAt(0)
  return `${first}${last}`.toUpperCase()
}

function getTeamStamp(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return cleaned.slice(0, 3) || 'XXX'
}

interface PositionIconProps {
  position: Player['position']
  color: string
}

function PositionIcon({ position, color }: PositionIconProps) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (position === 'GK') {
    return (
      <svg {...common}>
        <path d="M4 7h16v6a8 8 0 0 1-16 0V7z" />
        <path d="M9 7V4h6v3" />
        <circle cx="12" cy="13" r="1.5" />
      </svg>
    )
  }

  if (position === 'DEF') {
    return (
      <svg {...common}>
        <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }

  if (position === 'MID') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18" />
        <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 20l5-5" />
      <path d="M14 4l6 6-6 6-4-4 4-8z" />
      <path d="M10 14l-3 3 1.5 1.5" />
    </svg>
  )
}

function positionLabelKey(
  position: Player['position'],
): 'positionGK' | 'positionDEF' | 'positionMID' | 'positionFWD' {
  if (position === 'GK') return 'positionGK'
  if (position === 'DEF') return 'positionDEF'
  if (position === 'MID') return 'positionMID'
  return 'positionFWD'
}

export default function PlayerPortraitPlaceholder({
  player,
  team,
}: PlayerPortraitPlaceholderProps) {
  const t = useTranslations('playerPage')
  const colors = getTeamColors(team.slug)
  const monogram = getMonogram(player.name)
  const teamStamp = getTeamStamp(team.slug)
  const archiveStamp = `SCT-${teamStamp}-PORTRAIT-PENDING-2026`

  return (
    <div
      className="relative z-10 h-[420px] md:h-[540px] lg:h-[600px] w-[300px] md:w-[340px]"
      data-testid="portrait-placeholder"
    >
      <div
        className="absolute inset-0 rounded-3xl border overflow-hidden"
        style={{
          borderColor: `${colors.glow}33`,
          background: `
            linear-gradient(160deg, ${colors.primary}10 0%, transparent 50%, ${colors.glow}08 100%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.25))
          `,
          boxShadow: `inset 0 0 60px ${colors.glow}10`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${colors.glow}, ${colors.glow} 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, ${colors.glow}, ${colors.glow} 1px, transparent 1px, transparent 28px)`,
          }}
        />

        <div
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30"
          style={{ background: colors.glow }}
        />
        <div
          className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: colors.primary }}
        />

        <div
          className="absolute top-4 right-4 font-mono text-[8px] md:text-[9px] uppercase tracking-widest text-right leading-tight max-w-[160px]"
          style={{ color: BRAND.tertiary }}
        >
          {archiveStamp}
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <span
            className="block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: colors.glow }}
          />
          <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">
            {t('portraitPending')}
          </span>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <span
            className="font-headline leading-none uppercase tracking-tight"
            style={{
              fontSize: 'clamp(7rem, 18vw, 11rem)',
              color: colors.glow,
              textShadow: `0 0 40px ${colors.glow}40, 0 0 12px ${colors.glow}30`,
              WebkitTextStroke: `1px ${colors.glow}cc`,
            }}
          >
            {monogram}
          </span>

          <div
            className="mt-1 h-px w-24"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.glow}80, transparent)`,
            }}
          />

          <div className="mt-4 flex items-center gap-2">
            <PositionIcon position={player.position} color={colors.glow} />
            <span
            className="font-label text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: colors.glow }}
          >
              {t(positionLabelKey(player.position))}
            </span>
          </div>

          <div
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{
              borderColor: `${colors.glow}40`,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span className="text-base leading-none">{team.flag}</span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface">
              {team.name}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">
          <span>#{player.number.toString().padStart(2, '0')}</span>
          <span style={{ color: `${colors.glow}99` }}>{t('dossierActive')}</span>
        </div>

        <div
          className="absolute top-3 left-3 w-3 h-3 border-l border-t"
          style={{ borderColor: `${colors.glow}80` }}
        />
        <div
          className="absolute top-3 right-3 w-3 h-3 border-r border-t"
          style={{ borderColor: `${colors.glow}80` }}
        />
        <div
          className="absolute bottom-3 left-3 w-3 h-3 border-l border-b"
          style={{ borderColor: `${colors.glow}80` }}
        />
        <div
          className="absolute bottom-3 right-3 w-3 h-3 border-r border-b"
          style={{ borderColor: `${colors.glow}80` }}
        />
      </div>
    </div>
  )
}
