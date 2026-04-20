import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getHomePageData } from '@/lib/site-data'
import { buildOGMeta, websiteJsonLd, organizationJsonLd } from '@/lib/og-utils'
import { getTeamHeroImage, HOMEPAGE_HERO_IMAGE } from '@/lib/unsplash'
import { BRAND } from '@/lib/brand-tokens'
import TeamCard from '@/components/team/TeamCard'
import SectionHeader from '@/components/ui/SectionHeader'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'World Cup 2026 Narratives, Squad Analysis & Match Intelligence | KickOracle',
  description:
    'Narrative-first World Cup 2026 intelligence for all 48 teams. Squad chemistry reads, player reports, and match context across the USA, Canada, and Mexico.',
  keywords:
    'World Cup 2026, World Cup intelligence, World Cup narratives, football analysis, team chemistry, player reports, World Cup 2026 schedule',
  alternates: {
    canonical: 'https://kickoracle.com',
    languages: {
      'x-default': 'https://kickoracle.com',
      en: 'https://kickoracle.com',
      es: 'https://kickoracle.com/es',
      'zh-Hans': 'https://kickoracle.com/zh',
      pt: 'https://kickoracle.com/pt',
      ar: 'https://kickoracle.com/ar',
      fr: 'https://kickoracle.com/fr',
      ja: 'https://kickoracle.com/ja',
      ko: 'https://kickoracle.com/ko',
      de: 'https://kickoracle.com/de',
    },
  },
  ...buildOGMeta({
    title: 'World Cup 2026 Narratives & Squad Analysis | KickOracle',
    description: 'Narrative-first intelligence for all 48 teams. Chemistry indexes, match context, and player scouting reports.',
    url: 'https://kickoracle.com',
  }),
}

