import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getLingoPlayerBySlug,
  getLingoPlayersByCountry,
  getLingoCountryBySlug,
} from '@/data/lingo-data'
import { PhoneticDisplay } from '@/components/lingo/PhoneticDisplay'
import { SyllableBreakdown } from '@/components/lingo/SyllableBreakdown'
import { DifficultyBadge } from '@/components/lingo/DifficultyBadge'
import { PlayerCard } from '@/components/lingo/PlayerCard'

interface PlayerPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { slug } = await params
  const player = getLingoPlayerBySlug(slug)
  if (!player) return {}

  return {
    title: `How to Pronounce ${player.name} — World Cup 2026`,
    description: `How to say ${player.name}: ${player.phonetic} — ${player.ipa}. From ${player.country.replace(/-/g, ' ')}. Common mistakes, language origin, and fun facts.`,
    openGraph: {
      title: `How to Pronounce ${player.name} | KickOracle Lingo`,
      description: `${player.phonetic}. Learn the correct pronunciation of ${player.name}.`,
    },
  }
}

export default async function LingoPlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params
  const player = getLingoPlayerBySlug(slug)
  if (!player) notFound()

  const country = getLingoCountryBySlug(player.country)
  const otherPlayers = getLingoPlayersByCountry(player.country)
    .filter((p) => p.id !== player.id)
    .slice(0, 4)

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-8 text-sm text-lingo-text-muted" aria-label="Breadcrumb">
        <Link href="/lingo" className="hover:text-lingo-accent">
          Lingo
        </Link>
        <span className="mx-2">/</span>
        <Link href="/lingo/players" className="hover:text-lingo-accent">
          Players
        </Link>
        <span className="mx-2">/</span>
        <span className="text-lingo-text">{player.name}</span>
      </nav>

      <header className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-lg bg-lingo-accent/10 px-3 py-1 text-xs font-medium text-lingo-accent">
            {player.position}
          </span>
          <span className="text-sm text-lingo-text-muted">{player.club}</span>
          {country && (
            <Link
              href={`/lingo/countries/${country.id}`}
              className="flex items-center gap-1 text-sm text-lingo-text-muted hover:text-lingo-accent"
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </Link>
          )}
        </div>
        <h1 className="text-3xl font-bold text-lingo-text sm:text-4xl">
          How to Pronounce {player.name}
        </h1>
        <div className="mt-4">
          <PhoneticDisplay phonetic={player.phonetic} ipa={player.ipa} size="lg" />
        </div>
        <div className="mt-3">
          <DifficultyBadge rating={player.difficulty} />
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-lingo-text">
          Step-by-Step Phonetic Breakdown
        </h2>
        <SyllableBreakdown syllables={player.syllables} stressIndex={player.stressIndex} />
        <p className="mt-4 text-sm leading-relaxed text-lingo-text-muted">{player.audioHint}</p>
      </section>

      {player.commonMistakes.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-lingo-text">
            Common Pronunciation Mistakes
          </h2>
          <div className="flex flex-wrap gap-2">
            {player.commonMistakes.map((mistake) => (
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
        <h2 className="mb-2 text-lg font-semibold text-lingo-text">Name Origin &amp; Meaning</h2>
        <p className="text-sm leading-relaxed text-lingo-text-muted">{player.funFact}</p>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-lingo-border/50 bg-lingo-surface p-5">
          <p className="text-sm text-lingo-text-muted">
            Got the pronunciation down? Check squad status and match predictions for{' '}
            {country?.name ?? player.country.replace(/-/g, ' ')}.{' '}
            <Link
              href={country ? `/teams/${country.id}` : '/teams'}
              className="font-semibold text-lingo-accent hover:underline"
            >
              View team analysis →
            </Link>
          </p>
        </div>
      </section>

      {otherPlayers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-lingo-text">
            Other Players from{' '}
            {country ? country.name : player.country.replace(/-/g, ' ')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherPlayers.map((p) => (
              <PlayerCard key={p.id} player={p} showCountry={false} />
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
              {
                '@type': 'ListItem',
                position: 4,
                name: player.name,
                item: `https://kickoracle.com/lingo/players/${player.id}/`,
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
                name: `How do you pronounce ${player.name}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `${player.name} is pronounced ${player.phonetic} (${player.ipa}). ${player.audioHint}`,
                },
              },
            ],
          }),
        }}
      />
    </article>
  )
}
