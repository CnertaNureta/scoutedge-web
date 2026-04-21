import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPlayers, getAllTeams, getTeamBySlug } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

interface Props {
  params: Promise<{ player: string }>
}

export function generateStaticParams() {
  return getAllPlayers().map((p) => ({ player: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { player: slug } = await params
  const player = getAllPlayers().find((p) => p.slug === slug)
  if (!player) return {}

  const team = getTeamBySlug(player.teamSlug)
  const title = `${player.name} — ${team?.name ?? ''} | World Cup 2026`
  const description = `${player.name} player profile: ${player.position}, age ${player.age}, ${player.caps} caps, ${player.goals} goals. Club: ${player.club}. AI scouting report and fitness analysis.`
  const url = `https://kickoracle.com/players/${slug}`

  return {
    title,
    description,
    keywords: `${player.name} World Cup 2026, ${player.name} stats, ${team?.name ?? ''} squad`,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
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

  const team = getTeamBySlug(player.teamSlug)
  const teamName = team?.name ?? player.teamSlug.replace(/-/g, ' ')
  const teamFlag = team?.flag ?? ''

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Teams', url: 'https://kickoracle.com/teams' },
    { name: teamName, url: `https://kickoracle.com/teams/${player.teamSlug}` },
    { name: player.name, url: `https://kickoracle.com/players/${slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[160px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{POSITION_LABELS[player.position] ?? player.position}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-2">
            {player.name}
          </h1>
          <p className="text-on-surface-variant text-xl mb-1">
            {teamFlag} {teamName} &middot; #{player.number}
          </p>
          <p className="text-on-surface-variant text-base">
            {player.club} &middot; Age {player.age}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatBox value={player.caps} label="Caps" />
          <StatBox value={player.goals} label="Goals" />
          <StatBox value={player.assists} label="Assists" />
          <StatBox value={player.rating.toFixed(1)} label="Rating" />
          <StatBox value={player.sentimentScore.toFixed(0)} label="Sentiment" />
          <StatBox value={player.number} label="Squad #" />
        </div>
      </section>

      {/* Fitness & Intelligence */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fitness */}
          <div>
            <SectionHeader className="mb-6">Fitness Status</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  player.fitnessStatus === 'green' ? 'bg-green-500 animate-pulse' :
                  player.fitnessStatus === 'amber' ? 'bg-amber-500 animate-pulse' :
                  'bg-red-500 animate-pulse'
                }`} />
                <Badge variant={FITNESS_VARIANT[player.fitnessStatus] ?? 'outline'}>
                  {player.fitnessStatus === 'green' ? 'Fully Fit' :
                   player.fitnessStatus === 'amber' ? 'Minor Concern' : 'Injury Risk'}
                </Badge>
              </div>
              <p className="text-on-surface-variant leading-relaxed">{player.fitnessNote}</p>
            </GlassCard>
          </div>

          {/* Tactical */}
          <div>
            <SectionHeader className="mb-6">Scouting Report</SectionHeader>
            <GlassCard className="p-6 md:p-8">
              <div className="space-y-4">
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Tactical Risk</span>
                  <Badge variant={player.tacticalRisk === 'low' ? 'primary' : player.tacticalRisk === 'medium' ? 'secondary' : 'outline'}>
                    {player.tacticalRisk ?? 'unknown'}
                  </Badge>
                </div>
                {player.tacticalNote && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{player.tacticalNote}</p>
                )}
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Selection Risk</span>
                  <Badge variant={player.selectionRisk === 'low' ? 'primary' : player.selectionRisk === 'medium' ? 'secondary' : 'outline'}>
                    {player.selectionRisk ?? 'unknown'}
                  </Badge>
                </div>
                {player.selectionNote && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{player.selectionNote}</p>
                )}
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-on-surface-variant text-sm">Sentiment</span>
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
            href={`/teams/${player.teamSlug}/players/${slug}`}
            className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Full Profile on {teamName}
          </Link>
          <Link
            href={`/teams/${player.teamSlug}`}
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {teamFlag} {teamName} Squad
          </Link>
          <Link
            href="/teams"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            All Teams
          </Link>
        </div>
      </section>
    </>
  )
}
