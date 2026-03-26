import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllTeams } from '@/lib/data-service'
import { SUPPORTED_LOCALES, LOCALE_CONFIGS, TRANSLATIONS } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import TeamCard from '@/components/team/TeamCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import SectionHeader from '@/components/ui/SectionHeader'

interface PageProps {
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) return { title: 'Not Found' }

  const t = TRANSLATIONS[locale as Locale]
  const config = LOCALE_CONFIGS[locale as Locale]

  // Build hreflang alternates
  const languages: Record<string, string> = { 'x-default': 'https://scoutedge.ai' }
  for (const loc of SUPPORTED_LOCALES) {
    languages[LOCALE_CONFIGS[loc].hreflang] = `https://scoutedge.ai/${loc}`
  }
  languages['en'] = 'https://scoutedge.ai'

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: `https://scoutedge.ai/${locale}`,
      languages,
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      url: `https://scoutedge.ai/${locale}`,
      siteName: 'ScoutEdge',
      locale: config.hreflang,
      type: 'website',
    },
  }
}

export default async function LocalePage({ params }: PageProps) {
  const { locale } = await params
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) notFound()

  const loc = locale as Locale
  const t = TRANSLATIONS[loc]
  const config = LOCALE_CONFIGS[loc]
  const teams = getAllTeams()
  const topTeams = teams.filter((t) => t.fifaRanking <= 10).slice(0, 6)

  const isRTL = config.dir === 'rtl'

  return (
    <div dir={config.dir}>
      {/* Language Bar */}
      <div className="bg-surface-container-low border-b border-white/[0.06] py-2 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.flag}</span>
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
              {config.nativeName}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/" className="text-[10px] font-label text-primary uppercase tracking-widest hover:underline">EN</Link>
            {SUPPORTED_LOCALES.filter((l) => l !== loc).map((l) => (
              <Link
                key={l}
                href={`/${l}`}
                className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest hover:text-primary hover:underline"
              >
                {LOCALE_CONFIGS[l].code.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 pitch-lines opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-8 text-secondary">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" />
            {t.heroDateRange}
          </span>

          <h1 className="font-headline text-[clamp(3rem,10vw,9rem)] leading-[0.85] tracking-wide uppercase mb-6">
            <span className="block text-on-surface">{t.heroTitle1}</span>
            <span className="block gradient-text">{t.heroTitle2}</span>
            <span className="block text-on-surface text-[clamp(1.5rem,4vw,4rem)]">{t.heroTitle3}</span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12">
            {t.heroDescription}
          </p>

          <div className={`flex flex-wrap justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              href="/teams"
              className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all animate-neon-glow"
            >
              {t.heroCTA}
            </Link>
            <a
              href="#top-teams"
              className="border border-white/20 text-on-surface px-10 py-4 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              {t.heroSecondaryCTA}
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="page-container -mt-16 relative z-20 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t.statsTeams, value: '48', accent: '#a0d494' },
            { label: t.statsHostCities, value: '16', accent: '#bcf0ae' },
            { label: t.statsMatches, value: '104', accent: '#e9c400' },
            { label: t.statsPlayers, value: '1,200+', accent: '#ffb4aa' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] text-center overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <NeonAccentBar color={stat.accent} />
              <div className="font-headline text-4xl md:text-5xl tracking-wide" style={{ color: stat.accent }}>
                {stat.value}
              </div>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Contenders */}
      <section id="top-teams" className="page-container mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <SectionHeader className="mb-3">{t.topContendersTitle}</SectionHeader>
            <p className="text-on-surface-variant mt-2 ml-4">{t.topContendersSubtitle}</p>
          </div>
          <Link
            href="/teams"
            className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline hidden md:block"
          >
            {t.viewAllTeams}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topTeams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>

      {/* Analysis Hub */}
      <section className="page-container mb-16">
        <SectionHeader className="mb-8">{t.analysisTitle}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { title: t.featureTeams, desc: t.featureTeamsDesc, href: '/teams', icon: '\u{1F3C3}', accent: '#a0d494' },
            { title: t.featureMatches, desc: t.featureMatchesDesc, href: '/matches', icon: '\u{26BD}', accent: '#bcf0ae' },
            { title: t.featurePowerRankings, desc: t.featurePowerRankingsDesc, href: '/power-rankings', icon: '\u{1F3C6}', accent: '#e9c400' },
            { title: t.featureDailyBriefing, desc: t.featureDailyBriefingDesc, href: '/daily-briefing', icon: '\u{1F4F0}', accent: '#ffb4aa' },
            { title: t.featurePredictions, desc: t.featurePredictionsDesc, href: '/predictions', icon: '\u{1F3AF}', accent: '#ffd700' },
          ].map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="relative glass-panel p-6 rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <NeonAccentBar color={feature.accent} />
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-headline text-lg uppercase tracking-wide mb-2" style={{ color: feature.accent }}>
                {feature.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full py-24 px-6 mb-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/10 blur-[200px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl tracking-wide uppercase mb-6">
            {t.ctaTitle}
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-10">
            {t.ctaDescription}
          </p>
          <button className="bg-tertiary text-on-tertiary px-10 py-4 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            {t.ctaButton}
          </button>
        </div>
      </section>
    </div>
  )
}