export default async function HomePage() {
  const { topTeams } = await getHomePageData()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />

      {/* ─── Cinematic Hero ─── */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
        {/* Background — player action shot (passionate moment) */}
        <Image
          src={HOMEPAGE_HERO_IMAGE}
          alt="Football players in action — passionate World Cup moment"
          fill
          priority
          className="object-cover brightness-[0.25] saturate-[1.4] contrast-[1.1] scale-105"
          sizes="100vw"
        />

        {/* Cinematic gradient overlays — deeper for player-focused drama */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/40 z-10" />

        {/* Vignette for cinematic depth */}
        <div className="absolute inset-0 vignette z-10 opacity-60" />

        {/* Subtle pitch lines */}
        <div className="absolute inset-0 pitch-lines opacity-10 pointer-events-none z-10" />

        {/* Ambient glow behind content — cinematic spotlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[150px] z-15 pointer-events-none" />

        {/* Content */}
        <div className="relative z-20 max-w-[1440px] w-full mx-auto px-6 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary/10 border border-secondary/20 font-label text-xs font-semibold tracking-widest uppercase mb-8 text-secondary animate-fade-in-up opacity-0">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" aria-hidden="true" />
            USA &middot; Canada &middot; Mexico
          </span>

          <h1 className="font-headline text-[clamp(3rem,10vw,9rem)] leading-[0.85] tracking-wide uppercase mb-4 animate-fade-in-up opacity-0 stagger-1">
            <span className="block text-on-surface">WORLD CUP</span>
            <span className="block gradient-text">2026</span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12 animate-fade-in-up opacity-0 stagger-2">
            Narrative-first team dossiers, chemistry reads, match leverage, and player intelligence
            for all 48 nations competing across the United States, Canada, and Mexico.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up opacity-0 stagger-3">
            <Link
              href="/teams"
              className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all animate-neon-glow"
            >
              Explore All 48 Teams
            </Link>
            <Link
              href="/daily-briefing"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              Read Daily Briefing
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Top Contenders — Editorial Hierarchy ─── */}
      <section id="top-teams" className="page-container mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <SectionHeader className="mb-3">Top Contenders</SectionHeader>
            <p className="text-on-surface-variant mt-2 ml-4">
              The highest-ranked nations heading into the 2026 tournament
            </p>
          </div>
          <Link
            href="/teams"
            className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline hidden md:block"
          >
            All 48 Teams &rarr;
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
        <SectionHeader className="mb-8">Analysis &amp; Intelligence</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {([
            {
              title: 'All 48 Teams',
              desc: 'Squad chemistry, tactical profiles, and team identity reads for every nation.',
              href: '/teams',
              icon: '\u{1F3C3}',
              accent: BRAND.primary,
            },
            {
              title: 'Match Schedule',
              desc: 'Full group-stage fixtures with travel context, venue notes, and model reads.',
              href: '/matches',
              icon: '\u{26BD}',
              accent: BRAND.primaryFixed,
            },
            {
              title: 'Power Rankings',
              desc: 'AI-driven rankings combining form, chemistry, and squad depth.',
              href: '/power-rankings',
              icon: '\u{1F3C6}',
              accent: BRAND.tertiary,
            },
            {
              title: 'Daily Briefing',
              desc: 'Live news feed and AI-extracted signals updated daily.',
              href: '/daily-briefing',
              icon: '\u{1F4F0}',
              accent: BRAND.secondary,
            },
            {
              title: 'Narrative Library',
              desc: 'Published briefings, team essays, and match stories written for real tournament context.',
              href: '/blog',
              icon: '\u{1F4DD}',
              accent: BRAND.tertiaryFixed,
            },
          ] as const).map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline text-lg uppercase tracking-wide mb-2" style={{ color: feature.accent }}>
                {feature.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Tools & Resources ─── */}
      <section className="page-container mb-24">
        <SectionHeader className="mb-8">Tools &amp; Resources</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {([
            {
              title: 'Countdown',
              desc: 'Live countdown to kickoff with key dates and venue highlights.',
              href: '/countdown',
              icon: '\u{23F3}',
              accent: BRAND.secondary,
            },
            {
              title: 'Time Converter',
              desc: 'Match kick-off times converted to your local time zone.',
              href: '/schedule/converter',
              icon: '\u{1F30D}',
              accent: BRAND.tertiary,
            },
            {
              title: 'Group Analysis',
              desc: 'Deep-dive into all 12 groups with standings and qualification odds.',
              href: '/groups/A',
              icon: '\u{1F4CA}',
              accent: BRAND.primaryFixed,
            },
            {
              title: 'Compare Teams',
              desc: 'Head-to-head comparisons for all 1,128 possible matchups.',
              href: '/compare',
              icon: '\u{2694}\u{FE0F}',
              accent: BRAND.primary,
            },
            {
              title: 'Full Schedule',
              desc: 'Tournament-wide kickoff planning across venues, dates, and host cities.',
              href: '/schedule',
              icon: '\u{1F5D3}\u{FE0F}',
              accent: BRAND.primaryFixed,
            },
            {
              title: 'Blog',
              desc: 'Plain-English analysis, tournament essays, and World Cup guides.',
              href: '/blog',
              icon: '\u{1F4DD}',
              accent: BRAND.tertiary,
            },
            {
              title: 'Player Intel',
              desc: 'Use team pages to move from national narratives into player-level context.',
              href: '/teams',
              icon: '\u{1F9E0}',
              accent: BRAND.primary,
            },
          ] as const).map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative block rounded-xl bg-surface-container-low border border-white/[0.04] hover:border-white/10 transition-all p-5"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-headline text-sm uppercase tracking-wide mb-1" style={{ color: feature.accent }}>
                {feature.title}
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">{feature.desc}</p>
            </Link>
          ))}
        </div>
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
            Narratives Over <span className="text-tertiary">Noise</span>
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-10">
            KickOracle v1 is focused on the tournament stories that matter most: team identity, player signals,
            and match context without forum clutter, betting prompts, or subscription walls dominating the journey.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/daily-briefing"
              className="bg-tertiary text-on-tertiary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(233,196,0,0.3)] hover:shadow-[0_0_50px_rgba(233,196,0,0.5)]"
            >
              Read The Briefing
            </Link>
            <Link
              href="/matches"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              Open Match Board
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
