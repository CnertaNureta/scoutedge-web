import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllTeamsForRouting, getTeamPageData } from '@/lib/site-data'
import { getTeamHeroImage } from '@/lib/unsplash'
import { jsonLdGraph } from '@/lib/og-utils'
import { getFixturesByTeam } from '@/lib/data-service'
import { HOST_CITIES } from '@/data/cities-data'
import { lingoPlayers } from '@/data/lingo-data'
import TeamHero from '@/components/team/TeamHero'
import TeamStats from '@/components/team/TeamStats'
import SquadRoster from '@/components/team/SquadRoster'
import TacticalDNA from '@/components/team/TacticalDNA'
import SquadDepth from '@/components/team/SquadDepth'
import HistoricalPerformance from '@/components/team/HistoricalPerformance'
import CoachProfileComponent from '@/components/team/CoachProfile'
import TeamCard from '@/components/team/TeamCard'
import IntelligenceReport from '@/components/team/IntelligenceReport'
import MatchSchedule from '@/components/team/MatchSchedule'
import GlassCard from '@/components/ui/GlassCard'
import Paywall from '@/components/monetization/Paywall'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  const teams = await getAllTeamsForRouting()
  return teams.map((team) => ({ slug: team.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const pageData = await getTeamPageData(slug)
  if (!pageData) return { title: 'Team Not Found' }

  const { team, seoMeta } = pageData
  const seoTitle = seoMeta?.title?.replace(/ \| KickOracle$/, '') ?? null

  return {
    title: seoTitle ?? `${team.name} World Cup 2026 — Squad, Analysis & Predictions`,
    description: seoMeta?.description ?? `AI-powered analysis of ${team.name}'s World Cup 2026 squad. ${team.name} is in Group ${team.group}, ranked #${team.fifaRanking} by FIFA. Full roster, match schedule, chemistry index, and win probability predictions.`,
    keywords: `${team.name} World Cup 2026, ${team.name} squad, ${team.name} World Cup roster, World Cup 2026 Group ${team.group}`,
    openGraph: {
      title: `${team.name} — World Cup 2026 AI Analysis`,
      description: `Deep-dive into ${team.name}'s World Cup 2026 campaign. AI-powered predictions and player intelligence.`,
      images: [{ url: getTeamHeroImage(slug), width: 1200, height: 630 }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${team.name} — World Cup 2026 | KickOracle`,
      description: `AI analysis: ${team.name} in Group ${team.group}. Chemistry Index: ${team.chemistry}/100.`,
    },
    alternates: { canonical: `https://kickoracle.com/teams/${slug}` },
  }
}

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params
  const pageData = await getTeamPageData(slug)
  if (!pageData) notFound()

  const t = await getTranslations('teamsPage')
  const { team, players, groupTeams, worldCupHistory, coach, teamFaq } = pageData

  // Cross-section linking data
  const fixtures = getFixturesByTeam(slug)
  const teamCityNames = Array.from(new Set(fixtures.map((f) => f.city)))
  const teamCities = teamCityNames
    .map((name) => HOST_CITIES.find((c) => c.name === name))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
  const pronunciationLinks = lingoPlayers.filter((lp) => lp.country === slug).slice(0, 4)

  const teamUrl = `https://kickoracle.com/teams/${slug}`
  const sportsTeamLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    alternateName: `${team.name} national football team`,
    url: teamUrl,
    sport: 'Association Football',
    image: getTeamHeroImage(slug),
    coach: { '@type': 'Person', name: team.coachName },
    memberOf: [
      { '@type': 'SportsOrganization', name: 'FIFA' },
      { '@type': 'SportsOrganization', name: team.confederation },
    ],
    athlete: players.slice(0, 23).map((p) => ({
      '@type': 'Person',
      name: p.name,
      url: `${teamUrl}/players/${p.slug}`,
      ...(p.position && { jobTitle: p.position }),
    })),
    location: { '@type': 'Country', name: team.name },
  }

  const faqLd = teamFaq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: teamFaq.faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null

  const graph = jsonLdGraph(faqLd ? [sportsTeamLd, faqLd] : [sportsTeamLd])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />

      <TeamHero team={team} />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Teams', href: '/teams' },
          { name: team.name, href: `/teams/${slug}` },
        ]}
      />
      <TeamStats team={team} />

      {/* Head Coach */}
      {coach && <CoachProfileComponent coach={coach} />}

      <SquadRoster players={players} teamSlug={slug} />

      <Paywall contentType="team" scope={slug} previewLines={6}>
        <TacticalDNA team={team} players={players} />
      </Paywall>

      <Paywall contentType="team" scope={slug} previewLines={4}>
        <SquadDepth players={players} />
      </Paywall>

      {worldCupHistory && (
        <Paywall contentType="team" scope={slug} previewLines={5}>
          <HistoricalPerformance history={worldCupHistory} />
        </Paywall>
      )}

      <Paywall contentType="team" scope={slug} previewLines={4}>
        <IntelligenceReport team={team} />
      </Paywall>

      {/* FAQ Section */}
      {teamFaq && teamFaq.faqs.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            {t('frequentlyAsked')}
          </h2>
          <div className="space-y-3">
            {teamFaq.faqs.map((faq, i) => (
              <GlassCard key={i} className="p-6">
                <h3 className="font-headline text-base md:text-lg font-bold tracking-tight mb-3 text-primary">
                  {faq.question}
                </h3>
                <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                  {faq.answer}
                </p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Related Teams */}
      {groupTeams.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-20">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            {t('moreFromGroup', { group: team.group })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupTeams.map((groupTeam) => (
              <TeamCard key={groupTeam.slug} team={groupTeam} />
            ))}
          </div>
        </section>
      )}

      {/* Group rivals — direct compare links */}
      {groupTeams.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            Compare {team.name} vs Group {team.group} rivals
          </h2>
          <div className="flex flex-wrap gap-3">
            {groupTeams.map((rival) => (
              <Link
                key={rival.slug}
                href={`/compare/${slug}-vs-${rival.slug}`}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/30 px-5 py-2.5 rounded-full font-body text-sm transition-all hover:text-primary"
              >
                {team.name} vs {rival.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Where they play — host cities for this team's fixtures */}
      {teamCities.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            Where {team.name} plays — World Cup 2026 host cities
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teamCities.map((c) => (
              <Link
                key={c.slug}
                href={`/cities/${c.slug}`}
                className="block p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-tertiary/40 transition-all group"
              >
                <p className="font-headline text-base font-bold tracking-tight group-hover:text-tertiary transition-colors">
                  {c.name}
                </p>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
                  {c.country} guide
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pronunciation links — connect to /lingo/players */}
      {pronunciationLinks.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-20">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6">
            How to pronounce {team.name} player names
          </h2>
          <div className="flex flex-wrap gap-3">
            {pronunciationLinks.map((lp) => (
              <Link
                key={lp.id}
                href={`/lingo/players/${lp.id}`}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-secondary/30 px-5 py-2.5 rounded-full font-body text-sm transition-all hover:text-secondary"
              >
                Pronounce {lp.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
