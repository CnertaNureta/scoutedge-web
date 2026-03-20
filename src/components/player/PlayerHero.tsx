'use client'

import { useState, useCallback } from 'react'
import type { Player, Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import { getPlayerPhoto } from '@/lib/utils'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import StatRadar from '@/components/player/StatRadar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { Heart, MapPin, Hash, Shield, ChevronLeft } from 'lucide-react'

interface PlayerHeroProps {
  player: Player
  team: Team
}

export default function PlayerHero({ player, team }: PlayerHeroProps) {
  const initialCheers =
    player.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7 +
    player.caps * 3

  const [cheers, setCheers] = useState(initialCheers)
  const [hasCheered, setHasCheered] = useState(false)
  const [showBurst, setShowBurst] = useState(false)

  const colors = getTeamColors(team.slug)
  const playerPhoto = getPlayerPhoto(player)
  const derived = computeDerivedStats(player)

  const handleCheer = useCallback(() => {
    if (hasCheered) return
    setCheers((prev) => prev + 1)
    setHasCheered(true)
    setShowBurst(true)
    const timer = setTimeout(() => setShowBurst(false), 600)
    return () => clearTimeout(timer)
  }, [hasCheered])

  return (
    <section
      className="relative min-h-[90vh] w-full overflow-hidden flex items-center"
      style={
        {
          '--team-primary': colors.primary,
          '--team-secondary': colors.secondary,
          '--team-glow': colors.glow,
        } as React.CSSProperties
      }
    >
      {/* ── Background: dark gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060806] via-background to-[#0a160a]" />

      {/* Grass texture overlay */}
      <div className="absolute inset-0 grass-texture opacity-[0.04] pointer-events-none" />

      {/* Ambient team-color glow blobs */}
      <div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[200px] opacity-[0.08]"
        style={{ background: colors.glow }}
      />
      <div
        className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full blur-[180px] opacity-[0.05]"
        style={{ background: colors.secondary }}
      />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-40" />

      {/* Vignette */}
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 py-16 md:py-20">
        {/* Breadcrumb */}
        <Link
          href={`/teams/${team.slug}`}
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors group mb-10 md:mb-14"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-label text-sm font-bold uppercase tracking-widest">
            {team.flag} {team.name}
          </span>
        </Link>

        {/* Two-column layout: photo left, glass card right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* ── LEFT: Player cutout with dynamic color blocks ── */}
          <div className="relative flex justify-center lg:justify-center min-h-[420px] md:min-h-[540px]">
            {/* Dynamic color blocks behind player */}
            <div
              className="absolute top-4 left-1/2 -translate-x-[60%] w-60 h-80 rounded-3xl -rotate-[10deg] opacity-25 blur-sm"
              style={{
                background: `linear-gradient(145deg, ${colors.primary}, ${colors.glow})`,
              }}
            />
            <div
              className="absolute top-12 left-1/2 -translate-x-[35%] w-52 h-72 rounded-3xl rotate-[6deg] opacity-20 blur-sm"
              style={{
                background: `linear-gradient(225deg, ${colors.secondary}, ${colors.primary})`,
              }}
            />
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-20 blur-3xl"
              style={{ background: colors.glow }}
            />
            {/* Small accent block */}
            <div
              className="absolute top-1/4 right-[10%] w-20 h-20 rounded-2xl rotate-[25deg] opacity-15 blur-[2px]"
              style={{ background: colors.secondary }}
            />

            {/* Player cutout */}
            {playerPhoto ? (
              <div className="relative z-10">
                <img
                  src={playerPhoto}
                  alt={`${player.name} cutout photo`}
                  loading="eager"
                  className="h-[420px] md:h-[540px] lg:h-[600px] object-contain relative z-10"
                  style={{
                    filter: `drop-shadow(0 0 80px ${colors.glow}35) drop-shadow(0 0 40px ${colors.glow}18)`,
                  }}
                />
                {/* Ground reflection */}
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[260px] h-[36px] rounded-full blur-3xl opacity-50"
                  style={{ background: colors.glow }}
                />
              </div>
            ) : (
              <div className="relative z-10 h-[420px] md:h-[540px] lg:h-[600px] w-[300px] flex items-center justify-center">
                <div
                  className="w-52 h-52 rounded-full opacity-20 blur-xl"
                  style={{ background: colors.glow }}
                />
                <span
                  className="absolute font-headline text-[220px] font-black opacity-[0.08]"
                  style={{ color: colors.glow }}
                >
                  {player.number}
                </span>
              </div>
            )}

            {/* Ghost number watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 select-none pointer-events-none">
              <span
                className="font-headline text-[240px] md:text-[320px] font-black leading-none opacity-[0.03]"
                style={{ WebkitTextStroke: `2px ${colors.glow}18` }}
              >
                {player.number}
              </span>
            </div>
          </div>

          {/* ── RIGHT: Glassmorphism card ── */}
          <div className="relative">
            <div className="glass-hero-card rounded-2xl border border-white/[0.08] p-6 md:p-8 space-y-5 relative overflow-hidden">
              {/* Neon top border */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent 5%, ${colors.glow} 50%, transparent 95%)`,
                }}
              />

              {/* Inner ambient glow */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
                style={{ background: colors.glow }}
              />

              {/* H1: Player full name — SEO critical */}
              <div>
                <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-[0.88]">
                  <span className="text-stroke block text-3xl md:text-4xl lg:text-5xl">
                    {player.name.split(' ')[0]}
                  </span>
                  <span className="block" style={{ color: colors.glow }}>
                    {player.name.split(' ').slice(1).join(' ')}
                  </span>
                </h1>
              </div>

              {/* Info pills: number · position · club */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <Hash className="w-3.5 h-3.5" style={{ color: colors.glow }} />
                  <span className="font-mono text-sm font-bold">{player.number}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <Shield className="w-3.5 h-3.5" style={{ color: colors.glow }} />
                  <span className="font-body text-sm">{player.position}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <MapPin className="w-3.5 h-3.5" style={{ color: colors.glow }} />
                  <span className="font-body text-sm">{player.club}</span>
                </span>
              </div>

              {/* Fitness */}
              <div className="flex items-center gap-3">
                <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
                {player.fitnessStatus !== 'green' && (
                  <Badge
                    variant={player.fitnessStatus === 'amber' ? 'tertiary' : 'secondary'}
                    size="md"
                  >
                    {player.fitnessNote}
                  </Badge>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Radar chart */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-1 h-4 rounded-full"
                    style={{ background: colors.glow }}
                  />
                  <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Performance Radar
                  </span>
                </div>
                <StatRadar
                  stats={derived}
                  teamGlow={colors.glow}
                  teamPrimary={colors.primary}
                />
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Caps', value: player.caps },
                  { label: 'Goals', value: player.goals },
                  { label: 'Assists', value: player.assists },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]"
                  >
                    <span
                      className="font-headline text-2xl font-black block"
                      style={{ color: colors.glow }}
                    >
                      {s.value}
                    </span>
                    <span className="font-label text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Cheer / 点赞助威 button ── */}
        <div className="flex justify-center mt-14">
          <button
            type="button"
            onClick={handleCheer}
            disabled={hasCheered}
            className={`
              group relative inline-flex items-center gap-3 px-8 py-4 rounded-full
              border transition-all duration-300 font-label font-bold uppercase tracking-widest text-sm
              ${
                hasCheered
                  ? 'bg-white/[0.06] border-white/20 cursor-default'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:scale-105 active:scale-95 cursor-pointer'
              }
            `}
            style={
              hasCheered
                ? {
                    borderColor: `${colors.glow}50`,
                    boxShadow: `0 0 40px ${colors.glow}12`,
                  }
                : undefined
            }
          >
            {/* Burst particles */}
            {showBurst &&
              Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-cheer-burst pointer-events-none"
                  style={
                    {
                      background: colors.glow,
                      '--burst-angle': `${i * 45}deg`,
                    } as React.CSSProperties
                  }
                />
              ))}

            <Heart
              className={`w-5 h-5 transition-all duration-300 ${
                hasCheered ? 'fill-current scale-110' : 'group-hover:scale-110'
              }`}
              style={hasCheered ? { color: colors.glow } : undefined}
            />
            <span style={hasCheered ? { color: colors.glow } : undefined}>
              {hasCheered ? 'Cheered!' : 'Cheer'}
            </span>
            <span className="font-mono text-xs opacity-60">
              {cheers.toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom neon line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] z-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.glow}80, ${colors.secondary}60, transparent)`,
        }}
      />
    </section>
  )
}
