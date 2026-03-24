import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllTeams, getTeamBySlug, getPlayersByTeam, getTeamsByGroup, getWorldCupHistory, getAllVenues, getTeamTimezone, getJetLagTier } from '@/lib/data-service'
import { getTeamHeroImage } from '@/lib/unsplash'
import TeamHero from '@/components/team/TeamHero'
import TeamStats from '@/components/team/TeamStats'
import TacticalDNA from '@/components/team/TacticalDNA'
import SquadDepth from '@/components/team/SquadDepth'
import SquadRoster from '@/components/team/SquadRoster'
import TeamCard from '@/components/team/TeamCard'
import HistoricalPerformance from '@/components/team/HistoricalPerformance'
import MatchCenter from '@/components/team/MatchCenter'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllTeams().map((team) => ({ slug: team.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const team = getTeamBySlug(slug)
  if (!team) return { title: 'Team Not Found' }

  return {
    title: `${team.name} World Cup 2026 — Squad, Analysis & Predictions`,
    description: `AI-powered analysis of ${team.name}'s World Cup 2026 squad. ${team.name} is in Group ${team.group}, ranked #${team.fifaRanking} by FIFA. Full roster, match schedule, chemistry index, and win probability predictions.`,
    keywords: `${team.name} World Cup 2026, ${team.name} squad, ${team.name} World Cup roster, World Cup 2026 Group ${team.group}`,
    openGraph: {
      title: `${team.name} — World Cup 2026 AI Analysis`,
      description: `Deep-dive into ${team.name}'s World Cup 2026 campaign. AI-powered predictions and player intelligence.`,
      images: [{ url: getTeamHeroImage(slug), width: 1200, height: 630 }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${team.name} — World Cup 2026 | ScoutEdge`,
      description: `AI analysis: ${team.name} in Group ${team.group}. Chemistry Index: ${team.chemistry}/100.`,
    },
    alternates: { canonical: `https://scoutedge.ai/teams/${slug}` },
  }
}

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params
  const team = getTeamBySlug(slug)
  if (!team) notFound()

  const players = getPlayersByTeam(slug)
  const groupTeams = getTeamsByGroup(team.group).filter((t) => t.slug !== slug)
  const wcHistory = getWorldCupHistory(slug)
  const venues = getAllVenues()
  const teamTimezone = getTeamTimezone(slug)
  const jetLagTier = getJetLagTier(slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: 'Football',
    coach: { '@type': 'Person', name: team.coachName },
    memberOf: { '@type': 'SportsOrganization', name: 'FIFA World Cup 2026' },
    location: { '@type': 'Country', name: team.name },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="max-w-[1440px] mx-auto px-6 pt-6 pb-2">
        <ol className="flex items-center gap-2 font-label text-sm font-bold uppercase tracking-widest">
          <li>
            <Link href="/teams" className="text-on-surface-variant hover:text-primary transition-colors">
              All Teams
            </Link>
          </li>
          <li className="text-outline-variant" aria-hidden="true">&rarr;</li>
          <li>
            <span className="text-on-surface-variant">Group {team.group}</span>
          </li>
          <li className="text-outline-variant" aria-hidden="true">&rarr;</li>
          <li>
            <span className="text-on-surface" aria-current="page">{team.flag} {team.name}</span>
          </li>
        </ol>
      </nav>

      <TeamHero team={team} />
      <TeamStats team={team} players={players} />
      <TacticalDNA team={team} players={players} />
      <SquadDepth players={players} />
      <SquadRoster players={players} teamSlug={slug} />

      {/* Phase 2: Historical Performance */}
      {wcHistory && <HistoricalPerformance history={wcHistory} />}

      {/* Phase 2: Match Center & Venue Info */}
      <MatchCenter
        venues={venues}
        teamTimezone={teamTimezone}
        jetLagTier={jetLagTier}
        teamName={team.name}
      />

      {/* SEO Content Block */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <article
          className="prose prose-invert prose-lg max-w-none bg-surface-container-low p-8 md:p-12 rounded-xl"
          dangerouslySetInnerHTML={{ __html: team.seoArticle }}
        />
      </section>

      {/* Related Teams */}
      {groupTeams.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-20">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            More from Group {team.group}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupTeams.map((t) => (
              <TeamCard key={t.slug} team={t} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
