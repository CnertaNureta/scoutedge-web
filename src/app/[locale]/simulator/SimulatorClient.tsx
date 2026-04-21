'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { trackEvent } from '@/lib/analytics'
import type { GroupData, TeamEntry } from './page'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

// ── URL encoding ──────────────────────────────────────────────────────────────

/** Encode simulator state into a shareable URL search param string */
function encodeState(order: Record<string, string[]>): string {
  const parts = Object.entries(order)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([g, slugs]) => `${g}:${slugs.join('.')}`)
  return encodeURIComponent(parts.join('|'))
}

/** Decode simulator state from URL search param string */
function decodeState(encoded: string, groups: GroupData[]): Record<string, string[]> {
  const state: Record<string, string[]> = {}
  try {
    const parts = decodeURIComponent(encoded).split('|')
    for (const part of parts) {
      const [g, slugPart] = part.split(':')
      if (g && slugPart) state[g] = slugPart.split('.')
    }
  } catch {
    // Return default on error
  }
  // Fill any missing groups with default order
  for (const gd of groups) {
    if (!state[gd.group] || state[gd.group].length !== gd.teams.length) {
      state[gd.group] = gd.teams.map((t) => t.slug)
    }
  }
  return state
}

// ── Diff calculation ──────────────────────────────────────────────────────────

/** Count positions where user's order differs from AI's default order */
function countDiffs(order: Record<string, string[]>, groups: GroupData[]): number {
  let diffs = 0
  for (const gd of groups) {
    const userOrder = order[gd.group] ?? gd.teams.map((t) => t.slug)
    const aiOrder = gd.teams.map((t) => t.slug)
    for (let i = 0; i < aiOrder.length; i++) {
      if (userOrder[i] !== aiOrder[i]) diffs++
    }
  }
  return diffs
}

/** Count groups where user's advancement picks differ from AI (top-2 different) */
function countAdvancementDiffs(order: Record<string, string[]>, groups: GroupData[]): number {
  let diffs = 0
  for (const gd of groups) {
    const userTop2 = new Set((order[gd.group] ?? gd.teams.map((t) => t.slug)).slice(0, 2))
    const aiTop2 = new Set(gd.teams.map((t) => t.slug).slice(0, 2))
    const different = [...userTop2].some((s) => !aiTop2.has(s))
    if (different) diffs++
  }
  return diffs
}

// ── Canvas card ───────────────────────────────────────────────────────────────

const CARD_W = 1200
const CARD_H = 900

function drawSimulatorCard(
  canvas: HTMLCanvasElement,
  order: Record<string, string[]>,
  groups: GroupData[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const teamMap = new Map<string, TeamEntry>()
  for (const gd of groups) {
    for (const t of gd.teams) teamMap.set(t.slug, t)
  }

  // Background
  ctx.fillStyle = SURFACE.background
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Top accent bar
  const accentGrad = ctx.createLinearGradient(0, 0, CARD_W, 0)
  accentGrad.addColorStop(0, 'transparent')
  accentGrad.addColorStop(0.2, BRAND.primary)
  accentGrad.addColorStop(0.5, BRAND.tertiary)
  accentGrad.addColorStop(0.8, BRAND.primary)
  accentGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, 0, CARD_W, 5)

  // Brand
  ctx.textAlign = 'left'
  ctx.fillStyle = BRAND.primary
  ctx.font = 'bold 24px Arial, sans-serif'
  ctx.fillText('KICKORACLE', 50, 58)
  ctx.fillStyle = SURFACE.outline
  ctx.font = '16px Arial, sans-serif'
  ctx.fillText('My World Cup 2026 Group Stage Bracket', 50, 82)

  // Divider
  ctx.strokeStyle = SURFACE.outlineVariant
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(50, 100)
  ctx.lineTo(CARD_W - 50, 100)
  ctx.stroke()

  // Grid: 4 cols x 3 rows
  const cols = 4
  const rows = 3
  const cellW = (CARD_W - 100) / cols
  const cellH = (CARD_H - 150) / rows
  const startY = 120
  const startX = 50

  const allGroups = groups.slice().sort((a, b) => a.group.localeCompare(b.group))

  allGroups.forEach((gd, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = startX + col * cellW
    const y = startY + row * cellH

    const userOrder = order[gd.group] ?? gd.teams.map((t) => t.slug)

    // Group label
    ctx.fillStyle = BRAND.tertiary
    ctx.font = 'bold 14px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`GROUP ${gd.group}`, x + 8, y + 20)

    // Teams
    userOrder.forEach((slug, pos) => {
      const team = teamMap.get(slug)
      if (!team) return

      const ty = y + 28 + pos * 32
      const isAdvancing = pos < 2

      // Row background
      ctx.fillStyle = isAdvancing ? 'rgba(160,212,148,0.08)' : 'rgba(255,255,255,0.02)'
      ctx.beginPath()
      ctx.roundRect?.(x + 4, ty + 2, cellW - 16, 26, 4)
      ctx.fill()

      // Pos badge
      ctx.fillStyle = isAdvancing ? BRAND.primary : SURFACE.outlineVariant
      ctx.font = 'bold 10px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${pos + 1}`, x + 16, ty + 18)

      // Flag
      ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", serif'
      ctx.textAlign = 'left'
      ctx.fillText(team.flag, x + 26, ty + 20)

      // Name
      ctx.fillStyle = isAdvancing ? SURFACE.onSurface : SURFACE.outline
      ctx.font = `${isAdvancing ? 'bold' : 'normal'} 11px Arial, sans-serif`
      ctx.fillText(team.name, x + 48, ty + 18)
    })
  })

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = SURFACE.outline
  ctx.font = '16px Arial, sans-serif'
  ctx.fillText('Build your bracket at kickoracle.com/simulator', CARD_W / 2, CARD_H - 18)
  ctx.textAlign = 'left'
}

