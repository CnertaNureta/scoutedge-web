'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

interface Contender {
  slug: string
  name: string
  flag: string
  fifaRanking: number
}

// Rough AI championship win probabilities (%)
const CHAMP_PROBS: Record<string, number> = {
  argentina: 18,
  france: 16,
  brazil: 14,
  england: 11,
  germany: 10,
  spain: 10,
  portugal: 8,
  netherlands: 7,
  uruguay: 4,
  italy: 4,
  usa: 3,
  mexico: 3,
  japan: 3,
  'south-korea': 2,
  morocco: 2,
  belgium: 2,
}

const CARD_W = 1200
const CARD_H = 630

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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

function drawShareCard(
  canvas: HTMLCanvasElement,
  team: Contender
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Background
  ctx.fillStyle = SURFACE.background
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Subtle radial glow
  const radGrad = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2 - 80, 20, CARD_W / 2, CARD_H / 2 - 80, 500)
  radGrad.addColorStop(0, 'rgba(160,212,148,0.10)')
  radGrad.addColorStop(0.5, 'rgba(233,196,0,0.04)')
  radGrad.addColorStop(1, 'rgba(18,20,18,0)')
  ctx.fillStyle = radGrad
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Top accent bar (gradient)
  const accentGrad = ctx.createLinearGradient(0, 0, CARD_W, 0)
  accentGrad.addColorStop(0, 'transparent')
  accentGrad.addColorStop(0.2, BRAND.primary)
  accentGrad.addColorStop(0.5, BRAND.tertiary)
  accentGrad.addColorStop(0.8, BRAND.primary)
  accentGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, 0, CARD_W, 5)

  // Bottom accent bar
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, CARD_H - 5, CARD_W, 5)

  // ── Brand (top-left) ──
  ctx.textAlign = 'left'
  ctx.fillStyle = BRAND.primary
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.fillText('KICKORACLE', 56, 62)

  ctx.fillStyle = SURFACE.outline
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText('kickoracle.com · AI-Powered World Cup Intelligence', 56, 88)

  // Divider
  ctx.strokeStyle = SURFACE.outlineVariant
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(56, 108)
  ctx.lineTo(CARD_W - 56, 108)
  ctx.stroke()

  // ── Label ──
  ctx.textAlign = 'center'
  ctx.fillStyle = SURFACE.onSurfaceVariant
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText('MY 2026 FIFA WORLD CUP CHAMPION PICK', CARD_W / 2, 158)

  // ── Flag (emoji) ──
  ctx.font = '148px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif'
  ctx.fillText(team.flag, CARD_W / 2, 355)

  // ── Team name ──
  ctx.fillStyle = SURFACE.onSurface
  // Scale font size for long names
  const nameFontSize = team.name.length > 10 ? 64 : 80
  ctx.font = `bold ${nameFontSize}px "Arial Black", Arial, sans-serif`
  ctx.fillText(team.name.toUpperCase(), CARD_W / 2, 455)

  // ── AI probability label ──
  const prob = CHAMP_PROBS[team.slug] ?? 5
  ctx.fillStyle = BRAND.primary
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.fillText(`AI Championship Probability: ${prob}%`, CARD_W / 2, 510)

  // ── Probability bar ──
  const barW = 500
  const barH = 10
  const barX = (CARD_W - barW) / 2
  const barY = 526

  // Track background
  ctx.fillStyle = SURFACE.surfaceContainerHighest
  roundRectPath(ctx, barX, barY, barW, barH, 5)
  ctx.fill()

  // Filled portion (cap at ~80% of bar for visual clarity)
  const fillRatio = Math.min((prob / 20) * 0.9 + 0.05, 0.95)
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW * fillRatio, 0)
  fillGrad.addColorStop(0, BRAND.primary)
  fillGrad.addColorStop(1, BRAND.tertiary)
  ctx.fillStyle = fillGrad
  roundRectPath(ctx, barX, barY, barW * fillRatio, barH, 5)
  ctx.fill()

  // ── FIFA ranking badge ──
  const badgeX = CARD_W - 56 - 100
  const badgeY = 40
  ctx.fillStyle = 'rgba(160,212,148,0.12)'
  roundRectPath(ctx, badgeX, badgeY, 100, 36, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(160,212,148,0.25)'
  ctx.lineWidth = 1
  roundRectPath(ctx, badgeX, badgeY, 100, 36, 18)
  ctx.stroke()
  ctx.fillStyle = BRAND.primary
  ctx.font = 'bold 14px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`FIFA #${team.fifaRanking}`, badgeX + 50, badgeY + 23)

  // ── Bottom footer ──
  ctx.textAlign = 'center'
  ctx.fillStyle = SURFACE.outline
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText('Make your own pick at kickoracle.com/share', CARD_W / 2, CARD_H - 22)

  ctx.textAlign = 'left'
}

interface ShareCardClientProps {
  contenders: Contender[]
}

