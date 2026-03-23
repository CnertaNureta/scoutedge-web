import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllTeams, getTeamBySlug, getPlayersByTeam, getTeamsByGroup } from '@/lib/data-service'
import { getTeamHeroImage } from '@/lib/unsplash'
import TeamHero from '@/components/team/TeamHero'
import TeamStats from '@/components/team/TeamStats'
import SquadRoster from '@/components/team/SquadRoster'
import TeamCard from '@/components/team/TeamCard'

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

      <TeamHero team={team} />
      <TeamStats team={team} />
      <SquadRoster players={players} teamSlug={slug} />

      {/* SEO Content Block */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <article
          className="prose prose-invert prose-lg max-w-none bg-surface-container-low p-8 md:p-12 rounded-2xl border border-white/[0.06]"
          dangerouslySetInnerHTML={{ __html: team.seoArticle }}
        />
      </section>

      {/* Related Teams */}
      {groupTeams.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <h2 className="font-headline text-2xl tracking-wide uppercase">
              More from Group {team.group}
            </h2>
          </div>
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
