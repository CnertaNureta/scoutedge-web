import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTeamBySlug, getPlayersByTeam, getPlayerBySlug } from '@/lib/data-service'
import { getPlayerActionImage } from '@/lib/unsplash'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import { buildOGMeta } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import {
  buildBreadcrumbSchema,
  buildGraph,
  buildPersonSchema,
} from '@/lib/seo/structured-data'
import { getRelatedPlayers } from '@/lib/related/players'
import PlayerHero from '@/components/player/PlayerHero'
import PlayerStats from '@/components/player/PlayerStats'
import PlayerIntel from '@/components/player/PlayerIntel'
import PlayerArticle from '@/components/player/PlayerArticle'
import SectionHeader from '@/components/ui/SectionHeader'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import RelatedEntitiesSection from '@/components/seo/RelatedEntitiesSection'

const POSITION_LABEL: Record<'GK' | 'DEF' | 'MID' | 'FWD', string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
}

interface PageProps {
  params: Promise<{ slug: string; playerSlug: string; locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, playerSlug, locale } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) return { title: 'Player Not Found' }

  const alternates = buildAlternates(locale, `/teams/${slug}/players/${player.slug}`)

  return {
    title: `${player.name}: ${team.name} World Cup 2026 Stats, Rating & Scouting Report`,
    description: `${player.name} World Cup 2026 scouting report. ${player.position} for ${team.name}, plays for ${player.club}. ${player.caps} caps, ${player.goals} goals, rating ${player.rating}/10. AI-powered fitness and performance analysis.`,
    keywords: `${player.name} World Cup 2026, ${player.name} stats, ${player.name} ${team.name}, ${player.name} profile`,
    alternates,
    ...buildOGMeta({
      title: `${player.name} — World Cup 2026 | KickOracle`,
      description: `AI-powered intelligence report for ${player.name}. ${team.name} · ${player.position} · ${player.club}.`,
      url: alternates.canonical,
      locale,
      type: 'profile',
      image: getPlayerActionImage(player.name),
    }),
  }
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug, playerSlug, locale } = await params
  const team = getTeamBySlug(slug)
  const player = getPlayerBySlug(slug, playerSlug)
  if (!team || !player) notFound()

  const teammates = getPlayersByTeam(slug).filter((p) => p.slug !== player.slug).slice(0, 5)
  const related = getRelatedPlayers(player, { sameTeam: 4, samePosition: 4 })
  const positionLabel = POSITION_LABEL[player.position]
  const derivedStats = computeDerivedStats(player)

  const playerPath = `/teams/${slug}/players/${player.slug}`

  const personLd = buildPersonSchema({
    player,
    team,
    locale,
    imageUrl: getPlayerActionImage(player.name),
  })
  const breadcrumbLd = buildBreadcrumbSchema(
    [
      { name: 'Home', path: '/' },
      { name: 'Teams', path: '/teams' },
      { name: team.name, path: `/teams/${slug}` },
      { name: player.name, path: playerPath },
    ],
    locale,
  )
  const graph = buildGraph([personLd, breadcrumbLd])

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
      <PlayerIntel player={player} />
      <PlayerArticle player={player} team={team} />

      <section className="page-container mb-12">
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

      <RelatedEntitiesSection
        title={`More from ${team.name}`}
        description={`Other ${team.name} players in the World Cup 2026 squad ranked by AI scouting score.`}
        items={related.teammates.map((p) => ({
          label: p.name,
          href: `/teams/${slug}/players/${p.slug}`,
          meta: `${p.position} · ${p.club}`,
          prefix: team.flag,
        }))}
      />

      <RelatedEntitiesSection
        title={`Top ${positionLabel} in World Cup 2026`}
        description={`Other top-rated ${positionLabel.toLowerCase()} to watch at the 2026 FIFA World Cup.`}
        items={related.samePosition.map((p) => {
          const otherTeam = getTeamBySlug(p.teamSlug)
          return {
            label: p.name,
            href: `/teams/${p.teamSlug}/players/${p.slug}`,
            meta: otherTeam ? `${otherTeam.name} · ${p.club}` : p.club,
            prefix: otherTeam?.flag,
          }
        })}
        className="mb-20"
      />
    </>
  )
}
