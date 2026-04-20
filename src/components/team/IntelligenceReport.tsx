import type { Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import PullQuote from '@/components/ui/PullQuote'
import SectionHeader from '@/components/ui/SectionHeader'
import { SURFACE } from '@/lib/brand-tokens'

interface IntelligenceReportProps {
  team: Team
}

export default function IntelligenceReport({ team }: IntelligenceReportProps) {
  const colors = getTeamColors(team.slug)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      {/* Editorial section header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-1 h-8 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
        <div>
          <SectionHeader className="!mb-0">Intelligence Report</SectionHeader>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
            AI-Powered Analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main editorial content */}
        <div>
          {/* Key Insight pull quote */}
          {team.keyInsight && (
            <div className="mb-8">
              <PullQuote accentColor={colors.primary} source="AI Analysis Engine">
                {team.keyInsight}
              </PullQuote>
            </div>
          )}

          {/* SEO article as editorial prose */}
          <article
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-headline prose-headings:uppercase prose-headings:tracking-tight
              prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/[0.06] prose-h2:pb-3
              prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-on-surface-variant prose-p:leading-relaxed prose-p:font-body
              prose-li:text-on-surface-variant prose-li:font-body
              prose-strong:text-on-surface prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: team.seoArticle }}
          />
        </div>

        {/* Sidebar — quick reference card */}
        <aside className="space-y-6" aria-label="Team quick reference">
          {/* Quick Stats card */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 5%, ${SURFACE.surfaceContainer})`,
              borderColor: `color-mix(in srgb, ${colors.primary} 12%, transparent)`,
            }}
          >
            <h4
              className="font-label text-xs font-bold uppercase tracking-[0.15em] mb-4"
              style={{ color: colors.glow }}
            >
              Quick Reference
            </h4>
            <dl className="space-y-3">
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">FIFA Rank</dt>
                <dd className="font-headline text-lg">#{team.fifaRanking}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Group</dt>
                <dd className="font-headline text-lg">{team.group}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Chemistry</dt>
                <dd className="font-headline text-lg" style={{ color: colors.glow }}>{team.chemistry}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Coach</dt>
                <dd className="font-body text-sm text-on-surface">{team.coachName}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Confederation</dt>
                <dd className="font-body text-sm text-on-surface">{team.confederation}</dd>
              </div>
            </dl>
          </div>

          {/* Archetype match card */}
          {team.archetypeMatch && (
            <div
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{
                backgroundColor: `color-mix(in srgb, ${colors.primary} 4%, ${SURFACE.surfaceContainer})`,
                borderColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(to right, ${colors.primary}60, transparent)`,
                }}
              />
              <h4
                className="font-label text-xs font-bold uppercase tracking-[0.15em] mb-3"
                style={{ color: colors.glow }}
              >
                Historical Archetype
              </h4>
              <p className="font-body text-base text-on-surface leading-relaxed">
                {team.archetypeMatch}
              </p>
              <p className="font-label text-[10px] text-on-surface-variant/60 mt-3 uppercase tracking-widest">
                Past World Cup team with closest style match
              </p>
            </div>
          )}

          {/* Source attribution */}
          <div className="text-center py-4">
            <p className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-[0.2em]">
              AI analysis based on 50,000+ data points
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
