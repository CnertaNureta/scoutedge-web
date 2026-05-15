import type { Team, Player, MarketIntelData } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import { getTeamColors } from '@/lib/team-colors'
import { computePressBoxBrief } from '@/lib/intelligence/press-box-brief'

interface PressBoxBriefProps {
  team: Team
  players: Player[]
  marketIntel?: MarketIntelData | null
}

function applyTemplate(
  template: string,
  args: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = args[key]
    return value === undefined ? '' : String(value)
  })
}

export default async function PressBoxBrief({
  team,
  players,
  marketIntel = null,
}: PressBoxBriefProps) {
  const t = await getTranslations('pressBoxBrief')
  const colors = getTeamColors(team.slug)

  const breakdown = computePressBoxBrief(team, players, marketIntel ?? undefined)

  // Re-derive args for template substitution at render so localised templates
  // get the same fills as the compute fn used.
  const topScorer = players.reduce<Player | null>((best, p) => {
    if (!best) return p
    if (p.goals > best.goals) return p
    if (p.goals === best.goals && p.rating > best.rating) return p
    return best
  }, null)
  const signalPool = topScorer
    ? players.filter((p) => p.slug !== topScorer.slug)
    : players
  const signalPlayer = signalPool.reduce<Player | null>(
    (best, p) => (best === null || p.rating > best.rating ? p : best),
    null,
  )

  const edgePct = marketIntel?.modelEdge
    ? `${(marketIntel.modelEdge.edge * 100).toFixed(1)}%`
    : '—'
  const bookSource = marketIntel?.modelEdge?.bestSource ?? 'consensus'

  const templateArgs: Record<string, string | number> = {
    team: team.name,
    topScorer: topScorer?.name ?? 'the senior striker',
    topScorerGoals: topScorer?.goals ?? 0,
    signalPlayer: signalPlayer?.name ?? topScorer?.name ?? 'the captain',
    coach: team.coachName,
    ranking: team.fifaRanking,
    group: team.group,
    archetype: team.archetypeMatch,
    morale: team.morale,
    stability: team.stability,
    edgePct,
    bookSource,
  }

  const localizedBullets = breakdown.bullets.map((bullet) => {
    // Use t.raw to bypass next-intl's ICU parsing — our templates use simple
    // {placeholder} tokens that we substitute ourselves so the compute fn and
    // the renderer share one substitution model. Falls back to compute-fn
    // text if the key is missing.
    let template: string | undefined
    try {
      const raw = t.raw(`bulletTemplates.${bullet.templateId}`)
      template = typeof raw === 'string' ? raw : undefined
    } catch {
      template = undefined
    }
    const text = template ? applyTemplate(template, templateArgs) : bullet.text
    return { templateId: bullet.templateId, text }
  })

  const weekNum = String(breakdown.weekLabel.match(/WK(\d+)/)?.[1] ?? '')
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T10-PRESS-BOX-WK${weekNum}-2026`

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        signalCount={breakdown.signalCount}
        sourceCount={breakdown.sourceCount}
        accentColor={colors.primary}
      >
        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase">
            {breakdown.weekLabel}
          </span>
        </div>

        <ol className="space-y-4">
          {localizedBullets.map((bullet, idx) => (
            <li
              key={bullet.templateId}
              className="flex items-start gap-4 py-2 border-b border-white/[0.05] last:border-b-0"
            >
              <span className="font-mono text-[10px] tracking-widest text-on-surface-variant pt-1 w-6 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <p className="font-body italic text-base md:text-lg leading-relaxed text-on-surface flex-1">
                {bullet.text}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 font-display italic text-lg" style={{ color: colors.primary }}>
          {t('signOff')}
        </p>
        <p className="mt-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">
          {t('stubFootnote')}
        </p>
      </IntelligenceModule>
    </section>
  )
}
