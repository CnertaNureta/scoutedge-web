import type { Metadata } from 'next'
import { getAllTeams, getAllGroups, getTeamsByGroup } from '@/lib/data-service'
import TeamCard from '@/components/team/TeamCard'

export const metadata: Metadata = {
  title: 'All 48 Teams — World Cup 2026 Groups & Analysis',
  description:
    'Browse all 48 teams competing in the 2026 FIFA World Cup. Organized by group with AI-powered chemistry indexes, FIFA rankings, and squad analysis.',
  keywords: 'World Cup 2026 teams, World Cup 2026 groups, FIFA World Cup 2026 analysis',
  alternates: { canonical: 'https://scoutedge.ai/teams' },
}

export default function TeamsPage() {
  const groups = getAllGroups()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Teams',
    description: 'All 48 teams competing in the 2026 FIFA World Cup',
    numberOfItems: getAllTeams().length,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6">
        <div className="max-w-[1440px] mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">
            World Cup 2026<br />
            <span className="text-primary">All 48 Teams</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            AI-powered analysis of every nation competing in the most expansive FIFA World Cup in history.
            Explore squad chemistry, tactical profiles, and win probability predictions.
          </p>
        </div>
      </section>

      {/* Groups */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        {groups.map((group) => {
          const teams = getTeamsByGroup(group)
          return (
            <div key={group} className="mb-12">
              <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full font-label text-sm">
                  Group {group}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {teams.map((team) => (
                  <TeamCard key={team.slug} team={team} />
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
