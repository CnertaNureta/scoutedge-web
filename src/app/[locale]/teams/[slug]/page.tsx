import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllTeamsForRouting, getTeamPageData } from '@/lib/site-data'
import { getTeamHeroImage } from '@/lib/unsplash'
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

  const { team, players, groupTeams, worldCupHistory, coach, teamFaq } = pageData

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: 'Football',
    coach: { '@type': 'Person', name: team.coachName },
    memberOf: { '@type': 'SportsOrganization', name: 'FIFA World Cup 2026' },
    location: { '@type': 'Country', name: team.name },
  }

  const faqJsonLd = teamFaq ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: teamFaq.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <TeamHero team={team} />
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
            Frequently Asked Questions
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
