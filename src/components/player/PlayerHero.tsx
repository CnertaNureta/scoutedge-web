'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Player, Team } from '@/lib/types'
import type { DerivedStats } from '@/lib/player-derived-stats'
import { getTeamColors } from '@/lib/team-colors'
import { getPlayerPhoto, hashString } from '@/lib/utils'
import StatRadar from '@/components/player/StatRadar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'
import PositionBadge from '@/components/ui/PositionBadge'
import Link from 'next/link'
import { Heart, MapPin, Hash, ChevronLeft } from 'lucide-react'

const PILL_CLASS = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-colors'

interface PlayerHeroProps {
  player: Player
  team: Team
  derivedStats: DerivedStats
}

export default function PlayerHero({ player, team, derivedStats }: PlayerHeroProps) {
  const colors = getTeamColors(team.slug)
  const [cheers, setCheers] = useState(
    () => hashString(player.name) * 7 + player.caps * 3
  )
  const [hasCheered, setHasCheered] = useState(false)
  const [showBurst, setShowBurst] = useState(false)
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playerPhoto = getPlayerPhoto(player)
  const [firstName, ...restParts] = player.name.split(' ')
  const surname = restParts.length > 0 ? restParts.join(' ') : firstName

  useEffect(() => {
    return () => {
      if (burstTimer.current) clearTimeout(burstTimer.current)
    }
  }, [])

  const handleCheer = useCallback(() => {
    if (hasCheered) return
    setCheers((prev) => prev + 1)
    setHasCheered(true)
    setShowBurst(true)
    burstTimer.current = setTimeout(() => setShowBurst(false), 600)
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
      {/* Background: deep navy gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040812] via-background to-[#060a18]" />

      {/* Mesh gradient with team colors */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 40%, ${colors.glow}12 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, ${colors.secondary}08 0%, transparent 40%)
          `,
        }}
      />

      {/* Grass texture overlay */}
      <div className="absolute inset-0 grass-texture opacity-[0.03] pointer-events-none" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-30" />

      {/* Vignette */}
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 py-16 md:py-20">
        {/* Breadcrumb */}
        <Link
          href={`/teams/${team.slug}`}
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group mb-10 md:mb-14"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-label text-sm font-medium uppercase tracking-widest">
            {team.flag} {team.name}
          </span>
        </Link>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT: Player cutout with dynamic color blocks */}
          <div className="relative flex justify-center lg:justify-center min-h-[420px] md:min-h-[540px]">
            {/* Dynamic color blocks behind player */}
            <div
              className="absolute top-4 left-1/2 -translate-x-[60%] w-60 h-80 rounded-3xl -rotate-[10deg] opacity-20 blur-sm"
              style={{
                background: `linear-gradient(145deg, ${colors.primary}, ${colors.glow})`,
              }}
            />
            <div
              className="absolute top-12 left-1/2 -translate-x-[35%] w-52 h-72 rounded-3xl rotate-[6deg] opacity-15 blur-sm"
              style={{
                background: `linear-gradient(225deg, ${colors.secondary}, ${colors.primary})`,
              }}
            />
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-15 blur-3xl"
              style={{ background: colors.glow }}
            />
            {/* Small accent block */}
            <div
              className="absolute top-1/4 right-[10%] w-20 h-20 rounded-2xl rotate-[25deg] opacity-10 blur-[2px]"
              style={{ background: colors.secondary }}
            />

            {/* Player cutout */}
            {playerPhoto ? (
              <div className="relative z-10">
                <Image
                  src={playerPhoto}
                  alt={`${player.name} cutout photo`}
                  width={600}
                  height={600}
                  priority
                  sizes="(min-width: 1024px) 600px, (min-width: 768px) 540px, 420px"
                  className="h-[420px] md:h-[540px] lg:h-[600px] w-auto object-contain relative z-10"
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
                  className="absolute font-headline text-[220px] opacity-[0.08]"
                  style={{ color: colors.glow }}
                >
                  {player.number}
                </span>
              </div>
            )}

            {/* Ghost number watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 select-none pointer-events-none">
              <span
                className="font-headline text-[240px] md:text-[320px] leading-none opacity-[0.03]"
                style={{ WebkitTextStroke: `2px ${colors.glow}18` }}
              >
                {player.number}
              </span>
            </div>
          </div>

          {/* RIGHT: Glassmorphism card */}
          <div className="relative">
            <div className="glass-hero-card rounded-2xl border border-white/[0.08] p-6 md:p-8 space-y-5 relative overflow-hidden">
              <NeonAccentBar color={colors.glow} />

              {/* Inner ambient glow */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-[0.06] pointer-events-none"
                style={{ background: colors.glow }}
              />

              {/* Player full name */}
              <div>
                <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl tracking-wide uppercase leading-[0.85]">
                  <span className="text-stroke block text-4xl md:text-5xl lg:text-6xl">
                    {firstName}
                  </span>
                  <span className="block" style={{ color: colors.glow }}>
                    {surname}
                  </span>
                </h1>
              </div>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2">
                <span className={PILL_CLASS}>
                  <Hash className="w-3.5 h-3.5" style={{ color: colors.glow }} />
                  <span className="font-mono text-sm font-bold">{player.number}</span>
                </span>
                <PositionBadge position={player.position} variant="pill" />
                <span className={PILL_CLASS}>
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
                  <span className="font-label text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
                    Performance Radar
                  </span>
                </div>
                <StatRadar
                  stats={derivedStats}
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
                      className="font-headline text-3xl block"
                      style={{ color: colors.glow }}
                    >
                      {s.value}
                    </span>
                    <span className="font-label text-[9px] font-semibold text-on-surface-variant uppercase tracking-widest">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Cheer button */}
        <div className="flex justify-center mt-14">
          <button
            type="button"
            onClick={handleCheer}
            disabled={hasCheered}
            className={`
              group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl
              border transition-all duration-300 font-label font-semibold uppercase tracking-widest text-sm
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
        className="absolute bottom-0 left-0 right-0 h-[2px] z-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.glow}80, ${colors.secondary}60, transparent)`,
        }}
      />
    </section>
  )
}
