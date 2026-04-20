import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPlayers, getTeamBySlug } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import { resolvePlayerStatus, STATUS_CONFIG, type PlayerStatus } from '@/lib/player-status'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllPlayers().map((p) => ({ slug: p.slug }))
}

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildFaq(playerName: string, teamName: string, status: PlayerStatus, reason: string, updated: string) {
  const answer = STATUS_CONFIG[status]
  return [
    {
      q: `Is ${playerName} playing in the 2026 World Cup?`,
      a: `${answer.label}. ${reason}`,
    },
    {
      q: `When was ${playerName}'s 2026 World Cup status last updated?`,
      a: `The last editorial update to ${playerName}'s status was on ${formatUpdated(updated)}.`,
    },
    {
      q: `Which team does ${playerName} play for?`,
      a: `${playerName} represents ${teamName} at international level.`,
    },
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const player = getAllPlayers().find((p) => p.slug === slug)
  if (!player) return {}

  const team = getTeamBySlug(player.teamSlug)
  const teamName = team?.name ?? player.teamSlug
  const resolved = resolvePlayerStatus(player)
  const status = STATUS_CONFIG[resolved.status]

  const title = `Is ${player.name} Playing in the 2026 World Cup? ${status.label} | KickOracle`
  const description = `${player.name} (${teamName}) 2026 World Cup status: ${status.label}. ${resolved.reason} Updated ${formatUpdated(resolved.updated)}.`
  const url = `https://kickoracle.com/players/is-playing/${slug}`

  return {
    title,
    description,
    keywords: `is ${player.name} playing world cup 2026, ${player.name} 2026 world cup, ${player.name} ${teamName} squad, ${player.name} fitness status`,
    alternates: { canonical: url },
    ...buildOGMeta({ title, description, url }),
  }
}

export default async function IsPlayingPage({ params }: Props) {
  const { slug } = await params
  const player = getAllPlayers().find((p) => p.slug === slug)
  if (!player) notFound()

  const team = getTeamBySlug(player.teamSlug)
  const teamName = team?.name ?? player.teamSlug.replace(/-/g, ' ')
  const teamFlag = team?.flag ?? ''
  const resolved = resolvePlayerStatus(player)
  const config = STATUS_CONFIG[resolved.status]
  const url = `https://kickoracle.com/players/is-playing/${slug}`

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Players', url: 'https://kickoracle.com/teams' },
    { name: teamName, url: `https://kickoracle.com/teams/${player.teamSlug}` },
    { name: `Is ${player.name} Playing?`, url },
  ])

  const faq = buildFaq(player.name, teamName, resolved.status, resolved.reason, resolved.updated)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const toneRing =
    config.tone === 'positive'
      ? 'ring-green-500/40 bg-green-500/10'
      : config.tone === 'cautious'
        ? 'ring-amber-500/40 bg-amber-500/10'
        : 'ring-red-500/40 bg-red-500/10'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1200px] mx-auto text-center">
          <Badge variant="outline" size="md">Squad Tracker</Badge>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mt-4 mb-4">
            Is {player.name} Playing<br />in the 2026 World Cup?
          </h1>
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ring-1 ${toneRing} mt-4`}>
            <span className="text-2xl" aria-hidden>{config.emoji}</span>
            <span className="font-headline text-xl uppercase tracking-wide">{config.label}</span>
          </div>
          <p className="text-on-surface-variant text-base mt-4">
            {teamFlag} {teamName} &middot; {player.position} &middot; Age {player.age} &middot; Updated {formatUpdated(resolved.updated)}
          </p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <GlassCard className="p-6 md:p-8">
          <SectionHeader className="mb-4">Current Status</SectionHeader>
          <p className="text-on-surface text-lg leading-relaxed mb-4">{resolved.reason}</p>
          <p className="text-on-surface-variant text-sm leading-relaxed">{config.description}</p>
          {resolved.source === 'derived' && (
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-4">
              Derived from current fitness intel &middot; refreshed with our scouting feed
            </p>
          )}
        </GlassCard>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
            <p className="font-mono text-2xl text-primary">{player.caps}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Caps</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
            <p className="font-mono text-2xl text-primary">{player.goals}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Goals</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
            <p className="font-mono text-2xl text-primary">{player.assists}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Assists</p>
          </div>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
            <p className="font-mono text-2xl text-primary">{player.rating.toFixed(1)}</p>
            <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mt-1">Rating</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Frequently Asked</SectionHeader>
        <div className="space-y-4">
          {faq.map((item) => (
            <GlassCard key={item.q} className="p-5 md:p-6">
              <p className="font-label text-sm md:text-base text-on-surface font-semibold mb-2">{item.q}</p>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">{item.a}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/players/${slug}`}
            className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Full Player Profile
          </Link>
          <Link
            href={`/teams/${player.teamSlug}/qualified`}
            className="border border-white/20 text-on-surface px-6 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            {teamFlag} {teamName} Squad Tracker
          </Link>
          <Link
            href="/power-rankings"
            className="border border-white/20 text-on-surface px-6 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Power Rankings
          </Link>
        </div>
      </section>
    </>
  )
}
