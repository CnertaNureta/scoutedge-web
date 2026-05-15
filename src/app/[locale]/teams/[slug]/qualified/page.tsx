import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { getPlayersByTeam, getTeamBySlug } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { resolvePlayerStatus, STATUS_CONFIG, type PlayerStatus } from '@/lib/player-status'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const team = getTeamBySlug(slug)
  if (!team) return {}

  const qualLabel = team.isPlayoff ? 'Playoff Entry' : 'Qualified'
  const title = `Is ${team.name} Qualified for the 2026 World Cup? ${qualLabel} | KickOracle`
  const description = `${team.name} 2026 World Cup qualification status: ${qualLabel}. Group ${team.group}, FIFA rank #${team.fifaRanking}. Full squad status, key players, and availability tracker.`
  const alternates = buildAlternates(locale, `/teams/${slug}/qualified`)

  return {
    title,
    description,
    keywords: `is ${team.name} qualified world cup 2026, ${team.name} 2026 world cup qualified, ${team.name} world cup squad, ${team.name} group ${team.group}`,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

const STATUS_PRIORITY: Record<PlayerStatus, number> = {
  'ruled-out': 0,
  doubtful: 1,
  retired: 2,
  likely: 3,
  confirmed: 4,
}

export default async function TeamQualifiedPage({ params }: Props) {
  const { locale, slug } = await params
  const team = getTeamBySlug(slug)
  if (!team) notFound()

  const allPlayers = getPlayersByTeam(slug)
  const resolved = allPlayers
    .map((p) => ({ player: p, ...resolvePlayerStatus(p) }))
    .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])

  const editorialFirst = resolved.filter((r) => r.source === 'editorial')
  const keyPlayers = (editorialFirst.length >= 8 ? editorialFirst : resolved).slice(0, 8)

  const counts = resolved.reduce<Record<PlayerStatus, number>>(
    (acc, r) => {
      acc[r.status] += 1
      return acc
    },
    { confirmed: 0, likely: 0, doubtful: 0, 'ruled-out': 0, retired: 0 }
  )

  const url = canonicalForLocale(locale, `/teams/${slug}/qualified`)
  const qualLabel = team.isPlayoff ? 'Playoff Entry' : 'Qualified'
  const qualTone = team.isPlayoff ? 'ring-amber-500/40 bg-amber-500/10' : 'ring-green-500/40 bg-green-500/10'

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Teams', url: canonicalForLocale(locale, '/teams') },
    { name: team.name, url: canonicalForLocale(locale, `/teams/${slug}`) },
    { name: 'Qualification Tracker', url },
  ])

  const faq = [
    {
      q: `Is ${team.name} qualified for the 2026 World Cup?`,
      a: team.isPlayoff
        ? `${team.name} booked their 2026 World Cup place via the inter-confederation or UEFA playoff pathway and will compete in Group ${team.group}.`
        : `Yes, ${team.name} is confirmed for the 2026 World Cup and has been drawn into Group ${team.group}.`,
    },
    {
      q: `Which group is ${team.name} in at the 2026 World Cup?`,
      a: `${team.name} is in Group ${team.group} of the 2026 FIFA World Cup.`,
    },
    {
      q: `Who are ${team.name}'s key players to watch?`,
      a: `Editorial-tracked names include ${keyPlayers
        .slice(0, 3)
        .map((k) => k.player.name)
        .join(', ')}. Our scouting feed updates status for every player in the squad.`,
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

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
          <Badge variant="outline" size="md">Qualification Tracker</Badge>
          <h1 className="font-headline text-4xl md:text-7xl tracking-wide uppercase mt-4 mb-4">
            Is {team.name}<br />Qualified for 2026?
          </h1>
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ring-1 ${qualTone} mt-4`}>
            <span className="text-2xl" aria-hidden>{team.isPlayoff ? '\ud83d\udd04' : '\u2705'}</span>
            <span className="font-headline text-xl uppercase tracking-wide">{qualLabel}</span>
          </div>
          <p className="text-on-surface-variant text-base mt-4">
            {team.flag} {team.name} &middot; Group {team.group} &middot; FIFA Rank #{team.fifaRanking}
          </p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(counts) as [PlayerStatus, number][]).map(([key, count]) => {
            const cfg = STATUS_CONFIG[key]
            return (
              <div key={key} className="glass-panel rounded-xl border border-white/[0.08] p-4 text-center">
                <p className="text-3xl" aria-hidden>{cfg.emoji}</p>
                <p className="font-mono text-2xl text-primary mt-1">{count}</p>
                <p className="text-on-surface-variant text-[10px] font-label uppercase tracking-widest mt-1">{cfg.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Key Players &mdash; Availability</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyPlayers.map(({ player, status, reason, updated, source }) => {
            const cfg = STATUS_CONFIG[status]
            return (
              <GlassCard key={player.slug} className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link
                      href={`/players/is-playing/${player.slug}`}
                      className="font-headline text-lg uppercase tracking-tight hover:text-primary transition-colors"
                    >
                      {player.name}
                    </Link>
                    <p className="text-on-surface-variant text-sm mt-1">
                      {player.position} &middot; {player.club} &middot; Age {player.age}
                    </p>
                  </div>
                  <Badge variant={cfg.badge}>{cfg.emoji} {cfg.label}</Badge>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed">{reason}</p>
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-3">
                  {source === 'editorial' ? 'Editorial update' : 'Derived from scouting feed'} &middot; {updated}
                </p>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-12">
        <SectionHeader className="mb-6">Full Squad Tracker</SectionHeader>
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">Player</th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant hidden sm:table-cell">Position</th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant hidden md:table-cell">Club</th>
                  <th className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map(({ player, status }) => {
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <tr key={player.slug} className="border-t border-white/5 hover:bg-surface-container-high transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/players/is-playing/${player.slug}`} className="font-label text-sm hover:text-primary transition-colors">
                          {player.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-on-surface-variant">{player.position}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-on-surface-variant">{player.club}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={cfg.badge}>{cfg.emoji} {cfg.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 pb-24">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/teams/${slug}`}
            className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            {team.flag} Full {team.name} Profile
          </Link>
          <Link
            href={`/groups/${team.group}`}
            className="border border-white/20 text-on-surface px-6 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Group {team.group}
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
