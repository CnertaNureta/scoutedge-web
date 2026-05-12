'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Logo, PhotoPlaceholder, Stat, TEAMS } from './visual-system'
import { HeroLiveCard } from './HeroLiveCard'
import { HeroLiveTicker } from './HeroLiveTicker'

const MASTHEAD_NAV: Array<{ label: string; href: string }> = [
  { label: 'Predict', href: '/predictions' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Teams', href: '/teams' },
  { label: 'Rankings', href: '/power-rankings' },
  { label: 'Briefing', href: '/daily-briefing' },
  { label: 'Compare', href: '/compare' },
]

interface HeroNextFixtureLite {
  homeName: string
  homeCode: string
  homeColors: [string, string, string]
  awayName: string
  awayCode: string
  awayColors: [string, string, string]
  group: string
  round: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  kickoffLabel: string
}

interface HeroStatsLite {
  fixtures: number
  federations: number
  hitRate: string
  predictionsCast: string
}

interface HeroAProps {
  hideMasthead?: boolean
  nextFixture?: HeroNextFixtureLite
  stats?: HeroStatsLite
  tickerItems?: string[]
}

function toPct(value: number): number {
  return value > 1 ? value : value * 100
}

export function HeroA({
  hideMasthead = false,
  nextFixture,
  stats,
  tickerItems,
}: HeroAProps) {
  const t = useTranslations('magazine.hero')
  const tickerInitial =
    tickerItems && tickerItems.length > 0
      ? tickerItems
      : [
          'BRA vs ARG · in 4h',
          'ENG vs NED · in 6h',
          'FRA vs ESP · in 1d',
          'GER vs POR · in 1d',
          'USA vs JPN · in 2d',
          'NED vs CRO · in 2d',
        ]
  const heroStats = stats ?? {
    fixtures: 48,
    federations: 32,
    hitRate: '—',
    predictionsCast: '—',
  }
  const initialCardFixture = nextFixture ?? {
    homeName: 'Brazil',
    homeCode: 'BRA',
    homeColors: TEAMS.BRA.colors,
    awayName: 'Argentina',
    awayCode: 'ARG',
    awayColors: TEAMS.ARG.colors,
    group: 'D',
    round: 'M14',
    homeWinProb: 58,
    drawProb: 14,
    awayWinProb: 28,
    kickoffLabel: 'TONIGHT',
  }
  return (
    <div
      data-testid="hero-a"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--ink)',
        color: 'var(--cream)',
        overflow: 'hidden',
      }}
    >
      {/* Background photo placeholder with cinematic treatment */}
      <PhotoPlaceholder
        caption="[striker · roar · golden-hour stadium]"
        className="no-caption"
        noCaption
        src="/images/kick-oracle/hero-bra-vini.jpg"
        alt="Striker celebrating in golden-hour stadium light"
        style={{ position: 'absolute', inset: 0 }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(22% 45% at 64% 52%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 30%, transparent 70%),
              radial-gradient(14% 22% at 66% 30%, rgba(245,239,228,0.10) 0%, transparent 70%),
              radial-gradient(28% 35% at 65% 75%, rgba(0,0,0,0.55) 0%, transparent 60%)
            `,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(35% 25% at 30% 0%, rgba(243,201,105,0.16) 0%, transparent 70%),
              radial-gradient(35% 25% at 75% 0%, rgba(243,201,105,0.10) 0%, transparent 70%)
            `,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(70% 50% at 50% 115%, rgba(168,224,99,0.22), transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(95deg, rgba(10,13,10,0.92) 0%, rgba(10,13,10,0.72) 28%, rgba(10,13,10,0.15) 50%, rgba(10,13,10,0.0) 65%, rgba(10,13,10,0.85) 100%),
              linear-gradient(180deg, rgba(10,13,10,0.55) 0%, transparent 18%, transparent 70%, rgba(10,13,10,0.95) 100%)
            `,
          }}
        />
        <div
          className="ko-pitch-grid"
          style={{ position: 'absolute', inset: 0, opacity: 0.5, mixBlendMode: 'screen' }}
        />
      </PhotoPlaceholder>

      {/* Masthead (optional, hidden in full homepage) */}
      {!hideMasthead && (
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '20px 56px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 12,
            borderBottom: '1px solid rgba(245,239,228,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Logo />
            <span style={{ height: 18, width: 1, background: 'rgba(245,239,228,0.2)' }} />
            <span
              className="ko-mono"
              style={{ fontSize: 10, letterSpacing: '0.24em', color: 'rgba(245,239,228,0.55)' }}
            >
              VOL. 02 · ISSUE 14 · 12 MAY 2026
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 26 }}>
            {MASTHEAD_NAV.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className="ko-label"
                style={{
                  fontSize: 11,
                  color: i === 0 ? 'var(--green)' : 'var(--cream)',
                  opacity: i === 0 ? 1 : 0.8,
                  cursor: 'pointer',
                  position: 'relative',
                  textDecoration: 'none',
                }}
              >
                {item.label}
                {i === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--green)',
                    }}
                  >
                    ·
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span
              className="ko-mono"
              style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(245,239,228,0.6)' }}
            >
              EN · ZH
            </span>
            <Link
              href="/auth/login"
              className="ko-btn ko-btn-primary"
              style={{ padding: '8px 16px', fontSize: 10 }}
            >
              Sign In
            </Link>
          </div>
        </header>
      )}

      {/* Left edge vertical issue marker */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 100,
          bottom: 90,
          display: 'flex',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            display: 'flex',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <span
            className="ko-mono"
            style={{ fontSize: 9, letterSpacing: '0.32em', color: 'var(--green)' }}
          >
            {t('verticalBrand')}
          </span>
          <span
            className="ko-mono"
            style={{ fontSize: 9, letterSpacing: '0.32em', color: 'rgba(245,239,228,0.45)' }}
          >
            {t('verticalEst')}
          </span>
        </div>
      </div>

      {/* Floating "Tonight's Match" cover card (top-right) — client island,
          polls /api/v1/live-matches every 30s. SSR provides initial fixture. */}
      <HeroLiveCard initialFixture={initialCardFixture} />

      {/* Main headline — bottom-left magazine treatment */}
      <div style={{ position: 'absolute', left: 72, bottom: 96, right: 380, zIndex: 10 }}>
        <div
          className="ko-eyebrow ko-green"
          style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 24, height: 1, background: 'var(--green)' }} />
          {t('eyebrow', {
            fixtures: heroStats.fixtures,
            federations: heroStats.federations,
          })}
        </div>

        <h1
          className="ko-display"
          style={{ fontSize: 168, margin: 0, lineHeight: 0.88, letterSpacing: '-0.02em' }}
        >
          {t('headlineLine1')}
          <br />
          <em style={{ color: 'var(--gold)' }}>{t('headlineEmphasis')}</em>{' '}
          <span
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              padding: '6px 22px',
              background: 'var(--green)',
              color: 'var(--ink)',
              fontFamily: 'var(--f-condensed)',
              fontWeight: 900,
              fontSize: 76,
              letterSpacing: '0.01em',
              transform: 'translateY(-12px)',
              boxShadow: '8px 8px 0 var(--ink), 8px 8px 0 1px rgba(168,224,99,0.4)',
            }}
          >
            {t('headlineStrike')}
          </span>
          <br />
          {t('headlineLine3')}
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 36,
            gap: 40,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, maxWidth: 500 }}>
            <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--green)' }} />
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, opacity: 0.9 }}>
              {t('subtitle')}{' '}
              <em style={{ color: 'var(--gold)' }}>{t('subtitleEm')}</em>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link href="/predictions" className="ko-btn ko-btn-primary">
              {t('ctaPrimary')}
            </Link>
            <Link href="/predictions" className="ko-btn ko-btn-ghost">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom credit + stats strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 56px',
          borderTop: '1px solid rgba(245,239,228,0.12)',
          background: 'rgba(10,13,10,0.78)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 44 }}>
          <Stat n={String(heroStats.fixtures)} label={t('statFixtures')} />
          <Stat n={String(heroStats.federations)} label={t('statFederations')} />
          {/* Hit-rate and predictions-cast need the user_predictions table
              (see docs/leaderboard-schema.md). Render em-dash until it ships. */}
          <Stat n={heroStats.hitRate} label={t('statHitRate')} />
          <Stat n={heroStats.predictionsCast} label={t('statPredictions')} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            className="ko-mono"
            style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--green)' }}
          >
            {t('scroll')}
          </span>
          <span
            className="ko-mono ko-muted"
            style={{ fontSize: 10, letterSpacing: '0.22em' }}
          >
            {t('section02Label')}
          </span>
        </div>
      </div>

      {/* Live ticker pinned just above bottom strip — client island, polls
          /api/v1/live-matches every 30s. SSR provides initial items. */}
      <HeroLiveTicker initialItems={tickerInitial} />
    </div>
  )
}
