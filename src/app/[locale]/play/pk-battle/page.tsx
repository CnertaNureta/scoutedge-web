import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import PKBattleApp from '@/components/pk-battle/PKBattleApp'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const alternates = buildAlternates(locale, '/play/pk-battle')

  return {
    title: 'PK Battle — Player vs Player Duel | World Cup 2026',
    description:
      'Pit any two World Cup 2026 players against each other. AI-powered comparison weighs rating, experience, fitness, morale, and positional matchup.',
    keywords:
      'World Cup 2026 player comparison, player vs player, PK battle, football duel, World Cup 2026 players',
    alternates,
    ...buildOGMeta({
      title: 'PK Battle — Player vs Player Duel | World Cup 2026',
      description:
        'Pit any two World Cup 2026 players against each other in an AI-powered head-to-head duel.',
      url: alternates.canonical,
      locale,
    }),
  }
}

export default async function PKBattlePage({ params }: Props) {
  const { locale } = await params
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Fan Zone', url: canonicalForLocale(locale, '/play') },
    { name: 'PK Battle', url: canonicalForLocale(locale, '/play/pk-battle') },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
          <Link
            href="/play"
            className="hover:text-on-surface transition-colors"
          >
            Fan Zone
          </Link>
          <span>/</span>
          <span>PK Battle</span>
        </div>

        <PKBattleApp />
      </main>
    </>
  )
}
