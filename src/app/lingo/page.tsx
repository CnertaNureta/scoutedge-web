import type { Metadata } from 'next'
import Link from 'next/link'
import { lingoCountries, lingoPlayers, lingoTermsData } from '@/data/lingo-data'
import { CountryCard } from '@/components/lingo/CountryCard'
import { PlayerCard } from '@/components/lingo/PlayerCard'
import { LingoSearchBar } from '@/components/lingo/LingoSearchBar'

export const metadata: Metadata = {
  title: 'Lingo — World Cup Pronunciation Guide',
  description: `IPA transcriptions, phonetic guides, and cultural context for ${lingoCountries.length} teams and ${lingoPlayers.length}+ star players. Sound like an expert before kickoff.`,
  openGraph: {
    title: 'KickOracle Lingo — World Cup 2026 Pronunciation Guide',
    description: `How to say every country, player & football term. ${lingoCountries.length} teams, ${lingoPlayers.length}+ players.`,
  },
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

export default function LingoPage() {
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
            FIFA World Cup 2026 · KickOracle Lingo
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-lingo-text sm:text-5xl lg:text-6xl">
            How to Say Every Country, Player &amp; Term
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-lingo-text-muted sm:text-lg">
            IPA transcriptions, phonetic guides, and cultural context for{' '}
            {lingoCountries.length} teams and {lingoPlayers.length}+ star players. Sound
            like an expert before kickoff.
          </p>
          <div className="mt-8 flex justify-center">
            <LingoSearchBar countries={lingoCountries} players={lingoPlayers} />
          </div>
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <Link href="/lingo/countries" className="text-lingo-accent hover:underline">
              All {lingoCountries.length} countries →
            </Link>
            <Link href="/lingo/players" className="text-lingo-accent hover:underline">
              All {lingoPlayers.length} players →
            </Link>
            <Link href="/lingo/terms" className="text-lingo-accent hover:underline">
              Football terms →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-lingo-text">Hardest Country Names</h2>
            <p className="mt-1 text-sm text-lingo-text-muted">
              The ones commentators get wrong the most
            </p>
          </div>
          <Link href="/lingo/countries" className="text-sm font-medium text-lingo-accent hover:underline">
            All {lingoCountries.length} countries →
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
              <h2 className="text-2xl font-bold text-lingo-text">Trickiest Player Names</h2>
              <p className="mt-1 text-sm text-lingo-text-muted">
                Mbappé, Szczęsny, Tchouaméni — get them right
              </p>
            </div>
            <Link href="/lingo/players" className="text-sm font-medium text-lingo-accent hover:underline">
              All {lingoPlayers.length} players →
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
          <h2 className="text-2xl font-bold text-lingo-text">Football Chants from Around the World</h2>
          <p className="mt-1 text-sm text-lingo-text-muted">Learn how fans cheer in every language</p>
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
            See all football terms &amp; chants →
          </Link>
        </div>
      </section>

      <section className="border-t border-lingo-border/30 bg-gradient-to-b from-lingo-accent/5 to-lingo-bg px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-lingo-text">Want AI-Powered Predictions?</h2>
          <p className="mt-3 text-sm leading-relaxed text-lingo-text-muted">
            KickOracle uses AI to analyze team chemistry, player fitness, and social signals. Get
            win probability predictions for every match.
          </p>
          <Link
            href="/predictions"
            className="mt-6 inline-flex items-center rounded-xl bg-lingo-accent px-6 py-3 text-sm font-semibold text-lingo-bg transition-opacity hover:opacity-90"
          >
            Explore Predictions →
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
    </>
  )
}
