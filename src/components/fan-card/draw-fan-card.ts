import { BRAND, SURFACE } from '@/lib/brand-tokens'
import { getTeamColors } from '@/lib/team-colors'
import type { CardThemeId, FanBadge, FanCardData } from '@/lib/fan-card-types'
import { FAN_BADGES } from '@/lib/fan-card-types'

export const CARD_W = 1200
export const CARD_H = 675

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function hexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

interface ThemePainter {
  background(ctx: CanvasRenderingContext2D, teamPrimary: string, teamGlow: string): void
  accentColor: string
  badgeBg: string
}

const THEME_PAINTERS: Record<CardThemeId, (teamPrimary: string, teamGlow: string) => ThemePainter> = {
  classic: (teamPrimary, teamGlow) => ({
    background(ctx) {
      ctx.fillStyle = SURFACE.background
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      const g = ctx.createRadialGradient(200, 200, 10, 200, 200, 600)
      g.addColorStop(0, `${teamGlow}18`)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CARD_W, CARD_H)
    },
    accentColor: teamPrimary,
    badgeBg: 'rgba(255,255,255,0.06)',
  }),

  neon: (teamPrimary, teamGlow) => ({
    background(ctx) {
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      const g = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, 10, CARD_W / 2, CARD_H / 2, 500)
      g.addColorStop(0, `${teamGlow}25`)
      g.addColorStop(0.5, `${teamPrimary}08`)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      ctx.strokeStyle = `${teamGlow}60`
      ctx.lineWidth = 3
      roundRect(ctx, 16, 16, CARD_W - 32, CARD_H - 32, 20)
      ctx.stroke()
      ctx.strokeStyle = `${teamGlow}20`
      ctx.lineWidth = 1
      roundRect(ctx, 24, 24, CARD_W - 48, CARD_H - 48, 16)
      ctx.stroke()
    },
    accentColor: teamGlow,
    badgeBg: `${teamGlow}15`,
  }),

  gold: (teamPrimary) => ({
    background(ctx) {
      ctx.fillStyle = '#1a150a'
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
      g.addColorStop(0, 'rgba(255,215,0,0.08)')
      g.addColorStop(0.3, 'rgba(184,134,11,0.04)')
      g.addColorStop(0.6, 'rgba(255,215,0,0.10)')
      g.addColorStop(1, 'rgba(184,134,11,0.03)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      const topBar = ctx.createLinearGradient(0, 0, CARD_W, 0)
      topBar.addColorStop(0, 'transparent')
      topBar.addColorStop(0.3, '#ffd700')
      topBar.addColorStop(0.7, '#b8860b')
      topBar.addColorStop(1, 'transparent')
      ctx.fillStyle = topBar
      ctx.fillRect(0, 0, CARD_W, 4)
      ctx.fillRect(0, CARD_H - 4, CARD_W, 4)
    },
    accentColor: '#ffd700',
    badgeBg: 'rgba(255,215,0,0.10)',
  }),

  holographic: (teamPrimary, teamGlow) => ({
    background(ctx) {
      ctx.fillStyle = SURFACE.background
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      const colors = ['#ff006640', '#00ff8840', '#0066ff40', '#ff00ff40', '#ffff0040']
      colors.forEach((c, i) => {
        const x = 200 + i * 200
        const y = 150 + (i % 2) * 200
        const g = ctx.createRadialGradient(x, y, 10, x, y, 300)
        g.addColorStop(0, c)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, CARD_W, CARD_H)
      })
      ctx.fillStyle = `${SURFACE.background}b0`
      ctx.fillRect(0, 0, CARD_W, CARD_H)
    },
    accentColor: '#e0aaff',
    badgeBg: 'rgba(224,170,255,0.10)',
  }),

  stadium: (teamPrimary, teamGlow) => ({
    background(ctx) {
      ctx.fillStyle = '#0d1a0d'
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let y = 0; y < CARD_H; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CARD_W, y)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(CARD_W / 2, CARD_H / 2, 120, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(CARD_W / 2, 0)
      ctx.lineTo(CARD_W / 2, CARD_H)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 2
      ctx.stroke()
      const vignette = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, 200, CARD_W / 2, CARD_H / 2, 700)
      vignette.addColorStop(0, 'transparent')
      vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, CARD_W, CARD_H)
    },
    accentColor: teamPrimary,
    badgeBg: 'rgba(255,255,255,0.08)',
  }),
}

