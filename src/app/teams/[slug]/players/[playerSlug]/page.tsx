import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllTeams, getTeamBySlug, getPlayersByTeam, getPlayerBySlug } from '@/lib/data-service'
import { getPlayerActionImage } from '@/lib/unsplash'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import PlayerHero from '@/components/player/PlayerHero'
import PlayerStats from '@/components/player/PlayerStats'
import PlayerIntel from '@/components/player/PlayerIntel'
import SeoArticle from '@/components/ui/SeoArticle'
import SectionHeader from '@/components/ui/SectionHeader'

interface PageProps {
  params: Promise<{ slug: string; playerSlug: string }>
}

export async function generateStaticParams() {
  const teams = getAllTeams()
  const params: { slug: string; playerSlug: string }[] = []
  for (const team of teams) {
    const players = getPlayersByTeam(team.slug)
    for (const player of players) {
      params.push({ slug: team.slug, playerSlug: player.slug })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, playerSlug } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) return { title: 'Player Not Found' }

  return {
    title: `${player.name} — ${team.name} World Cup 2026 Stats & Profile`,
    description: `${player.name} World Cup 2026 profile. ${player.position} for ${team.name}, plays for ${player.club}. ${player.caps} international caps, ${player.goals} goals. AI-powered fitness and performance intelligence.`,
    keywords: `${player.name} World Cup 2026, ${player.name} stats, ${player.name} ${team.name}, ${player.name} profile`,
    openGraph: {
      title: `${player.name} — World Cup 2026 | ScoutEdge`,
      description: `AI-powered intelligence report for ${player.name}. ${team.name} · ${player.position} · ${player.club}.`,
      images: [{ url: getPlayerActionImage(player.name), width: 1200, height: 630 }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${player.name} — World Cup 2026 | ScoutEdge`,
      description: `${player.position} · ${team.name} · Rating: ${player.rating}/10`,
    },
    alternates: { canonical: `https://scoutedge.ai/teams/${slug}/players/${playerSlug}` },
  }
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug, playerSlug } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) notFound()

  const teammates = getPlayersByTeam(slug).filter((p) => p.slug !== playerSlug).slice(0, 5)
  const derivedStats = computeDerivedStats(player)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    jobTitle: `Professional Football Player (${player.position})`,
    memberOf: { '@type': 'SportsTeam', name: team.name },
    nationality: { '@type': 'Country', name: team.name },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PlayerHero player={player} team={team} derivedStats={derivedStats} />
      <PlayerStats player={player} derivedStats={derivedStats} />
      <PlayerIntel player={player} />
      <SeoArticle html={player.seoArticle} />

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
