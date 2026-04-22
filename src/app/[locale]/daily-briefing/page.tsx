import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getDailyBriefingPageData, type DailyBriefingSignal } from '@/lib/site-data'
import { fetchWorldCupNews } from '@/lib/news-service'
import { getLatestNarrativePost } from '@/lib/blog-service'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'
import Paywall from '@/components/monetization/Paywall'
import { BRAND } from '@/lib/brand-tokens'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dailyBriefingPage' })
  return {
    title: t('heading'),
    description: t('description'),
    openGraph: {
      title: t('heading'),
      description: t('description'),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('heading'),
      description: t('description'),
    },
    alternates: { canonical: 'https://kickoracle.com/daily-briefing' },
  }
}

type Signal = DailyBriefingSignal

function getSignalIcon(type: Signal['type']): string {
  switch (type) {
    case 'injury': return '\u{1F3E5}'
    case 'transfer': return '\u{1F4B0}'
    case 'form': return '\u{1F4C8}'
    case 'tactical': return '\u{1F9E0}'
    case 'sentiment': return '\u{1F4AC}'
  }
}

function getImpactClass(impact: Signal['impact']): string {
  switch (impact) {
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
  }
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">{getSignalIcon(signal.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href={`/teams/${signal.team.slug}`}
              className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              {signal.team.flag} {signal.team.name}
            </Link>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label font-bold uppercase tracking-widest border ${getImpactClass(signal.impact)}`}>
              {signal.impact}
            </span>
          </div>
          <h3 className="font-headline text-base md:text-lg font-bold tracking-tight mb-1">
            {signal.headline}
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {signal.detail}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

export default async function DailyBriefingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dailyBriefingPage')
  const [briefingData, news] = await Promise.all([
    getDailyBriefingPageData(),
    fetchWorldCupNews(20),
  ])

  const { signals, signalTypes, highCount, mediumCount, trendingPlayers, liveCache } =
    briefingData
  const publishedBriefing = getLatestNarrativePost('daily_briefing')
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `World Cup 2026 Daily Briefing — ${today}`,
    description: 'AI-generated daily intelligence briefing for World Cup 2026',
    datePublished: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'KickOracle',
      url: 'https://kickoracle.com',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1440px] mx-auto text-center relative">
          <Badge variant="secondary" size="md">{t('badge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase mt-4 mb-4">
            {t('heading')}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-6">
            {t('description')}
          </p>
          <p className="font-label text-sm text-on-surface-variant uppercase tracking-widest mb-8">
            {today}
          </p>

          {/* Summary Stats */}
          <div className="flex flex-wrap justify-center gap-3">
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{signals.length}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{t('signals')}</span>
            </GlassCard>
            {news.length > 0 && (
              <GlassCard className="px-5 py-3 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-primary">{news.length}</span>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{t('liveNews')}</span>
              </GlassCard>
            )}
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-red-400">{highCount}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{t('highImpact')}</span>
            </GlassCard>
            <GlassCard className="px-5 py-3 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-yellow-400">{mediumCount}</span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{t('mediumImpact')}</span>
            </GlassCard>
          </div>
        </div>
      </section>

      {publishedBriefing && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <Paywall contentType="daily_briefing" previewLines={5}>
            <GlassCard className="p-6 md:p-7 border-primary/20">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <Badge variant="primary" size="sm">{t('publishedNarrative')}</Badge>
                  <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mt-3 mb-3">
                    {publishedBriefing.title}
                  </h2>
                  <p className="text-on-surface-variant leading-relaxed mb-4">
                    {publishedBriefing.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs font-label uppercase tracking-widest text-on-surface-variant">
                    {publishedBriefing.publishedAt && <span>Published {publishedBriefing.publishedAt}</span>}
                    {publishedBriefing.factCount && <span>{publishedBriefing.factCount} anchored facts</span>}
                  </div>
                </div>
                <Link
                  href={`/blog/${publishedBriefing.slug}`}
                  className="inline-flex items-center rounded-full border border-primary/40 px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                >
                  {t('readFullBriefing')}
                </Link>
              </div>
            </GlassCard>
          </Paywall>
        </section>
      )}

      {/* Live News Section */}
      {news.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              {t('liveNewsFeed')}
            </h2>
            <Badge variant="primary" size="sm">{t('realTime')}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <GlassCard className="p-5 h-full hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{'\u{1F4F0}'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline text-sm md:text-base font-bold tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.source && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-xs font-label uppercase tracking-widest text-on-surface-variant">
                            {item.source}
                          </span>
                        )}
                        {item.relativeTime && (
                          <span className="text-xs text-on-surface-variant/70 font-mono">
                            {item.relativeTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Signal Type Filter Labels */}
      <section className="max-w-[1440px] mx-auto px-6 mb-4">
        <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mb-6">
          {t('intelligenceSignals')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {signalTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 bg-surface-container rounded-full px-3 py-1.5 font-label text-xs uppercase tracking-widest text-on-surface-variant"
            >
              {getSignalIcon(type)} {type}
              <span className="font-mono text-xs text-on-surface-variant/70">
                ({signals.filter((s) => s.type === type).length})
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Signals Feed */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20">
        <GlassCard className="mb-5 p-5 md:p-6 border-primary/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-headline text-xl uppercase tracking-tight text-on-surface">
                {t('openSignalFeed')}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {t('freeSignalsNote')}
              </p>
            </div>
            <Badge variant="primary" size="sm">{t('freeSignals')}</Badge>
          </div>
        </GlassCard>
        <div className="space-y-3">
          {signals.map((signal, i) => (
            <SignalCard key={i} signal={signal} />
          ))}
        </div>
      </section>

      {/* Confirmed 2026 Fixtures — Real Data */}
      {liveCache.wcFixtures2026.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              {t('confirmedFixtures')}
            </h2>
            <Badge variant="primary" size="sm">{t('liveApi')}</Badge>
          </div>
          <p className="text-on-surface-variant text-sm mb-6">
            Real match data from <span className="text-primary">TheSportsDB</span> — updated{' '}
            {new Date(liveCache.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {liveCache.wcFixtures2026.slice(0, 9).map((match) => (
              <GlassCard key={match.id} className="p-5 relative overflow-hidden">
                <NeonAccentBar color={BRAND.primary} />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-label font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    Round {match.round}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-label text-sm font-semibold text-on-surface">{match.homeTeam}</span>
                  <span className="font-mono text-xs text-on-surface-variant font-bold px-2">
                    {match.homeScore != null ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                  </span>
                  <span className="font-label text-sm font-semibold text-on-surface text-right">{match.awayTeam}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant truncate">
                  {match.venue}
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline"
            >
              {t('confirmedFixtures')}
            </Link>
          </div>
        </section>
      )}

      {/* 2022 WC Flashbacks — Real Historical Data */}
      {liveCache.wcFixtures2022.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              {t('flashbacks')}
            </h2>
            <Badge variant="outline" size="sm">{t('historical')}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {liveCache.wcFixtures2022.slice(0, 10).map((match) => (
              <GlassCard key={match.id} className="p-4 relative overflow-hidden">
                <NeonAccentBar color={BRAND.tertiary} />
                <div className="text-center">
                  <div className="text-[10px] text-on-surface-variant mb-2">
                    {new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="font-label text-xs font-semibold text-on-surface">{match.homeTeam}</div>
                  <div className="font-mono text-lg font-bold my-1" style={{ color: BRAND.tertiary }}>
                    {match.homeScore} - {match.awayScore}
                  </div>
                  <div className="font-label text-xs font-semibold text-on-surface">{match.awayTeam}</div>
                  <div className="text-[10px] text-on-surface-variant mt-2 truncate">{match.venue}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Social Buzz — Trending Players */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
            {t('socialBuzz')}
          </h2>
          <Badge variant="primary" size="sm">{t('trending')}</Badge>
        </div>
        <Paywall contentType="prediction" previewLines={8}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trendingPlayers.map((player) => (
            <GlassCard key={player.playerSlug} className="p-5 relative overflow-hidden">
              <NeonAccentBar color={player.buzzScore >= 90 ? BRAND.tertiary : BRAND.primary} />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-base uppercase tracking-tight">
                    {player.playerSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  {player.trending && <span className="text-xs">🔥</span>}
                </div>
                <div
                  className="px-2 py-0.5 rounded-full font-mono text-xs font-bold"
                  style={{
                    background: player.buzzScore >= 90 ? 'rgba(233,196,0,0.2)' : 'rgba(160,212,148,0.2)',
                    color: player.buzzScore >= 90 ? BRAND.tertiary : BRAND.primary,
                  }}
                >
                  {player.buzzScore}/100
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {player.platforms.instagram && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    IG {player.platforms.instagram.followers}
                  </span>
                )}
                {player.platforms.twitter && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    X {player.platforms.twitter.followers}
                  </span>
                )}
                {player.platforms.tiktok && (
                  <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-white/[0.05] px-2 py-0.5 rounded-full">
                    TikTok {player.platforms.tiktok.followers}
                  </span>
                )}
              </div>
              {player.recentPosts[0] && (
                <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                  &ldquo;{player.recentPosts[0].summary}&rdquo;
                  <span className="text-xs text-on-surface-variant/50 ml-1">— {player.recentPosts[0].platform}</span>
                </p>
              )}
            </GlassCard>
          ))}
        </div>
        </Paywall>
      </section>

      {/* Newsletter */}
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <NewsletterSignup variant="banner" />
      </section>

      {/* CTA */}
      <section className="max-w-[1440px] mx-auto px-6 mb-20 text-center">
        <GlassCard className="p-8 md:p-12">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-3">
            {t('exploreTeamIntel')}
          </h2>
          <p className="text-on-surface-variant mb-6 max-w-lg mx-auto">
            {t('exploreTeamDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('browseAllTeams')}
            </Link>
            <Link
              href="/power-rankings"
              className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              {t('powerRankings')}
            </Link>
          </div>
        </GlassCard>
      </section>
    </>
  )
}
