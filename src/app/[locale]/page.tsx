import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'
import MagazineHomePage from '@/components/home-magazine/MagazineHomePage'
import { getMagazineHomeData } from '@/lib/home-magazine-data'
import {
  buildOGMeta,
  canonicalForLocale,
  softwareApplicationJsonLd,
} from '@/lib/og-utils'
import { routing } from '@/i18n/routing'
import { LOCALE_CONFIGS } from '@/i18n/locales'
import '@/components/home-magazine/home-magazine.css'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })

  const languages: Record<string, string> = {
    'x-default': canonicalForLocale(routing.defaultLocale, '/'),
  }
  for (const loc of routing.locales) {
    languages[LOCALE_CONFIGS[loc].hreflang] = canonicalForLocale(loc, '/')
  }

  return {
    title: t('title'),
    description: t('description'),
    keywords:
      'World Cup 2026, World Cup predictions, World Cup intelligence, football analysis, team chemistry, player reports, World Cup 2026 schedule',
    alternates: {
      canonical: canonicalForLocale(locale, '/'),
      languages,
    },
    ...buildOGMeta({
      title: t('title'),
      description: t('description'),
      url: canonicalForLocale(locale, '/'),
      locale,
    }),
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const data = await getMagazineHomeData()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />
      {/* Magazine fonts (Latin). Non-Latin scripts get a per-locale fallback
          loaded below + a CSS-variable override so headlines don't render in
          a system fallback that lacks CJK/Arabic/Thai glyphs. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Big+Shoulders+Display:wght@600;700;800;900&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <LocaleScriptFonts locale={locale} />
      <MagazineHomePage
        contenders={data.contenders}
        totalTeams={data.totalTeams}
        nextFixture={data.nextFixture}
        stats={data.stats}
        tickerItems={data.tickerItems}
        leadStory={data.leadStory}
        quickStories={data.quickStories}
        groups={data.groups}
        selectedGroupIds={data.selectedGroupIds}
        weekDays={data.weekDays}
        todayFixtures={data.todayFixtures}
        fixturesByDay={data.fixturesByDay}
        todayIndex={data.todayIndex}
        countdown={data.countdown}
        countdownTargetIso={data.countdownTargetIso}
        nextKickoff={data.nextKickoff}
        compareTeams={data.compareTeams}
        showLeaderboard={data.showLeaderboard}
        leaderboardPodium={data.leaderboardPodium}
        leaderboardTotalUsers={data.leaderboardTotalUsers}
        newsletterSlot={<NewsletterSignup variant="banner" source="homepage" />}
      />
    </>
  )
}

/**
 * Per-locale font supplement for the magazine surface.
 *
 * DM Serif Display + Big Shoulders Display have no CJK / Arabic / Thai glyphs.
 * Without this, headlines in /zh, /ja, /ko, /ar, /fa, /th render in whatever
 * the OS happens to substitute — usually a sans-serif fallback that breaks
 * the magazine visual. This component:
 *   1. Loads the appropriate Noto Serif variant from Google Fonts
 *   2. Overrides --f-display and --f-body inside .kick-oracle-root so those
 *      fonts get priority before the Latin display falls back.
 */
function LocaleScriptFonts({ locale }: { locale: string }) {
  const map: Record<
    string,
    { googleFamily: string; display: string; body: string }
  > = {
    zh: {
      googleFamily: 'Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;500;700',
      display: '"Noto Serif SC"',
      body: '"Noto Sans SC"',
    },
    ja: {
      googleFamily: 'Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;500;700',
      display: '"Noto Serif JP"',
      body: '"Noto Sans JP"',
    },
    ko: {
      googleFamily: 'Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@400;500;700',
      display: '"Noto Serif KR"',
      body: '"Noto Sans KR"',
    },
    ar: {
      googleFamily: 'Noto+Naskh+Arabic:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;700',
      display: '"Noto Naskh Arabic"',
      body: '"Noto Sans Arabic"',
    },
    fa: {
      googleFamily: 'Noto+Naskh+Arabic:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;700',
      display: '"Noto Naskh Arabic"',
      body: '"Noto Sans Arabic"',
    },
    th: {
      googleFamily: 'Noto+Serif+Thai:wght@400;700&family=Noto+Sans+Thai:wght@400;500;700',
      display: '"Noto Serif Thai"',
      body: '"Noto Sans Thai"',
    },
  }
  const entry = map[locale]
  if (!entry) return null

  // Pre-pend the script-aware font so it wins for glyphs present, then the
  // Latin magazine font takes over for ASCII characters.
  const css = `.kick-oracle-root {
    --f-display: ${entry.display}, "DM Serif Display", Georgia, serif;
    --f-body: ${entry.body}, "Manrope", -apple-system, sans-serif;
  }`

  return (
    <>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${entry.googleFamily}&display=swap`}
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  )
}
