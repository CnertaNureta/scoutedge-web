import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeamBySlug, getPlayersByTeam, getPlayerBySlug } from '@/lib/data-service'
import { getPlayerActionImage } from '@/lib/unsplash'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import { buildOGMeta } from '@/lib/og-utils'
import PlayerHero from '@/components/player/PlayerHero'
import PlayerStats from '@/components/player/PlayerStats'
import PlayerIntel from '@/components/player/PlayerIntel'
import PlayerArticle from '@/components/player/PlayerArticle'
import SectionHeader from '@/components/ui/SectionHeader'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

interface PageProps {
  params: Promise<{ slug: string; playerSlug: string; locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, playerSlug, locale } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) return { title: 'Player Not Found' }

  const url = `https://kickoracle.com/teams/${slug}/players/${playerSlug}`

  return {
    title: `${player.name}: ${team.name} World Cup 2026 Stats, Rating & Scouting Report`,
    description: `${player.name} World Cup 2026 scouting report. ${player.position} for ${team.name}, plays for ${player.club}. ${player.caps} caps, ${player.goals} goals, rating ${player.rating}/10. AI-powered fitness and performance analysis.`,
    keywords: `${player.name} World Cup 2026, ${player.name} stats, ${player.name} ${team.name}, ${player.name} profile`,
    alternates: { canonical: url },
    ...buildOGMeta({
      title: `${player.name} — World Cup 2026 | KickOracle`,
      description: `AI-powered intelligence report for ${player.name}. ${team.name} · ${player.position} · ${player.club}.`,
      url,
      locale,
      type: 'profile',
      image: getPlayerActionImage(player.name),
    }),
  }
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug, playerSlug } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) notFound()

  const teammates = getPlayersByTeam(slug).filter((p) => p.slug !== playerSlug).slice(0, 5)
  const derivedStats = computeDerivedStats(player)

  const playerUrl = `https://kickoracle.com/teams/${slug}/players/${playerSlug}`
  const teamUrl = `https://kickoracle.com/teams/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    url: playerUrl,
    image: getPlayerActionImage(player.name),
    jobTitle: `Professional Football Player (${player.position})`,
    nationality: { '@type': 'Country', name: team.name },
    affiliation: {
      '@type': 'SportsTeam',
      name: team.name,
      url: teamUrl,
    },
    ...(player.club && {
      worksFor: { '@type': 'SportsTeam', name: player.club },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PlayerHero player={player} team={team} derivedStats={derivedStats} />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Teams', href: '/teams' },
          { name: team.name, href: `/teams/${slug}` },
          { name: player.name, href: `/teams/${slug}/players/${playerSlug}` },
        ]}
      />
      <PlayerStats player={player} derivedStats={derivedStats} />
      <PlayerIntel player={player} />
      <PlayerArticle player={player} team={team} />

      <section className="page-container mb-20">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader>More {team.name} Players</SectionHeader>
          <Link
            href={`/teams/${slug}`}
            className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline"
          >
            Back to {team.name}
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {teammates.map((p) => (
            <Link
              key={p.slug}
              href={`/teams/${slug}/players/${p.slug}`}
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/30 px-5 py-2.5 rounded-full font-body text-sm transition-all hover:text-primary"
            >
              {p.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
