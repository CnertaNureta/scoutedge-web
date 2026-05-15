import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTeamBySlug, getPlayersByTeam, getPlayerBySlug, getAllPlayers, getAllTeams, getFixturesByTeam } from '@/lib/data-service'
import { HOST_CITIES } from '@/data/cities-data'
import { buildTeamEntities, buildCityEntities, type LinkEntity } from '@/lib/auto-link'
import { getPlayerActionImage } from '@/lib/unsplash'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import { buildOGMeta, breadcrumbJsonLd, jsonLdGraph, canonicalForLocale } from '@/lib/og-utils'
import { playerDescriptionEn } from '@/data/seo-meta'
import PlayerHero from '@/components/player/PlayerHero'
import PlayerStats from '@/components/player/PlayerStats'
import PlayerIntel from '@/components/player/PlayerIntel'
import PlayerScoutGrade from '@/components/player/PlayerScoutGrade'
import StatTwin from '@/components/player/StatTwin'
import SelectionProbabilityCard from '@/components/player/SelectionProbabilityCard'
import MatchProjectionTable from '@/components/player/MatchProjectionTable'
import SocialBuzzCard from '@/components/player/SocialBuzzCard'
import SignalLedger from '@/components/player/SignalLedger'
import WorkloadWatch from '@/components/player/WorkloadWatch'
import RoleHeatmap from '@/components/player/RoleHeatmap'
import CareerArc from '@/components/player/CareerArc'
import DifferentiatorCard from '@/components/player/DifferentiatorCard'
import PlayerArticle from '@/components/player/PlayerArticle'
import { getPlayerIntelBySlug } from '@/lib/player-intel-service'
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

  const url = `https://kickoracle.com/teams/${slug}/players/${player.slug}`
  const description = playerDescriptionEn({
    name: player.name,
    position: player.position,
    team: team.name,
    club: player.club,
    age: player.age,
    caps: player.caps,
    goals: player.goals,
    rating: player.rating,
    slug: player.slug,
  })

  return {
    title: `${player.name}: ${team.name} World Cup 2026 Stats, Rating & Scouting Report`,
    description,
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
  const { locale, slug, playerSlug } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) notFound()

  const teammates = getPlayersByTeam(slug).filter((p) => p.slug !== player.slug).slice(0, 7)
  // "Same position elsewhere" — players in the same position from other teams,
  // ranked by rating descending so the link block surfaces the most relevant
  // cross-nav candidates. Cap at 8.
  const samePositionElsewhere = getAllPlayers()
    .filter((p) => p.position === player.position && p.teamSlug !== slug)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8)
  const derivedStats = computeDerivedStats(player)
  const playerIntel = getPlayerIntelBySlug(slug, player.slug)
  const teamFixtures = getFixturesByTeam(slug)

  // Auto-link entities for the seoArticle/outlook prose. Exclude the current
  // team so the article doesn't self-link. Include all 12 host cities so
  // outlook references to "Los Angeles" / "Mexico City" become deep links.
  const autoLinkEntities: LinkEntity[] = [
    ...buildTeamEntities(getAllTeams(), locale, slug, 'text-primary hover:underline'),
    ...buildCityEntities(HOST_CITIES, locale, undefined, 'text-primary hover:underline'),
  ]

  const playerPath = `/teams/${slug}/players/${player.slug}`
  const playerUrl = `https://kickoracle.com${playerPath}`
  const teamUrl = `https://kickoracle.com/teams/${slug}`
  const personLd = {
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

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Teams', url: canonicalForLocale(locale, '/teams') },
    { name: team.name, url: canonicalForLocale(locale, `/teams/${slug}`) },
    { name: player.name, url: canonicalForLocale(locale, playerPath) },
  ])

  const graph = jsonLdGraph([personLd, breadcrumbs])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />

      <PlayerHero player={player} team={team} derivedStats={derivedStats} />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Teams', href: '/teams' },
          { name: team.name, href: `/teams/${slug}` },
          { name: player.name, href: playerPath },
        ]}
      />
      <PlayerStats player={player} derivedStats={derivedStats} />
      <PlayerScoutGrade player={player} team={team} playerIntel={playerIntel} />
      <StatTwin player={player} team={team} derivedStats={derivedStats} />
      <SelectionProbabilityCard player={player} team={team} playerIntel={playerIntel} />
      <MatchProjectionTable player={player} team={team} fixtures={teamFixtures} />
      <SocialBuzzCard player={player} team={team} />
      <SignalLedger player={player} team={team} playerIntel={playerIntel ?? null} />
      <WorkloadWatch player={player} team={team} />
      <RoleHeatmap player={player} team={team} />
      <CareerArc player={player} team={team} />
      <DifferentiatorCard player={player} team={team} />
      <PlayerIntel player={player} />
      <PlayerArticle player={player} team={team} autoLinkEntities={autoLinkEntities} />

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

      {samePositionElsewhere.length > 0 && (
        <section className="page-container mb-20" aria-label="Same position at other teams">
          <div className="flex items-center justify-between mb-6">
            <SectionHeader>Other top {player.position}s</SectionHeader>
            <Link
              href={`/teams`}
              className="font-label text-sm font-semibold text-primary uppercase tracking-widest hover:underline"
            >
              All Teams
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
            {samePositionElsewhere.map((p) => {
              const pTeam = getTeamBySlug(p.teamSlug)
              return (
                <li key={`${p.teamSlug}/${p.slug}`}>
                  <Link
                    href={`/teams/${p.teamSlug}/players/${p.slug}`}
                    className="flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/30 px-4 py-3 rounded-xl font-body text-sm transition-all hover:text-primary"
                  >
                    <span aria-hidden="true" className="text-lg">{pTeam?.flag ?? '⚽'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-on-surface-variant">
                        {pTeam?.name ?? p.teamSlug} · {p.position}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
