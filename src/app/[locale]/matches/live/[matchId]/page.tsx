import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { getMatchesBoardData } from '@/lib/site-data'
import LiveMatchClient from './LiveMatchClient'

interface PageProps {
  params: Promise<{ matchId: string }>
}

function fixtureToMatchId(fixture: (typeof MATCH_FIXTURES)[number]): string {
  return `${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}-${fixture.group.toLowerCase()}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId } = await params
  const fixture = MATCH_FIXTURES.find((f) => fixtureToMatchId(f) === matchId)
  if (!fixture) return { title: 'Match Not Found' }

  const title = `Live: ${fixture.homeTeamSlug.replace(/-/g, ' ')} vs ${fixture.awayTeamSlug.replace(/-/g, ' ')} | World Cup 2026`
  return {
    title,
    description: `Live predictions, real-time stats, and interactive leaderboard for ${fixture.venue}, ${fixture.city}. Group ${fixture.group}, ${fixture.round}.`,
  }
}

export default async function LiveMatchPage({ params }: PageProps) {
  const { matchId } = await params
  const fixture = MATCH_FIXTURES.find((f) => fixtureToMatchId(f) === matchId)

  if (!fixture) notFound()

  const { teamsBySlug } = await getMatchesBoardData()
  const homeTeam = teamsBySlug[fixture.homeTeamSlug]
  const awayTeam = teamsBySlug[fixture.awayTeamSlug]

  if (!homeTeam || !awayTeam) notFound()

  return (
    <LiveMatchClient
      matchId={matchId}
      fixture={fixture}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
    />
  )
}
