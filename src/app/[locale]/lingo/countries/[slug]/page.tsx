import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import {
  getLingoCountryBySlug,
  getLingoPlayersByCountry,
  getLingoCountriesByRegion,
} from '@/data/lingo-data'
import { PhoneticDisplay } from '@/components/lingo/PhoneticDisplay'
import { SyllableBreakdown } from '@/components/lingo/SyllableBreakdown'
import { DifficultyBadge } from '@/components/lingo/DifficultyBadge'
import { PlayerCard } from '@/components/lingo/PlayerCard'
import { OG_LOCALES, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

interface CountryPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const country = getLingoCountryBySlug(slug)
  if (!country) return {}

  return {
    title: `How to Pronounce ${country.name} — World Cup 2026 Pronunciation Guide`,
    description: `How to say ${country.name} correctly: ${country.phonetic}. IPA: ${country.ipa}. Includes local name, fun facts, and common mistakes.`,
    alternates: buildAlternates(locale, `/lingo/countries/${slug}`),
    openGraph: {
      title: `How to Pronounce ${country.name} | KickOracle Lingo`,
      description: `${country.phonetic}. Learn the correct pronunciation with IPA, phonetics, and fun facts.`,
      locale: OG_LOCALES[locale] ?? 'en_US',
    },
  }
}

export default async function LingoCountryPage({ params }: CountryPageProps) {
  const { slug, locale } = await params
  const country = getLingoCountryBySlug(slug)
  if (!country) notFound()

  const countryPlayers = getLingoPlayersByCountry(country.id)
  const regionCountries = getLingoCountriesByRegion(country.region)
    .filter((c) => c.id !== country.id)
    .slice(0, 3)

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-8 text-sm text-lingo-text-muted" aria-label="Breadcrumb">
        <Link href="/lingo" className="hover:text-lingo-accent">
          Lingo
        </Link>
        <span className="mx-2">/</span>
        <Link href="/lingo/countries" className="hover:text-lingo-accent">
          Countries
        </Link>
        <span className="mx-2">/</span>
        <span className="text-lingo-text">{country.name}</span>
      </nav>

      <header className="mb-10">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-5xl" aria-hidden="true">
            {country.flag}
          </span>
          <DifficultyBadge rating={country.difficultyRating} />
        </div>
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          How to Pronounce {country.name}
        </h1>
        <div className="mt-4">
          <PhoneticDisplay phonetic={country.phonetic} ipa={country.ipa} size="lg" />
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-lingo-text">Syllable Breakdown</h2>
        <SyllableBreakdown syllables={country.syllables} stressIndex={country.stressIndex} />
        <p className="mt-4 text-sm leading-relaxed text-lingo-text-muted">{country.audioHint}</p>
      </section>

      {country.localName !== country.name && (
        <section className="mb-10 rounded-2xl border border-lingo-border/50 bg-lingo-surface p-6">
          <h2 className="mb-2 text-lg font-semibold text-lingo-text">How Locals Say It</h2>
          <p className="text-base text-lingo-phonetic">{country.localName}</p>
          {country.localPronunciation && (
            <p className="mt-1 font-mono text-sm text-lingo-ipa">{country.localPronunciation}</p>
          )}
        </section>
      )}

      {country.commonMistakes.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-lingo-text">Common Mistakes</h2>
          <div className="flex flex-wrap gap-2">
            {country.commonMistakes.map((mistake) => (
              <span
                key={mistake}
                className="inline-flex items-center gap-1.5 rounded-lg bg-lingo-difficulty-hard/10 px-3 py-1.5 text-sm text-lingo-difficulty-hard"
              >
                <span aria-hidden="true">✗</span>
                <span className="line-through">{mistake}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10 rounded-2xl border border-lingo-accent/20 bg-lingo-accent/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-lingo-text">Fun Fact About the Name</h2>
        <p className="text-sm leading-relaxed text-lingo-text-muted">{country.funFact}</p>
      </section>

      <section className="mb-10 rounded-2xl border border-lingo-border/50 bg-lingo-surface p-6">
        <h2 className="mb-2 text-lg font-semibold text-lingo-text">
          {country.name} at World Cup 2026
        </h2>
        <p className="mb-4 text-sm text-lingo-text-muted">
          {country.name} competes in the {country.region} confederation.
        </p>
        <Link
          href={`/teams/${country.id}`}
          className="inline-flex items-center rounded-xl bg-lingo-accent/10 px-4 py-2 text-sm font-medium text-lingo-accent transition-colors hover:bg-lingo-accent/20"
        >
          View {country.name} squad analysis →
        </Link>
      </section>

      {countryPlayers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-lingo-text">
            Players from {country.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {countryPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} showCountry={false} />
            ))}
          </div>
        </section>
      )}

      {regionCountries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-lingo-text">
            Other {country.region} Teams
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {regionCountries.map((c) => (
              <Link
                key={c.id}
                href={`/lingo/countries/${c.id}`}
                className="rounded-xl border border-lingo-border/50 bg-lingo-surface p-4 transition-colors hover:border-lingo-accent/30"
              >
                <span className="text-xl">{c.flag}</span>
                <p className="mt-1 text-sm font-medium text-lingo-text">{c.name}</p>
                <p className="font-mono text-xs text-lingo-phonetic">{c.phonetic}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalForLocale(locale, '/') },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Lingo',
                item: canonicalForLocale(locale, '/lingo'),
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Countries',
                item: canonicalForLocale(locale, '/lingo/countries'),
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: country.name,
                item: canonicalForLocale(locale, `/lingo/countries/${country.id}`),
              },
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: `How do you pronounce ${country.name}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `${country.name} is pronounced ${country.phonetic} (${country.ipa}). ${country.audioHint}`,
                },
              },
              ...(country.localName !== country.name
                ? [
                    {
                      '@type': 'Question',
                      name: `What is the local name for ${country.name}?`,
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: `In the local language, ${country.name} is called ${country.localName}.${country.localPronunciation ? ` Pronounced: ${country.localPronunciation}` : ''}`,
                      },
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
    </article>
  )
}
