import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAllPlayers, getTeamBySlug, getFixturesByTeam } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd, personJsonLd, jsonLdGraph, canonicalForLocale } from '@/lib/og-utils'
import { playerDescriptionEn } from '@/data/seo-meta'
import { resolvePlayerStatus, STATUS_CONFIG } from '@/lib/player-status'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'
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
import { getPlayerIntelBySlug } from '@/lib/player-intel-service'

export const revalidate = 3600

interface Props {
  params: Promise<{ player: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { player: slug } = await params
  const player = getAllPlayers().find((p) => p.slug === slug)
  if (!player) return {}

  const team = getTeamBySlug(player.teamSlug)
  const teamName = team?.name ?? ''
  const title = `${player.name} — ${teamName} | World Cup 2026`
  const description = playerDescriptionEn({
    name: player.name,
    position: player.position,
    team: teamName || player.teamSlug,
    club: player.club,
    age: player.age,
    caps: player.caps,
    goals: player.goals,
    rating: player.rating,
    slug: player.slug,
  })

  // Canonical retargets to the team-prefixed URL (richer hierarchy, included
  // in sitemap). If we can't resolve the team (e.g. data anomaly), fall back
  // to the self-canonical so we never emit an empty href.
  const selfUrl = canonicalForLocale('en', `/players/${slug}`)
  const canonical = team
    ? canonicalForLocale('en', `/teams/${team.slug}/players/${slug}`)
    : selfUrl

  return {
    title,
    description,
    keywords: `${player.name} World Cup 2026, ${player.name} stats, ${teamName} squad`,
    alternates: { canonical },
    ...buildOGMeta({ title, description, url: canonical }),
  }
}

const POSITION_KEYS: Record<string, 'positionGK' | 'positionDEF' | 'positionMID' | 'positionFWD'> = {
  GK: 'positionGK',
  DEF: 'positionDEF',
  MID: 'positionMID',
  FWD: 'positionFWD',
}

const FITNESS_VARIANT: Record<string, 'primary' | 'secondary' | 'outline'> = {
  green: 'primary',
  amber: 'secondary',
  red: 'outline',
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
      <p className="font-mono text-2xl text-primary">{value}</p>
      <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

export default async function PlayerPage({ params }: Props) {
  const { player: slug } = await params
  const player = getAllPlayers().find((p) => p.slug === slug)
  if (!player) notFound()

  const t = await getTranslations('playerPage')
  const team = getTeamBySlug(player.teamSlug)
  const playerIntel = getPlayerIntelBySlug(player.teamSlug, player.slug)
  const teamFixtures = getFixturesByTeam(player.teamSlug)
  const derivedStats = computeDerivedStats(player)
  const teamName = team?.name ?? player.teamSlug.replace(/-/g, ' ')
  const teamFlag = team?.flag ?? ''
  const resolved = resolvePlayerStatus(player)
  const statusConfig = STATUS_CONFIG[resolved.status]
  const positionKey = POSITION_KEYS[player.position]
  const fitnessLabel =
    player.fitnessStatus === 'green'
      ? t('fullyFit')
      : player.fitnessStatus === 'amber'
        ? t('minorConcern')
        : t('injuryRisk')

  const playerUrl = `https://kickoracle.com/players/${slug}`
  const personLd = personJsonLd({
    name: player.name,
    jobTitle: `Footballer (${player.position})`,
    description: `${player.name} World Cup 2026 profile — ${player.position} for ${teamName}, club ${player.club}. ${player.caps} caps, ${player.goals} goals.`,
    url: playerUrl,
  })
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Teams', url: 'https://kickoracle.com/teams' },
    { name: teamName, url: `https://kickoracle.com/teams/${player.teamSlug}` },
    { name: player.name, url: playerUrl },
  ])
  const graph = jsonLdGraph([personLd, breadcrumbs])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{positionKey ? t(positionKey) : player.position}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {player.name}
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            {t('metaSubtitle', { flag: teamFlag, team: teamName, number: player.number })}
          </p>
          <p className="text-on-surface-variant text-base">
            {t('clubAndAge', { club: player.club, age: player.age })}
          </p>
          <Link
            href={`/players/is-playing/${slug}`}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full ring-1 mt-6 transition-transform hover:scale-105 ${
              statusConfig.tone === 'positive'
                ? 'ring-green-500/40 bg-green-500/10'
                : statusConfig.tone === 'cautious'
                  ? 'ring-amber-500/40 bg-amber-500/10'
                  : 'ring-red-500/40 bg-red-500/10'
            }`}
          >
            <span className="text-lg" aria-hidden>{statusConfig.emoji}</span>
            <span className="font-label text-sm uppercase tracking-wide">
              {t('wc2026Status', { label: statusConfig.label })}
            </span>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatBox value={player.caps} label={t('caps')} />
          <StatBox value={player.goals} label={t('goals')} />
          <StatBox value={player.assists} label={t('assists')} />
          <StatBox value={player.rating.toFixed(1)} label={t('rating')} />
          <StatBox value={player.sentimentScore.toFixed(0)} label={t('sentiment')} />
          <StatBox value={player.number} label={t('squadNumber')} />
        </div>
      </section>

      {team && (
        <PlayerScoutGrade player={player} team={team} playerIntel={playerIntel} />
      )}

      {team && (
        <StatTwin player={player} team={team} derivedStats={derivedStats} />
      )}

      {team && (
        <SelectionProbabilityCard player={player} team={team} playerIntel={playerIntel} />
      )}

      {team && (
        <MatchProjectionTable player={player} team={team} fixtures={teamFixtures} />
      )}

      {team && (
        <SocialBuzzCard player={player} team={team} />
      )}

      {team && (
        <SignalLedger player={player} team={team} playerIntel={playerIntel ?? null} />
      )}

      {team && (
        <WorkloadWatch player={player} team={team} />
      )}

      {team && (
        <RoleHeatmap player={player} team={team} />
      )}

      {team && (
        <CareerArc player={player} team={team} />
      )}

      {team && (
        <DifferentiatorCard player={player} team={team} />
      )}

      {/* Fitness & Intelligence */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fitness */}
          <div>
            <SectionHeader className="mb-6">{t('fitnessStatus')}</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  player.fitnessStatus === 'green' ? 'bg-green-500 animate-pulse' :
                  player.fitnessStatus === 'amber' ? 'bg-amber-500 animate-pulse' :
                  'bg-red-500 animate-pulse'
                }`} />
                <Badge variant={FITNESS_VARIANT[player.fitnessStatus] ?? 'outline'}>
                  {fitnessLabel}
                </Badge>
              </div>
              <p className="text-on-surface-variant leading-relaxed">{player.fitnessNote}</p>
            </GlassCard>
          </div>

          {/* Tactical */}
          <div>
            <SectionHeader className="mb-6">{t('scoutingReport')}</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="space-y-4">
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">{t('tacticalRisk')}</span>
                  <Badge variant={player.tacticalRisk === 'low' ? 'primary' : player.tacticalRisk === 'medium' ? 'secondary' : 'outline'}>
                    {player.tacticalRisk ?? 'unknown'}
                  </Badge>
                </div>
                {player.tacticalNote && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{player.tacticalNote}</p>
                )}
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">{t('selectionRisk')}</span>
                  <Badge variant={player.selectionRisk === 'low' ? 'primary' : player.selectionRisk === 'medium' ? 'secondary' : 'outline'}>
                    {player.selectionRisk ?? 'unknown'}
                  </Badge>
                </div>
                {player.selectionNote && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{player.selectionNote}</p>
                )}
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">{t('sentiment')}</span>
                  <span className="text-on-surface font-label text-sm">{player.sentimentLabel}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/players/is-playing/${slug}`}
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            {t('isPlaying', { name: player.name })}
          </Link>
          <Link
            href={`/teams/${player.teamSlug}/players/${slug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('fullProfileOn', { team: teamName })}
          </Link>
          <Link
            href={`/teams/${player.teamSlug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('teamSquad', { flag: teamFlag, team: teamName })}
          </Link>
          <Link
            href="/teams"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {t('allTeams')}
          </Link>
        </div>
      </section>
    </>
  )
}
