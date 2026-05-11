import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getHomePageData } from '@/lib/site-data'
import { buildOGMeta, softwareApplicationJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { HOMEPAGE_HERO_IMAGE } from '@/lib/unsplash'
import { BRAND } from '@/lib/brand-tokens'
import TeamCard from '@/components/team/TeamCard'
import SectionHeader from '@/components/ui/SectionHeader'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'
import TrustStrip from '@/components/marketing/TrustStrip'
import TestimonialGrid from '@/components/marketing/TestimonialGrid'
import SubscriptionBanner from '@/components/marketing/SubscriptionBanner'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const alternates = buildAlternates(locale, '/')

  return {
    title: t('title'),
    description: t('description'),
    keywords:
      'World Cup 2026, World Cup intelligence, World Cup narratives, football analysis, team chemistry, player reports, World Cup 2026 schedule',
    alternates,
    ...buildOGMeta({
      title: t('title'),
      description: t('description'),
      url: alternates.canonical,
      locale,
    }),
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [{ topTeams }, hero, sections, features, home] = await Promise.all([
    getHomePageData(),
    getTranslations('hero'),
    getTranslations('sections'),
    getTranslations('features'),
    getTranslations('home'),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />

      {/* ─── Cinematic Hero ─── */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
        <Image
          src={HOMEPAGE_HERO_IMAGE}
          alt="Football players in action — passionate World Cup moment"
          fill
          priority
          className="object-cover brightness-[0.25] saturate-[1.4] contrast-[1.1] scale-105"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/40 z-10" />
        <div className="absolute inset-0 vignette z-10 opacity-60" />
        <div className="absolute inset-0 pitch-lines opacity-10 pointer-events-none z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[150px] z-15 pointer-events-none" />

        <div className="relative z-20 max-w-[1440px] w-full mx-auto px-6 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary/10 border border-secondary/20 font-label text-xs font-semibold tracking-widest uppercase mb-8 text-secondary animate-fade-in-up opacity-0">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" aria-hidden="true" />
            {hero('locationBadge')}
          </span>

          <h1 className="font-headline text-[clamp(2.25rem,6.5vw,5rem)] leading-[0.95] tracking-tight mb-6 animate-fade-in-up opacity-0 stagger-1 max-w-4xl">
            <span className="block text-on-surface">{hero('headlineLine1')}</span>
            <span className="block gradient-text">{hero('headlineLine2')}</span>
          </h1>

          <p className="text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10 animate-fade-in-up opacity-0 stagger-2">
            {hero('subtitle')}
          </p>

          <div className="w-full mb-6 animate-fade-in-up opacity-0 stagger-3">
            <NewsletterSignup variant="hero" source="hero" />
          </div>

          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up opacity-0 stagger-4">
            <Link
              href="/daily-briefing"
              className="text-on-surface-variant text-sm font-label uppercase tracking-widest hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {hero('ctaSecondary')} &rarr;
            </Link>
            <span className="text-on-surface-variant/30">·</span>
            <Link
              href="/teams"
              className="text-on-surface-variant text-sm font-label uppercase tracking-widest hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {hero('ctaTertiary')} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust Strip ─── */}
      <section className="page-container mt-12 mb-12">
        <TrustStrip />
      </section>

      {/* ─── Subscription Pivot Banner ─── */}
      <section className="page-container mb-16">
        <SubscriptionBanner />
      </section>

      {/* ─── Top Contenders — Editorial Hierarchy ─── */}
      <section id="top-teams" className="page-container mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <SectionHeader className="mb-3">{sections('topContendersTitle')}</SectionHeader>
            <p className="text-on-surface-variant mt-2 ml-4">
              {sections('topContendersSubtitle')}
            </p>
          </div>
          <Link
            href="/teams"
            className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline hidden md:block"
          >
            {home('viewAllTeams')} &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topTeams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* Feature Hub — Analysis */}
      <section className="page-container mb-16">
        <SectionHeader className="mb-8">{sections('analysisTitle')}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {([
            {
              titleKey: 'teams' as const,
              descKey: 'teamsDesc' as const,
              href: '/teams',
              icon: '\u{1F3C3}',
              accent: BRAND.primary,
            },
            {
              titleKey: 'matches' as const,
              descKey: 'matchesDesc' as const,
              href: '/matches',
              icon: '\u{26BD}',
              accent: BRAND.primaryFixed,
            },
            {
              titleKey: 'powerRankings' as const,
              descKey: 'powerRankingsDesc' as const,
              href: '/power-rankings',
              icon: '\u{1F3C6}',
              accent: BRAND.tertiary,
            },
            {
              titleKey: 'dailyBriefing' as const,
              descKey: 'dailyBriefingDesc' as const,
              href: '/daily-briefing',
              icon: '\u{1F4F0}',
              accent: BRAND.secondary,
            },
            {
              titleKey: 'narrativeLibrary' as const,
              descKey: 'narrativeLibraryDesc' as const,
              href: '/blog',
              icon: '\u{1F4DD}',
              accent: BRAND.tertiaryFixed,
              ns: 'home' as const,
            },
          ]).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline text-lg uppercase tracking-wide mb-2" style={{ color: feature.accent }}>
                {'ns' in feature ? home(feature.titleKey) : features(feature.titleKey)}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {'ns' in feature ? home(feature.descKey) : features(feature.descKey)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Tools & Resources ─── */}
      <section className="page-container mb-24">
        <SectionHeader className="mb-8">{sections('toolsTitle')}</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {([
            { titleKey: 'countdownTitle', descKey: 'countdownDesc', href: '/countdown', icon: '\u{23F3}', accent: BRAND.secondary },
            { titleKey: 'timeConverterTitle', descKey: 'timeConverterDesc', href: '/schedule/converter', icon: '\u{1F30D}', accent: BRAND.tertiary },
            { titleKey: 'groupAnalysisTitle', descKey: 'groupAnalysisDesc', href: '/groups/A', icon: '\u{1F4CA}', accent: BRAND.primaryFixed },
            { titleKey: 'compareTeamsTitle', descKey: 'compareTeamsDesc', href: '/compare', icon: '\u{2694}\u{FE0F}', accent: BRAND.primary },
            { titleKey: 'fullScheduleTitle', descKey: 'fullScheduleDesc', href: '/schedule', icon: '\u{1F5D3}\u{FE0F}', accent: BRAND.primaryFixed },
            { titleKey: 'blogTitle', descKey: 'blogDesc', href: '/blog', icon: '\u{1F4DD}', accent: BRAND.tertiary },
            { titleKey: 'playerIntelTitle', descKey: 'playerIntelDesc', href: '/teams', icon: '\u{1F9E0}', accent: BRAND.primary },
          ] as const).map((feature) => (
            <Link
              key={feature.titleKey}
              href={feature.href}
              className="group relative block rounded-xl bg-surface-container-low border border-white/[0.04] hover:border-white/10 transition-all p-5"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-headline text-sm uppercase tracking-wide mb-1" style={{ color: feature.accent }}>
                {home(feature.titleKey)}
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">
                {home(feature.descKey)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="page-container mb-24">
        <TestimonialGrid />
      </section>

      {/* ─── Newsletter ─── */}
      <section className="page-container mb-24">
        <NewsletterSignup variant="banner" />
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative w-full py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/10 blur-[200px]" />
        <div className="absolute inset-0 pitch-lines opacity-15 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl tracking-wide uppercase mb-6">
            {home('ctaHeadline')}
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-10">
            {home('ctaBody')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/daily-briefing"
              className="bg-tertiary text-on-tertiary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(233,196,0,0.3)] hover:shadow-[0_0_50px_rgba(233,196,0,0.5)]"
            >
              {home('ctaPrimary')}
            </Link>
            <Link
              href="/matches"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              {home('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
