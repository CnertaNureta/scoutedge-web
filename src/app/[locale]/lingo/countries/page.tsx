import type { Metadata } from 'next'
import { lingoCountries, getAllLingoRegions, getLingoCountriesByRegion } from '@/data/lingo-data'
import { CountryCard } from '@/components/lingo/CountryCard'

export const metadata: Metadata = {
  title: 'All World Cup 2026 Countries — Pronunciation Guide',
  description: `How to pronounce all ${lingoCountries.length} World Cup 2026 country names. IPA transcriptions, phonetic breakdowns, difficulty ratings, and fun facts.`,
}

export default function LingoCountriesPage() {
  const regions = getAllLingoRegions()

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          All {lingoCountries.length} World Cup Countries
        </h1>
        <p className="mt-2 text-base text-lingo-text-muted">
          Every team competing at the 2026 FIFA World Cup, with pronunciation guides sorted by
          confederation.
        </p>
      </div>

      {regions.map((region) => {
        const regionCountries = getLingoCountriesByRegion(region)
        return (
          <section key={region} className="mb-12">
            <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-lingo-text">
              <span className="rounded-lg bg-lingo-accent/10 px-3 py-1 text-sm font-bold text-lingo-accent">
                {region}
              </span>
              <span className="text-sm font-normal text-lingo-text-muted">
                {regionCountries.length} teams
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regionCountries.map((country) => (
                <CountryCard key={country.id} country={country} />
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
                name: 'Countries',
                item: 'https://kickoracle.com/lingo/countries/',
              },
            ],
          }),
        }}
      />
    </div>
  )
}
