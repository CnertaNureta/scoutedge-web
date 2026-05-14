import type { Player, Team } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import { getPositionColor } from '@/components/ui/PositionBadge'
import SectionHeader from '@/components/ui/SectionHeader'
import { SURFACE } from '@/lib/brand-tokens'
import { transformPlayerArticle } from '@/lib/player-article-variants'
import type { LinkEntity } from '@/lib/auto-link'

interface PlayerArticleProps {
  player: Player
  team: Team
  /**
   * Optional: when provided, the rendered prose is post-processed to inject
   * internal links to known team/city entities (first-occurrence, max 3 per
   * article). Backward-compatible — call sites that don't supply this get
   * the unchanged behavior.
   */
  autoLinkEntities?: ReadonlyArray<LinkEntity>
}

export default function PlayerArticle({ player, team, autoLinkEntities }: PlayerArticleProps) {
  const colors = getTeamColors(team.slug)
  const posColor = getPositionColor(player.position)
  // Rewrite the bundled seoArticle: swap templated phrases with position-aware
  // variants, append a hand-written outlook block when one exists for this slug.
  // Optionally inject internal links to teams/cities mentioned in the outlook.
  const articleHtml = transformPlayerArticle(player, autoLinkEntities)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      {/* Editorial section header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-1 h-8 rounded-full"
          style={{ backgroundColor: posColor }}
        />
        <div>
          <SectionHeader className="!mb-0">Scouting Report</SectionHeader>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
            AI-Powered Player Analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Main editorial content */}
        <article
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-headline prose-headings:uppercase prose-headings:tracking-tight
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/[0.06] prose-h2:pb-3
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-on-surface-variant prose-p:leading-relaxed prose-p:font-body
            prose-li:text-on-surface-variant prose-li:font-body
            prose-strong:text-on-surface prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        {/* Sidebar — player quick reference */}
        <aside className="space-y-6" aria-label="Player quick reference">
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
              Player Profile
            </h4>
            <dl className="space-y-3">
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Position</dt>
                <dd className="font-headline text-lg" style={{ color: posColor }}>{player.position}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Club</dt>
                <dd className="font-body text-sm text-on-surface">{player.club}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Age</dt>
                <dd className="font-headline text-lg">{player.age}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Rating</dt>
                <dd className="font-headline text-lg" style={{ color: colors.glow }}>{player.rating}/10</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Caps</dt>
                <dd className="font-headline text-lg">{player.caps}</dd>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between items-baseline">
                <dt className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Goals</dt>
                <dd className="font-headline text-lg">{player.goals}</dd>
              </div>
            </dl>
          </div>

          {/* Team context card */}
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
              {team.flag} {team.name}
            </h4>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Group {team.group} &middot; #{team.fifaRanking} FIFA &middot; Chemistry {team.chemistry}
            </p>
          </div>

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