export default function ShareCardClient({ contenders }: ShareCardClientProps) {
  const [selected, setSelected] = useState<Contender | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { trigger: haptic } = useHapticFeedback()

  const redrawCard = useCallback(() => {
    if (!canvasRef.current || !selected) return
    drawShareCard(canvasRef.current, selected)
  }, [selected])

  useEffect(() => {
    redrawCard()
  }, [redrawCard])

  function selectTeam(team: Contender) {
    haptic('selection')
    setSelected(team)
  }

  async function handleDownload() {
    if (!canvasRef.current || !selected) return
    haptic('light')
    setDownloading(true)
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `kickoracle-${selected.slug}-2026-pick.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    if (!canvasRef.current || !selected) return
    haptic('light')

    const shareText = `I'm picking ${selected.flag} ${selected.name} to win the 2026 FIFA World Cup! What's your pick? 🏆`
    const shareUrl = 'https://kickoracle.com/share'

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, 'image/png')
        )
        if (blob) {
          const file = new File([blob], `kickoracle-${selected.slug}-pick.png`, { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'My World Cup 2026 Champion Pick', text: shareText, files: [file] })
            return
          }
        }
        // Fall through if file share not supported
        await navigator.share({ title: 'My World Cup 2026 Champion Pick', text: shareText, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    // Fallback: copy text to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable
    }
  }

  function twitterShareUrl(team: Contender): string {
    const text = encodeURIComponent(
      `I'm picking ${team.flag} ${team.name} to win the 2026 FIFA World Cup! 🏆 Make your pick at`
    )
    const url = encodeURIComponent('https://kickoracle.com/share')
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=WorldCup2026,KickOracle`
  }

  function whatsappShareUrl(team: Contender): string {
    const text = encodeURIComponent(
      `I'm picking ${team.flag} ${team.name} to win the 2026 FIFA World Cup! 🏆 Make your pick at https://kickoracle.com/share`
    )
    return `https://wa.me/?text=${text}`
  }

  return (
    <>
      {/* Team selector */}
      <div className="mb-10">
        <h2 className="font-headline text-xl uppercase tracking-wide mb-2 text-on-surface">
          Pick Your Champion
        </h2>
        <p className="text-on-surface-variant text-sm mb-6">
          Select the team you believe will lift the trophy in 2026.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {contenders.map((team) => {
            const isSelected = selected?.slug === team.slug
            return (
              <button
                key={team.slug}
                onClick={() => selectTeam(team)}
                className={`relative glass-panel rounded-xl border p-3 text-center transition-all min-h-[44px] ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-white/[0.06] hover:border-white/15'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[9px] text-on-primary font-bold">✓</span>
                  </div>
                )}
                <div className="text-2xl mb-1">{team.flag}</div>
                <div className="font-label text-[10px] font-semibold uppercase tracking-wide text-on-surface leading-tight">
                  {team.name}
                </div>
                <div className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                  #{team.fifaRanking}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Card Preview */}
      {selected ? (
        <>
          <GlassCard className="p-4 md:p-6 mb-6 relative overflow-hidden">
            <NeonAccentBar color={BRAND.primary} />
            <h3 className="font-headline text-lg uppercase tracking-wide mb-4 text-on-surface">
              Your Share Card
            </h3>
            <div className="w-full overflow-hidden rounded-xl bg-background border border-white/[0.06]">
              <canvas
                ref={canvasRef}
                width={CARD_W}
                height={CARD_H}
                className="w-full h-auto block"
                aria-label={`Share card: ${selected.name} as 2026 World Cup champion`}
              />
            </div>
          </GlassCard>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-10">
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-60"
            >
              {downloading ? 'Saving…' : 'Download PNG'}
            </button>

            {/* Web Share / Copy */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors min-h-[44px]"
            >
              {copied ? 'Copied!' : 'Share'}
            </button>

            {/* Twitter/X */}
            <a
              href={twitterShareUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#1d9bf020] text-[#1d9bf0] border border-[#1d9bf030] font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-[#1d9bf030] transition-colors min-h-[44px]"
            >
              Post on X
            </a>

            {/* WhatsApp */}
            <a
              href={whatsappShareUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25d36620] text-[#25d366] border border-[#25d36630] font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-[#25d36630] transition-colors min-h-[44px]"
            >
              WhatsApp
            </a>
          </div>

          {/* AI comparison */}
          <GlassCard className="p-5 md:p-6 relative overflow-hidden">
            <NeonAccentBar color={BRAND.tertiary} />
            <h3 className="font-headline text-base uppercase tracking-wide mb-4 text-on-surface">
              AI Championship Probabilities
            </h3>
            <div className="space-y-2">
              {contenders
                .slice()
                .sort((a, b) => (CHAMP_PROBS[b.slug] ?? 0) - (CHAMP_PROBS[a.slug] ?? 0))
                .map((team) => {
                  const prob = CHAMP_PROBS[team.slug] ?? 1
                  const isUserPick = team.slug === selected.slug
                  return (
                    <div
                      key={team.slug}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                        isUserPick ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-lg shrink-0">{team.flag}</span>
                      <span
                        className={`font-label text-xs font-semibold uppercase tracking-wide w-28 shrink-0 ${
                          isUserPick ? 'text-primary' : 'text-on-surface'
                        }`}
                      >
                        {team.name}
                        {isUserPick && (
                          <span className="ml-1.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                            Your Pick
                          </span>
                        )}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(prob * 5.5, 100)}%`,
                            background: isUserPick
                              ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.tertiary})`
                              : SURFACE.outlineVariant,
                          }}
                        />
                      </div>
                      <span
                        className={`font-mono text-xs font-bold w-10 text-right shrink-0 ${
                          isUserPick ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {prob}%
                      </span>
                    </div>
                  )
                })}
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="p-12 text-center relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-on-surface-variant text-sm">
            Select a team above to generate your shareable champion prediction card.
          </p>
        </GlassCard>
      )}
    </>
  )
}
