import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllTeamsForRouting, getTeamPageData } from '@/lib/site-data'
import { getTeamHeroImage } from '@/lib/unsplash'
import { buildOGMeta, jsonLdGraph, breadcrumbJsonLd, canonicalForLocale, faqPageJsonLd } from '@/lib/og-utils'
import { getFixturesByTeam, getAllTeams } from '@/lib/data-service'
import { getCityByFixtureCityName, HOST_CITIES } from '@/data/cities-data'
import { linkifyText, buildTeamEntities, buildCityEntities } from '@/lib/auto-link'
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
import ScoutEdgeScoreModule from '@/components/team/ScoutEdgeScore'
import MarketModelSpread from '@/components/team/MarketModelSpread'
import RiskRegister from '@/components/team/RiskRegister'
import AgePeakWindow from '@/components/team/AgePeakWindow'
import VulnerabilityMatrix from '@/components/team/VulnerabilityMatrix'
import ArchetypeDossier from '@/components/team/ArchetypeDossier'
import TitlePathProbabilityTree from '@/components/team/TitlePathProbabilityTree'
import GlassCard from '@/components/ui/GlassCard'
import Paywall from '@/components/monetization/Paywall'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  const teams = await getAllTeamsForRouting()
  return teams.map((team) => ({ slug: team.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const pageData = await getTeamPageData(slug)
  if (!pageData) return { title: 'Team Not Found' }

  const { team, seoMeta } = pageData
  const seoTitle = seoMeta?.title?.replace(/ \| KickOracle$/, '') ?? null
  const title = seoTitle ?? `${team.name} World Cup 2026 — Squad, Analysis & Predictions`
  const description = seoMeta?.description ?? `AI-powered analysis of ${team.name}'s World Cup 2026 squad. ${team.name} is in Group ${team.group}, ranked #${team.fifaRanking} by FIFA. Full roster, match schedule, chemistry index, and win probability predictions.`
  const image = getTeamHeroImage(slug)
  const url = `https://kickoracle.com/teams/${slug}`

  return {
    title,
    description,
    keywords: `${team.name} World Cup 2026, ${team.name} squad, ${team.name} World Cup roster, World Cup 2026 Group ${team.group}`,
    ...buildOGMeta({
      title: `${team.name} — World Cup 2026 AI Analysis`,
      description: `Deep-dive into ${team.name}'s World Cup 2026 campaign. AI-powered predictions and player intelligence.`,
      url,
      locale,
      type: 'article',
      image,
    }),
    alternates: { canonical: url },
  }
}

export default async function TeamPage({ params }: PageProps) {
  const { locale, slug } = await params
  const pageData = await getTeamPageData(slug)
  if (!pageData) notFound()

  const t = await getTranslations('teamsPage')
  const { team, players, groupTeams, worldCupHistory, coach, teamFaq, marketIntel } = pageData

  // Cross-section linking data
  const fixtures = getFixturesByTeam(slug)
  const teamCityNames = Array.from(new Set(fixtures.map((f) => f.city)))
  const teamCities = teamCityNames
    .map((name) => getCityByFixtureCityName(name))
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

  const faqLd = teamFaq && teamFaq.faqs.length > 0 ? faqPageJsonLd(teamFaq.faqs) : null

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Teams', url: canonicalForLocale(locale, '/teams') },
    { name: team.name, url: canonicalForLocale(locale, `/teams/${slug}`) },
  ])

  const graph = jsonLdGraph(
    faqLd ? [sportsTeamLd, breadcrumbs, faqLd] : [sportsTeamLd, breadcrumbs]
  )

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

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      <TeamStats team={team} />

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      {/* ScoutEdge Score — flagship composite intelligence grade, gated */}
      <Paywall contentType="team" scope={slug} previewLines={6}>
        <ScoutEdgeScoreModule
          team={team}
          players={players}
          marketIntel={marketIntel}
        />
      </Paywall>

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      {/* Market vs Model Spread — books vs us edge module, gated */}
      {marketIntel && (
        <>
          <Paywall contentType="team" scope={slug} previewLines={6}>
            <MarketModelSpread team={team} marketIntel={marketIntel} />
          </Paywall>
          <div className="mx-14 border-t border-white/[0.08]" />
        </>
      )}

      {/* Squad Risk Register — top-5 fitness/selection/tactical concerns, gated */}
      <Paywall contentType="team" scope={slug} previewLines={6}>
        <RiskRegister team={team} players={players} />
      </Paywall>

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      {/* Head Coach */}
      {coach && (
        <>
          <CoachProfileComponent coach={coach} />
          <div className="mx-14 border-t border-white/[0.08]" />
        </>
      )}

      <SquadRoster players={players} teamSlug={slug} />

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      <Paywall contentType="team" scope={slug} previewLines={6}>
        <TacticalDNA team={team} players={players} />
        <div className="mx-14 border-t border-white/[0.08]" />
        <Paywall contentType="team" scope={slug} previewLines={6}>
          <VulnerabilityMatrix
            team={team}
            players={players}
            opponents={groupTeams}
          />
        </Paywall>
        <div className="mx-14 border-t border-white/[0.08]" />
        <SquadDepth players={players} />
        <div className="mx-14 border-t border-white/[0.08]" />
        {/* T9 — Age & peak window per position */}
        <AgePeakWindow team={team} players={players} />
        {worldCupHistory && (
          <>
            <div className="mx-14 border-t border-white/[0.08]" />
            <HistoricalPerformance history={worldCupHistory} />
          </>
        )}
        <div className="mx-14 border-t border-white/[0.08]" />
        <TitlePathProbabilityTree team={team} marketIntel={marketIntel} />
        <IntelligenceReport team={team} />
      </Paywall>

      {/* Section rule */}
      <div className="mx-14 border-t border-white/[0.08]" />

      {/* Archetype Dossier — historical pattern match with references, gated */}
      <Paywall contentType="team" scope={slug} previewLines={6}>
        <ArchetypeDossier team={team} />
      </Paywall>

      {/* FAQ Section */}
      {teamFaq && teamFaq.faqs.length > 0 && (
        <>
          <div className="mx-14 border-t border-white/[0.08]" />
          <section className="max-w-[1440px] mx-auto px-14 py-[72px]">
            <div className="mb-10">
              <p className="font-mono text-[10px] tracking-[0.22em] text-tertiary uppercase mb-3">
                ★ FAQ
              </p>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.96] font-normal text-on-surface">
                {t('frequentlyAsked').split(' ').slice(0, -1).join(' ')}{' '}
                <em className="text-primary">
                  {t('frequentlyAsked').split(' ').slice(-1)[0]}
                </em>
              </h2>
            </div>
            <div className="space-y-3">
              {(() => {
                const faqEntities = [
                  ...buildTeamEntities(getAllTeams(), locale, slug, 'text-primary hover:underline'),
                  ...buildCityEntities(HOST_CITIES, locale, undefined, 'text-primary hover:underline'),
                ]
                return teamFaq.faqs.map((faq, i) => (
                  <GlassCard key={i} className="p-6">
                    <h3 className="font-headline text-base md:text-lg font-bold tracking-tight mb-3 text-primary">
                      {faq.question}
                    </h3>
                    <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                      {linkifyText(faq.answer, faqEntities, { maxLinks: 3, keyPrefix: `faq-${i}` })}
                    </p>
                  </GlassCard>
                ))
              })()}
            </div>
          </section>
        </>
      )}

      {/* Related Teams */}
      {groupTeams.length > 0 && (
        <>
          <div className="mx-14 border-t border-white/[0.08]" />
          <section className="max-w-[1440px] mx-auto px-14 py-[72px]">
            <div className="mb-10">
              <p className="font-mono text-[10px] tracking-[0.22em] text-tertiary uppercase mb-3">
                ★ GROUP {team.group}
              </p>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.96] font-normal text-on-surface">
                {t('moreFromGroup', { group: team.group }).split(' ').slice(0, -1).join(' ')}{' '}
                <em className="text-primary">
                  {t('moreFromGroup', { group: team.group }).split(' ').slice(-1)[0]}
                </em>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupTeams.map((groupTeam) => (
                <TeamCard key={groupTeam.slug} team={groupTeam} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Group rivals — direct compare links */}
      {groupTeams.length > 0 && (
        <>
          <div className="mx-14 border-t border-white/[0.08]" />
          <section className="max-w-[1440px] mx-auto px-14 py-[72px]">
            <div className="mb-10">
              <p className="font-mono text-[10px] tracking-[0.22em] text-tertiary uppercase mb-3">
                ★ HEAD TO HEAD
              </p>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.96] font-normal text-on-surface">
                Compare {team.name} vs Group{' '}
                <em className="text-primary">{team.group} rivals</em>
              </h2>
            </div>
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
        </>
      )}

      {/* Where they play — host cities for this team's fixtures */}
      {teamCities.length > 0 && (
        <>
          <div className="mx-14 border-t border-white/[0.08]" />
          <section className="max-w-[1440px] mx-auto px-14 py-[72px]">
            <div className="mb-10">
              <p className="font-mono text-[10px] tracking-[0.22em] text-tertiary uppercase mb-3">
                ★ HOST CITIES
              </p>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.96] font-normal text-on-surface">
                Where {team.name}{' '}
                <em className="text-primary">plays</em>
              </h2>
            </div>
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
        </>
      )}

      {/* Pronunciation links — connect to /lingo/players */}
      {pronunciationLinks.length > 0 && (
        <>
          <div className="mx-14 border-t border-white/[0.08]" />
          <section className="max-w-[1440px] mx-auto px-14 py-[72px]">
            <div className="mb-10">
              <p className="font-mono text-[10px] tracking-[0.22em] text-tertiary uppercase mb-3">
                ★ PRONUNCIATION
              </p>
              <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.96] font-normal text-on-surface">
                How to pronounce{' '}
                <em className="text-primary">{team.name} player names</em>
              </h2>
            </div>
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
        </>
      )}

      {/* Dossier end mark */}
      <div className="mx-14 border-t border-white/[0.08]" />
      <div className="max-w-[1440px] mx-auto px-14 py-8 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.22em] text-on-surface-variant uppercase">
          END OF DOSSIER · {slug.toUpperCase()}-2026
        </span>
        <span className="font-display italic text-lg text-primary">
          — Kick Oracle Intelligence
        </span>
      </div>
    </>
  )
}