// ── Single group card ─────────────────────────────────────────────────────────

function GroupCard({
  groupData,
  userOrder,
  onReorder,
}: {
  groupData: GroupData
  userOrder: string[]
  onReorder: (group: string, newOrder: string[]) => void
}) {
  const { trigger: haptic } = useHapticFeedback()
  const dragIdx = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const aiOrder = groupData.teams.map((t) => t.slug)
  const teamMap = new Map(groupData.teams.map((t) => [t.slug, t]))

  function moveUp(idx: number) {
    if (idx === 0) return
    haptic('selection')
    const next = [...userOrder]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onReorder(groupData.group, next)
  }

  function moveDown(idx: number) {
    if (idx === userOrder.length - 1) return
    haptic('selection')
    const next = [...userOrder]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onReorder(groupData.group, next)
  }

  function onDragStart(idx: number) {
    dragIdx.current = idx
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOver(idx)
  }

  function onDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault()
    setDragOver(null)
    if (dragIdx.current === null || dragIdx.current === dropIdx) return
    haptic('light')
    const next = [...userOrder]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dropIdx, 0, moved)
    dragIdx.current = null
    onReorder(groupData.group, next)
  }

  // Diff vs AI: is this position the same as AI?
  const diffCount = userOrder.filter((slug, i) => slug !== aiOrder[i]).length

  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <NeonAccentBar color={diffCount > 0 ? BRAND.tertiary : BRAND.primary} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-headline text-lg uppercase tracking-wide text-on-surface">
            Group {groupData.group}
          </span>
          {diffCount > 0 && (
            <span className="text-[9px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary">
              {diffCount} change{diffCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-[9px] font-label text-on-surface-variant uppercase tracking-widest">
          Top 2 advance
        </span>
      </div>

      <div className="space-y-1.5">
        {userOrder.map((slug, idx) => {
          const team = teamMap.get(slug)
          if (!team) return null
          const isAdvancing = idx < 2
          const aiIdx = aiOrder.indexOf(slug)
          const moved = idx !== aiIdx
          const posChange = aiIdx - idx // positive = user ranks higher than AI

          return (
            <div
              key={slug}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
              onDragLeave={() => setDragOver(null)}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all select-none cursor-grab active:cursor-grabbing ${
                isAdvancing
                  ? 'bg-primary/8 border border-primary/15'
                  : 'bg-white/[0.02] border border-white/[0.04]'
              } ${dragOver === idx ? 'ring-1 ring-primary/40 bg-primary/12' : ''}`}
            >
              {/* Position badge */}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                  isAdvancing ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-on-surface-variant'
                }`}
              >
                {idx + 1}
              </span>

              {/* Drag handle — desktop hint */}
              <span className="text-on-surface-variant/30 text-xs hidden sm:block shrink-0" aria-hidden>
                ⠿
              </span>

              {/* Flag */}
              <span className="text-xl shrink-0">{team.flag}</span>

              {/* Name */}
              <span
                className={`font-label text-xs font-semibold uppercase tracking-wide flex-1 min-w-0 truncate ${
                  isAdvancing ? 'text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                {team.name}
              </span>

              {/* AI diff indicator */}
              {moved && (
                <span
                  className={`text-[9px] font-mono font-bold shrink-0 ${
                    posChange > 0 ? 'text-primary' : 'text-secondary'
                  }`}
                  title={`AI ranked #${aiIdx + 1}`}
                >
                  {posChange > 0 ? `▲${posChange}` : `▼${Math.abs(posChange)}`}
                </span>
              )}

              {/* Mobile reorder buttons */}
              <div className="flex flex-col gap-0.5 sm:hidden shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="w-5 h-4 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface disabled:opacity-20 text-[10px] min-h-0"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === userOrder.length - 1}
                  className="w-5 h-4 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface disabled:opacity-20 text-[10px] min-h-0"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* FIFA ranking context */}
      <div className="mt-3 flex flex-wrap gap-1">
        {groupData.teams.map((t) => (
          <span key={t.slug} className="text-[9px] font-mono text-on-surface-variant">
            {t.flag}#{t.fifaRanking}
          </span>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Main client component ──────────────────────────────────────────────────────

interface SimulatorClientProps {
  groups: GroupData[]
}

export default function SimulatorClient({ groups }: SimulatorClientProps) {
  const { trigger: haptic } = useHapticFeedback()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Initialize from URL or default AI order
  const [order, setOrder] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const encoded = params.get('s')
      if (encoded) return decodeState(encoded, groups)
    }
    const defaultOrder: Record<string, string[]> = {}
    for (const gd of groups) {
      defaultOrder[gd.group] = gd.teams.map((t) => t.slug)
    }
    return defaultOrder
  })

  function handleReorder(group: string, newOrder: string[]) {
    setOrder((prev) => ({ ...prev, [group]: newOrder }))
  }

  function resetAll() {
    haptic('medium')
    const defaultOrder: Record<string, string[]> = {}
    for (const gd of groups) {
      defaultOrder[gd.group] = gd.teams.map((t) => t.slug)
    }
    setOrder(defaultOrder)
  }

  function getShareUrl(): string {
    const encoded = encodeState(order)
    return `https://kickoracle.com/simulator?s=${encoded}`
  }

  async function handleCopyLink() {
    haptic('light')
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable
    }
  }

  async function handleShareLink() {
    haptic('light')
    trackEvent({ event: 'tool_engaged', tool_name: 'simulator', tool_context: 'share' })
    const url = getShareUrl()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'My World Cup 2026 Group Stage Bracket',
          text: 'Check out my World Cup 2026 group stage predictions on KickOracle!',
          url,
        })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    await handleCopyLink()
  }

  function handleGenerateCard() {
    haptic('selection')
    setShowCard(true)
  }

  // Draw card whenever showCard becomes true or order changes while visible
  useEffect(() => {
    if (!showCard || !canvasRef.current) return
    drawSimulatorCard(canvasRef.current, order, groups)
  }, [showCard, order, groups])

  async function handleDownloadCard() {
    if (!canvasRef.current) return
    haptic('light')
    setDownloading(true)
    try {
      // Redraw at full res before download
      drawSimulatorCard(canvasRef.current, order, groups)
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'kickoracle-group-simulator-2026.png'
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  function twitterShareUrl(): string {
    const text = encodeURIComponent(
      `My World Cup 2026 group stage bracket is ready! Check it out on KickOracle 👇`
    )
    const url = encodeURIComponent(getShareUrl())
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=WorldCup2026,KickOracle`
  }

  const positionDiffs = countDiffs(order, groups)
  const advancementDiffs = countAdvancementDiffs(order, groups)
  const sortedGroups = groups.slice().sort((a, b) => a.group.localeCompare(b.group))

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <div className="font-headline text-2xl text-primary">{groups.length}</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Groups</span>
        </GlassCard>
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color={BRAND.tertiary} />
          <div className="font-headline text-2xl" style={{ color: BRAND.tertiary }}>{advancementDiffs}</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Groups Differ from AI</span>
        </GlassCard>
        <GlassCard className="p-4 text-center relative overflow-hidden">
          <NeonAccentBar color={BRAND.secondary} />
          <div className="font-headline text-2xl" style={{ color: BRAND.secondary }}>{positionDiffs}</div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Position Changes</span>
        </GlassCard>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <p className="text-on-surface-variant text-xs font-label">
          <span className="text-primary font-bold">Desktop:</span> Drag teams to reorder within each group.
          <span className="ml-4 text-tertiary font-bold">Mobile:</span> Use the ▲▼ arrows.
          Green = advancing (top 2). ▲▼ indicators show how your pick differs from the AI.
        </p>
      </div>

      {/* Groups grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-10">
        {sortedGroups.map((gd) => (
          <GroupCard
            key={gd.group}
            groupData={gd}
            userOrder={order[gd.group] ?? gd.teams.map((t) => t.slug)}
            onReorder={handleReorder}
          />
        ))}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3 mb-10">
        <button
          onClick={handleGenerateCard}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity min-h-[44px]"
        >
          Generate Share Card
        </button>
        <button
          onClick={handleShareLink}
          className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors min-h-[44px]"
        >
          {copied ? 'Link Copied!' : 'Share Bracket Link'}
        </button>
        <a
          href={twitterShareUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#1d9bf020] text-[#1d9bf0] border border-[#1d9bf030] font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-[#1d9bf030] transition-colors min-h-[44px]"
        >
          Post on X
        </a>
        {positionDiffs > 0 && (
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-2 bg-white/[0.04] text-on-surface-variant font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white/[0.07] transition-colors min-h-[44px]"
          >
            Reset to AI
          </button>
        )}
      </div>

      {/* Share card canvas */}
      {showCard && (
        <GlassCard className="p-4 md:p-6 relative overflow-hidden">
          <NeonAccentBar color={BRAND.tertiary} />
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface">
              Your Bracket Card
            </h3>
            <button
              onClick={handleDownloadCard}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 min-h-[44px]"
            >
              {downloading ? 'Saving…' : 'Download PNG'}
            </button>
          </div>
          <div className="w-full overflow-hidden rounded-xl bg-background border border-white/[0.06]">
            <canvas
              ref={canvasRef}
              width={CARD_W}
              height={CARD_H}
              className="w-full h-auto block"
              aria-label="Your World Cup 2026 group stage bracket"
            />
          </div>
        </GlassCard>
      )}
    </>
  )
}
