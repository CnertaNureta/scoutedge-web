import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { lingoCountries, getAllLingoRegions, getLingoCountriesByRegion } from '@/data/lingo-data'
import { CountryCard } from '@/components/lingo/CountryCard'
import { buildAlternates } from '@/lib/seo/build-alternates'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'lingoPage' })
  return {
    title: t('countriesHeading', { count: lingoCountries.length }),
    description: t('countriesDesc'),
    alternates: buildAlternates(locale, '/lingo/countries'),
  }
}

export default async function LingoCountriesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('lingoPage')
  const regions = getAllLingoRegions()

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          {t('countriesHeading', { count: lingoCountries.length })}
        </h1>
        <p className="mt-2 text-base text-lingo-text-muted">
          {t('countriesDesc')}
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
                {t('teams', { count: regionCountries.length })}
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