export function drawFanCard(
  canvas: HTMLCanvasElement,
  data: FanCardData,
  teamName: string,
  teamFlag: string,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { primary: teamPrimary, glow: teamGlow } = getTeamColors(data.teamSlug)
  const painter = THEME_PAINTERS[data.theme](teamPrimary, teamGlow)

  painter.background(ctx, teamPrimary, teamGlow)

  // ── Top bar: brand + theme badge ──
  ctx.textAlign = 'left'
  ctx.fillStyle = painter.accentColor
  ctx.font = 'bold 22px Arial, sans-serif'
  ctx.fillText('KICKORACLE', 56, 52)
  ctx.fillStyle = SURFACE.outline
  ctx.font = '14px Arial, sans-serif'
  ctx.fillText('FAN IDENTITY CARD', 56, 72)

  if (data.theme !== 'classic' && data.theme !== 'neon') {
    ctx.textAlign = 'right'
    ctx.fillStyle = painter.accentColor
    ctx.font = 'bold 12px Arial, sans-serif'
    const label = data.theme === 'gold' ? '★ GOLD' : data.theme === 'holographic' ? '◆ HOLO' : '◆ VIP'
    roundRect(ctx, CARD_W - 56 - 90, 36, 90, 28, 14)
    ctx.fillStyle = painter.badgeBg
    ctx.fill()
    ctx.fillStyle = painter.accentColor
    ctx.textAlign = 'center'
    ctx.fillText(label, CARD_W - 56 - 45, 55)
  }

  // ── Divider ──
  ctx.strokeStyle = `${painter.accentColor}30`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(56, 90)
  ctx.lineTo(CARD_W - 56, 90)
  ctx.stroke()

  // ── Avatar circle ──
  const avatarCx = 160
  const avatarCy = 210
  const avatarR = 64
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarR + 4, 0, Math.PI * 2)
  ctx.strokeStyle = `${painter.accentColor}50`
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2)
  ctx.fillStyle = `${painter.accentColor}12`
  ctx.fill()
  ctx.font = '72px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(data.avatar, avatarCx, avatarCy + 4)
  ctx.textBaseline = 'alphabetic'

  // ── Display name ──
  ctx.textAlign = 'left'
  ctx.fillStyle = SURFACE.onSurface
  const nameFontSize = data.displayName.length > 14 ? 40 : 52
  ctx.font = `bold ${nameFontSize}px "Arial Black", Arial, sans-serif`
  ctx.fillText(data.displayName.toUpperCase(), 250, 195)

  // ── Team line ──
  ctx.font = '80px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif'
  ctx.fillText(teamFlag, 250, 250)
  ctx.fillStyle = painter.accentColor
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.fillText(teamName.toUpperCase(), 340, 243)

  // ── Favorite player ──
  if (data.favPlayer) {
    ctx.fillStyle = SURFACE.onSurfaceVariant
    ctx.font = '16px Arial, sans-serif'
    ctx.fillText(`Favorite Player: ${data.favPlayer}`, 250, 275)
  }

  // ── Stats row ──
  const statsY = 340
  const stats = [
    { label: 'PREDICTIONS', value: String(data.predictionsCount) },
    { label: 'ACCURACY', value: `${data.accuracy}%` },
    { label: 'BADGES', value: String(data.badges.length) },
  ]

  stats.forEach((stat, i) => {
    const sx = 56 + i * 220
    roundRect(ctx, sx, statsY, 190, 80, 12)
    ctx.fillStyle = painter.badgeBg
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = painter.accentColor
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.fillText(stat.value, sx + 95, statsY + 40)
    ctx.fillStyle = SURFACE.onSurfaceVariant
    ctx.font = '11px Arial, sans-serif'
    ctx.fillText(stat.label, sx + 95, statsY + 62)
  })

  // ── Badges row ──
  const badgesY = 460
  ctx.textAlign = 'left'
  ctx.fillStyle = SURFACE.onSurfaceVariant
  ctx.font = '12px Arial, sans-serif'
  ctx.fillText('ACHIEVEMENTS', 56, badgesY)

  const earnedBadges = FAN_BADGES.filter((b) => data.badges.includes(b.id))
  const displayBadges = earnedBadges.slice(0, 6)

  displayBadges.forEach((badge, i) => {
    const bx = 56 + i * 100
    const by = badgesY + 16
    hexagon(ctx, bx + 32, by + 32, 30)
    ctx.fillStyle = painter.badgeBg
    ctx.fill()
    hexagon(ctx, bx + 32, by + 32, 30)
    ctx.strokeStyle = `${painter.accentColor}40`
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badge.icon, bx + 32, by + 34)
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = SURFACE.onSurfaceVariant
    ctx.font = '9px Arial, sans-serif'
    ctx.fillText(badge.name.toUpperCase(), bx + 32, by + 72)
  })

  if (earnedBadges.length === 0) {
    ctx.textAlign = 'left'
    ctx.fillStyle = SURFACE.outline
    ctx.font = '14px Arial, sans-serif'
    ctx.fillText('No badges yet — start predicting to earn your first!', 56, badgesY + 44)
  }

  // ── Right side: large team flag watermark ──
  ctx.globalAlpha = 0.06
  ctx.font = '360px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(teamFlag, CARD_W - 220, CARD_H / 2 - 20)
  ctx.globalAlpha = 1
  ctx.textBaseline = 'alphabetic'

  // ── Bottom bar ──
  ctx.textAlign = 'center'
  ctx.fillStyle = SURFACE.outline
  ctx.font = '14px Arial, sans-serif'
  ctx.fillText('Create yours at kickoracle.com/fan-card', CARD_W / 2, CARD_H - 20)
}
