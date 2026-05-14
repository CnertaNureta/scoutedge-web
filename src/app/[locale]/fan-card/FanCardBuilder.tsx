'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import BadgeGrid from '@/components/fan-card/BadgeGrid'
import CardThemePicker from '@/components/fan-card/CardThemePicker'
import { drawFanCard, CARD_W, CARD_H } from '@/components/fan-card/draw-fan-card'
import { AVATAR_OPTIONS, type AvatarEmoji, type CardThemeId, type FanCardData } from '@/lib/fan-card-types'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { BRAND } from '@/lib/brand-tokens'

interface TeamOption {
  slug: string
  name: string
  flag: string
}

interface FanCardBuilderProps {
  teams: TeamOption[]
}

const DEFAULT_EARNED_BADGES = ['first-pick', 'early-supporter', 'broadcaster']

export default function FanCardBuilder({ teams }: FanCardBuilderProps) {
  const t = useTranslations('fanCard')
  const [displayName, setDisplayName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')
  const [avatar, setAvatar] = useState<AvatarEmoji>('⚽')
  const [theme, setTheme] = useState<CardThemeId>('classic')
  const [favPlayer, setFavPlayer] = useState('')
  const [featuredBadges, setFeaturedBadges] = useState<string[]>(['first-pick', 'early-supporter'])
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { trigger: haptic } = useHapticFeedback()

  const selectedTeam = teams.find((t) => t.slug === teamSlug)

  const defaultName = t('defaultName')
  const pickTeamLabel = t('pickATeam')

  const cardData: FanCardData = useMemo(() => ({
    displayName: displayName || defaultName,
    teamSlug: teamSlug || 'brazil',
    avatar,
    theme,
    badges: featuredBadges,
    predictionsCount: 42,
    accuracy: 67,
    favPlayer,
  }), [displayName, teamSlug, avatar, theme, featuredBadges, favPlayer, defaultName])

  const redraw = useCallback(() => {
    if (!canvasRef.current) return
    const team = teams.find((tm) => tm.slug === cardData.teamSlug)
    drawFanCard(canvasRef.current, cardData, team?.name ?? pickTeamLabel, team?.flag ?? '🏴')
  }, [cardData, teams, pickTeamLabel])

  useEffect(() => {
    redraw()
  }, [redraw])

  function toggleBadge(badgeId: string) {
    haptic('selection')
    setFeaturedBadges((prev) =>
      prev.includes(badgeId)
        ? prev.filter((id) => id !== badgeId)
        : prev.length < 6 ? [...prev, badgeId] : prev,
    )
  }

  async function handleDownload() {
    if (!canvasRef.current) return
    haptic('light')
    setDownloading(true)
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `kickoracle-fan-card-${teamSlug || 'card'}.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    if (!canvasRef.current) return
    haptic('light')

    const teamText = selectedTeam ? `${selectedTeam.flag} ${selectedTeam.name}` : ''
    const shareText = t('shareText', { team: teamText })
    const shareTitle = t('shareTitle')
    const shareUrl = 'https://kickoracle.com/fan-card'

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, 'image/png'),
        )
        if (blob) {
          const file = new File([blob], 'kickoracle-fan-card.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: shareTitle, text: shareText, files: [file] })
            return
          }
        }
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable
    }
  }

  function twitterShareUrl(): string {
    const teamText = selectedTeam ? `${selectedTeam.flag} ${selectedTeam.name}` : ''
    const text = encodeURIComponent(t('shareTextWithUrl', { team: teamText }))
    const url = encodeURIComponent('https://kickoracle.com/fan-card')
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=WorldCup2026,KickOracle`
  }

  function whatsappShareUrl(): string {
    const teamText = selectedTeam ? `${selectedTeam.flag} ${selectedTeam.name}` : ''
    const text = encodeURIComponent(`${t('shareTextWithUrl', { team: teamText })} https://kickoracle.com/fan-card`)
    return `https://wa.me/?text=${text}`
  }

  const filteredTeams = teamSearch
    ? teams.filter((tm) => tm.name.toLowerCase().includes(teamSearch.toLowerCase()))
    : teams

  return (
    <div data-testid="fan-card" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Builder controls */}
      <div className="space-y-6">
        {/* Name input */}
        <GlassCard className="p-5 relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <h3 className="font-headline text-base uppercase tracking-wide mb-4 text-on-surface">
            {t('yourIdentity')}
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="fan-name" className="block font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
                {t('displayName')}
              </label>
              <input
                id="fan-name"
                type="text"
                maxLength={20}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('displayNamePlaceholder')}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="fav-player" className="block font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
                {t('favoritePlayer')}
              </label>
              <input
                id="fav-player"
                type="text"
                maxLength={30}
                value={favPlayer}
                onChange={(e) => setFavPlayer(e.target.value)}
                placeholder={t('favoritePlayerPlaceholder')}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>
        </GlassCard>

        {/* Avatar picker */}
        <GlassCard className="p-5 relative overflow-hidden">
          <NeonAccentBar color={BRAND.tertiary} />
          <h3 className="font-headline text-base uppercase tracking-wide mb-4 text-on-surface">
            {t('chooseAvatar')}
          </h3>
          <div className="grid grid-cols-8 gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { haptic('selection'); setAvatar(emoji) }}
                className={`flex items-center justify-center text-2xl p-2 rounded-lg border transition-all min-h-[44px]
                  ${avatar === emoji
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30 scale-110'
                    : 'border-white/[0.06] hover:border-white/15 hover:scale-105'
                  }
                `}
                aria-label={t('selectAvatarLabel', { emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Team picker */}
        <GlassCard className="p-5 relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <h3 className="font-headline text-base uppercase tracking-wide mb-3 text-on-surface">
            {t('yourTeam')}
          </h3>
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder={t('searchTeams')}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors mb-3"
          />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredTeams.map((team) => {
              const isSelected = teamSlug === team.slug
              return (
                <button
                  key={team.slug}
                  onClick={() => { haptic('selection'); setTeamSlug(team.slug) }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all min-h-[44px]
                    ${isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-white/[0.04] hover:border-white/10'
                    }
                  `}
                >
                  <span className="text-xl">{team.flag}</span>
                  <span className="font-label text-[8px] font-semibold uppercase tracking-wide text-center leading-tight text-on-surface">
                    {team.name}
                  </span>
                </button>
              )
            })}
          </div>
        </GlassCard>

        {/* Theme picker */}
        <GlassCard className="p-5 relative overflow-hidden">
          <NeonAccentBar color={BRAND.tertiary} />
          <h3 className="font-headline text-base uppercase tracking-wide mb-4 text-on-surface">
            {t('cardTheme')}
          </h3>
          <CardThemePicker selected={theme} onChange={(themeId) => { haptic('selection'); setTheme(themeId) }} />
        </GlassCard>

        {/* Badge selector */}
        <GlassCard className="p-5 relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <h3 className="font-headline text-base uppercase tracking-wide mb-1 text-on-surface">
            {t('badges')}
          </h3>
          <p className="text-on-surface-variant text-xs mb-4">
            {t('badgesDescription')}
          </p>
          <BadgeGrid
            earnedIds={DEFAULT_EARNED_BADGES}
            selectedIds={featuredBadges}
            onToggle={toggleBadge}
          />
        </GlassCard>
      </div>

      {/* Right: Card preview + actions */}
      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <GlassCard className="p-4 md:p-6 relative overflow-hidden">
          <NeonAccentBar color={BRAND.primary} />
          <h3 className="font-headline text-lg uppercase tracking-wide mb-4 text-on-surface">
            {t('yourFanCard')}
          </h3>
          <div className="w-full overflow-hidden rounded-xl bg-background border border-white/[0.06]">
            <canvas
              ref={canvasRef}
              width={CARD_W}
              height={CARD_H}
              className="w-full h-auto block"
              aria-label={t('fanCardAria', { name: displayName || defaultName })}
            />
          </div>
        </GlassCard>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {downloading ? t('savingPng') : t('downloadPng')}
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 10C6 10 7.5 12 10 12C12.5 12 14 10 14 8C14 6 12.5 4 10 4C8.5 4 7.5 5 7 5.5M10 6C10 6 8.5 4 6 4C3.5 4 2 6 2 8C2 10 3.5 12 6 12C7.5 12 8.5 11 9 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {copied ? t('copied') : t('share')}
          </button>

          <a
            href={twitterShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#1d9bf020] text-[#1d9bf0] border border-[#1d9bf030] font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-[#1d9bf030] transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t('postOnX')}
          </a>

          <a
            href={whatsappShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25d36620] text-[#25d366] border border-[#25d36630] font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-[#25d36630] transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t('whatsapp')}
          </a>
        </div>
      </div>
    </div>
  )
}
