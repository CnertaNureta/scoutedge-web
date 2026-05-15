import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { lingoTermsData } from '@/data/lingo-data'
import { canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'lingoPage' })
  return {
    title: t('termsHeading'),
    description: t('termsDesc'),
    alternates: buildAlternates(locale, '/lingo/terms'),
  }
}

const LANGUAGE_LABELS: Record<string, string> = {
  spanish: 'Spanish',
  portuguese: 'Portuguese',
  french: 'French',
  german: 'German',
  italian: 'Italian',
  arabic: 'Arabic',
  japanese: 'Japanese',
  chinese: 'Chinese',
  russian: 'Russian',
  dutch: 'Dutch',
  turkish: 'Turkish',
  korean: 'Korean',
  portuguese_br: 'Brazilian Portuguese',
}

export default async function LingoTermsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('lingoPage')

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          {t('termsHeading')}
        </h1>
        <p className="mt-2 text-base text-lingo-text-muted">
          {t('termsDesc')}
        </p>
      </div>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-lingo-text">{t('essentialTerms')}</h2>
        <div className="space-y-8">
          {lingoTermsData.terms.map((term) => {
            const translations = Object.entries(term.translations).filter(
              ([key]) => key !== 'note',
            )
            return (
              <div
                key={term.id}
                className="overflow-hidden rounded-2xl border border-lingo-border/50 bg-lingo-surface"
              >
                <div className="border-b border-lingo-border/30 bg-lingo-bg/50 px-6 py-4">
                  <h3 className="text-lg font-semibold text-lingo-text">{term.english}</h3>
                  <p className="mt-0.5 text-sm text-lingo-text-muted">{term.definition}</p>
                </div>
                <div className="grid gap-px bg-lingo-border/20 sm:grid-cols-2 lg:grid-cols-3">
                  {translations.map(([lang, translation]) => {
                    if (typeof translation !== 'object' || !translation.word) return null
                    return (
                      <div key={lang} className="bg-lingo-surface px-5 py-3.5">
                        <p className="text-xs font-medium uppercase tracking-wider text-lingo-text-muted">
                          {LANGUAGE_LABELS[lang] ?? lang}
                        </p>
                        <p className="mt-1 text-base font-semibold text-lingo-text">
                          {translation.word}
                        </p>
                        <p className="font-mono text-sm text-lingo-phonetic">
                          {translation.phonetic}
                        </p>
                        {translation.note && (
                          <p className="mt-1 text-xs text-lingo-text-muted">{translation.note}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-lingo-text">{t('chantsFromWorld')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lingoTermsData.chants.map((chant) => (
            <div
              key={chant.team}
              className="rounded-2xl border border-lingo-border/50 bg-lingo-surface p-5"
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-lingo-accent">
                {chant.team}
              </p>
              <p className="text-xl font-bold text-lingo-text">{chant.chant}</p>
              <p className="mt-1 font-mono text-sm text-lingo-phonetic">{chant.phonetic}</p>
              <p className="mt-2 text-sm text-lingo-text-muted">{chant.meaning}</p>
              <p className="mt-2 text-xs text-lingo-text-muted">{chant.context}</p>
            </div>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalForLocale(locale, '/') },
                  { '@type': 'ListItem', position: 2, name: 'Lingo', item: canonicalForLocale(locale, '/lingo') },
                  { '@type': 'ListItem', position: 3, name: 'Football Terms', item: canonicalForLocale(locale, '/lingo/terms') },
                ],
              },
              {
                '@type': 'DefinedTermSet',
                name: 'KickOracle Football Lingo',
                url: canonicalForLocale(locale, '/lingo/terms'),
                description: 'Football terminology defined and translated for World Cup 2026 fans across 19 languages.',
                hasDefinedTerm: lingoTermsData.terms.map((term) => ({
                  '@type': 'DefinedTerm',
                  name: term.english,
                  description: term.definition,
                  termCode: term.id,
                })),
              },
            ],
          }),
        }}
      />
    </div>
  )
}
