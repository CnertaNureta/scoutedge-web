import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { lingoPlayers, lingoCountries } from '@/data/lingo-data'
import { PlayerCard } from '@/components/lingo/PlayerCard'
import { buildAlternates } from '@/lib/seo/build-alternates'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'lingoPage' })
  return {
    title: t('playerGuide'),
    description: t('playerGuideDesc', { count: lingoPlayers.length }),
    alternates: buildAlternates(locale, '/lingo/players'),
  }
}

export default async function LingoPlayersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('lingoPage')
  const playersByCountry = new Map<string, typeof lingoPlayers>()
  for (const player of lingoPlayers) {
    const existing = playersByCountry.get(player.country) ?? []
    existing.push(player)
    playersByCountry.set(player.country, existing)
  }

  const sortedCountries = [...playersByCountry.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          {t('playerGuide')}
        </h1>
        <p className="mt-2 text-base text-lingo-text-muted">
          {t('playerGuideDesc', { count: lingoPlayers.length })}
        </p>
      </div>

      {sortedCountries.map(([countryId, countryPlayers]) => {
        const country = lingoCountries.find((c) => c.id === countryId)
        return (
          <section key={countryId} className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-lingo-text">
              {country && (
                <span className="text-xl" aria-hidden="true">
                  {country.flag}
                </span>
              )}
              <span className="capitalize">{countryId.replace(/-/g, ' ')}</span>
              <span className="text-sm font-normal text-lingo-text-muted">
                ({countryPlayers.length})
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {countryPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} showCountry={false} />
              ))}
            </div>
          </section>
        )
      })}

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kickoracle.com/' },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Lingo',
                item: 'https://kickoracle.com/lingo/',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Players',
                item: 'https://kickoracle.com/lingo/players/',
              },
            ],
          }),
        }}
      />
    </div>
  )
}
