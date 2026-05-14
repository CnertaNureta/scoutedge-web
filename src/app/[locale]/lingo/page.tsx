import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { lingoCountries, lingoPlayers, lingoTermsData } from '@/data/lingo-data'
import { CountryCard } from '@/components/lingo/CountryCard'
import { PlayerCard } from '@/components/lingo/PlayerCard'
import { LingoSearchBar } from '@/components/lingo/LingoSearchBar'
import { OG_LOCALES, breadcrumbJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'lingoPage' })
  return {
    title: t('heading'),
    description: t('description', { countryCount: lingoCountries.length, playerCount: lingoPlayers.length }),
    alternates: buildAlternates(locale, '/lingo'),
    openGraph: {
      title: 'KickOracle Lingo — World Cup 2026 Pronunciation Guide',
      description: `How to say every country, player & football term. ${lingoCountries.length} teams, ${lingoPlayers.length}+ players.`,
      locale: OG_LOCALES[locale] ?? 'en_US',
    },
  }
}

const FEATURED_COUNTRIES = [
  'curacao',
  'turkiye',
  'bosnia-herzegovina',
  'cote-divoire',
  'qatar',
  'croatia',
]

const FEATURED_PLAYERS = [
  'mbappe-kylian',
  'szczensny-wojciech',
  'haaland-erling',
  'xhaka-granit',
  'tchouameni-aurelien',
  'vinicius-jr',
]

export default async function LingoPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('lingoPage')

  const featuredCountries = FEATURED_COUNTRIES.map((id) =>
    lingoCountries.find((c) => c.id === id),
  ).filter(Boolean)

  const featuredPlayers = FEATURED_PLAYERS.map((id) =>
    lingoPlayers.find((p) => p.id === id),
  ).filter(Boolean)

  return (
    <>
      <section className="relative overflow-hidden border-b border-lingo-border/30 bg-gradient-to-b from-lingo-accent/5 to-lingo-bg px-6 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(72%_0.18_160_/_0.06),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-lingo-accent">
            {t('header')}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-lingo-text sm:text-5xl lg:text-6xl">
            {t('heading')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-lingo-text-muted sm:text-lg">
            {t('description', { countryCount: lingoCountries.length, playerCount: lingoPlayers.length })}
          </p>
          <div className="mt-8 flex justify-center">
            <LingoSearchBar countries={lingoCountries} players={lingoPlayers} />
          </div>
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <Link href="/lingo/countries" className="text-lingo-accent hover:underline">
              {t('allCountries', { count: lingoCountries.length })} →
            </Link>
            <Link href="/lingo/players" className="text-lingo-accent hover:underline">
              {t('allPlayers', { count: lingoPlayers.length })} →
            </Link>
            <Link href="/lingo/terms" className="text-lingo-accent hover:underline">
              {t('footballTerms')} →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-lingo-text">{t('hardestCountries')}</h2>
            <p className="mt-1 text-sm text-lingo-text-muted">
              {t('hardestCountriesDesc')}
            </p>
          </div>
          <Link href="/lingo/countries" className="text-sm font-medium text-lingo-accent hover:underline">
            {t('allCountries', { count: lingoCountries.length })} →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCountries.map(
            (country) => country && <CountryCard key={country.id} country={country} />,
          )}
        </div>
      </section>

      <section className="border-t border-lingo-border/30 bg-lingo-surface/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-lingo-text">{t('trickiestPlayers')}</h2>
              <p className="mt-1 text-sm text-lingo-text-muted">
                {t('trickiestPlayersDesc')}
              </p>
            </div>
            <Link href="/lingo/players" className="text-sm font-medium text-lingo-accent hover:underline">
              {t('allPlayers', { count: lingoPlayers.length })} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPlayers.map(
              (player) => player && <PlayerCard key={player.id} player={player} />,
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-lingo-text">{t('chantsHeading')}</h2>
          <p className="mt-1 text-sm text-lingo-text-muted">{t('chantsDesc')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lingoTermsData.chants.slice(0, 6).map((chant) => (
            <div
              key={chant.team}
              className="rounded-2xl border border-lingo-border/50 bg-lingo-surface p-5"
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-lingo-text-muted">
                {chant.team}
              </p>
              <p className="text-lg font-semibold text-lingo-text">{chant.chant}</p>
              <p className="mt-1 font-mono text-sm text-lingo-phonetic">{chant.phonetic}</p>
              <p className="mt-2 text-xs text-lingo-text-muted">{chant.meaning}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/lingo/terms" className="text-sm font-medium text-lingo-accent hover:underline">
            {t('seeAllTerms')} →
          </Link>
        </div>
      </section>

      <section className="border-t border-lingo-border/30 bg-gradient-to-b from-lingo-accent/5 to-lingo-bg px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-lingo-text">{t('wantPredictions')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-lingo-text-muted">
            {t('wantPredictionsDesc')}
          </p>
          <Link
            href="/predictions"
            className="mt-6 inline-flex items-center rounded-xl bg-lingo-accent px-6 py-3 text-sm font-semibold text-lingo-bg transition-opacity hover:opacity-90"
          >
            {t('explorePredictions')} →
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'KickOracle Lingo',
            url: 'https://kickoracle.com/lingo',
            description:
              'Pronunciation guide for FIFA World Cup 2026 countries, players, and football terms.',
          }),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: `https://kickoracle.com/${locale}` },
              { name: 'Lingo', url: `https://kickoracle.com/${locale}/lingo` },
            ]),
          ),
        }}
      />
    </>
  )
}
