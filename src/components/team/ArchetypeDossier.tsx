import type { Team } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import { getTeamColors } from '@/lib/team-colors'
import { BRAND } from '@/lib/brand-tokens'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import { findArchetype, pickCeilingTier } from '@/lib/archetypes'
import { getISOWeek } from './ScoutEdgeScore'

const VERDICT_KEY_BY_TIER = {
  title: 'verdict.ceilingTitle',
  deepRun: 'verdict.ceilingDeepRun',
  knockouts: 'verdict.ceilingKnockouts',
  group: 'verdict.ceilingGroup',
} as const

interface ArchetypeDossierProps {
  team: Team
}

export default async function ArchetypeDossier({ team }: ArchetypeDossierProps) {
  const t = await getTranslations('archetypeDossier')
  const colors = getTeamColors(team.slug)

  const archetype = findArchetype(team.archetypeMatch)
  if (!archetype) {
    // Only possible if the curated DB is empty — keep the surface defensive.
    return null
  }

  const ceilingTier = pickCeilingTier(archetype.baselineFinish)
  const verdict = t(VERDICT_KEY_BY_TIER[ceilingTier])

  const accentColor =
    ceilingTier === 'group' ? BRAND.secondary : colors.primary

  const now = new Date()
  const isoWeek = getISOWeek(now)
  const dossierId = `SCT-${team.slug.toUpperCase().slice(0, 3)}-T4-W${isoWeek}-2026`

  const signalCount =
    archetype.historicalReferences.length +
    archetype.strengths.length +
    archetype.cautions.length
  const sourceCount = 3
  const lastUpdatedAt = now.toISOString()

  const successPct = Math.round(archetype.successRate * 100)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('title')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={verdict}
        signalCount={signalCount}
        sourceCount={sourceCount}
        lastUpdatedAt={lastUpdatedAt}
        accentColor={accentColor}
      >
        {/* Archetype headline */}
        <header className="mb-5">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
            {t('archetypeLabel')}
          </p>
          <h4
            className="font-headline text-3xl md:text-4xl tracking-tight"
            style={{ color: accentColor }}
          >
            {archetype.name}
          </h4>
        </header>

        {/* Summary paragraph */}
        <div className="mb-7">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
            {t('summaryLabel')}
          </p>
          <p className="font-body text-base md:text-lg leading-relaxed text-on-surface">
            {archetype.summary}
          </p>
        </div>

        {/* 2-col grid: strengths + cautions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
          <PointList
            label={t('strengthsLabel')}
            items={archetype.strengths}
            tone="positive"
            accent={colors.primary}
          />
          <PointList
            label={t('cautionsLabel')}
            items={archetype.cautions}
            tone="caution"
            accent={BRAND.secondary}
          />
        </div>

        {/* Historical references */}
        {archetype.historicalReferences.length > 0 && (
          <div className="mb-7">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-3">
              {t('historyLabel')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {archetype.historicalReferences.map((ref) => (
                <HistoryCard
                  key={`${ref.team}-${ref.year}`}
                  reference={ref}
                  accent={accentColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Baseline finish + success rate */}
        <div className="grid grid-cols-2 gap-6 pt-2 border-t border-white/[0.06]">
          <div className="pt-4">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
              {t('baselineLabel')}
            </p>
            <div>
              <Badge variant="tertiary">{archetype.baselineFinish}</Badge>
            </div>
          </div>
          <div className="pt-4">
            <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-2">
              {t('successRateLabel')}
            </p>
            <p
              className="font-headline text-2xl tracking-tight"
              style={{ color: accentColor }}
            >
              {successPct}%
            </p>
          </div>
        </div>

        {/* From: team.archetypeMatch footnote */}
        {team.archetypeMatch && (
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mt-6">
            {t('fromLabel')}: {team.archetypeMatch}
          </p>
        )}
      </IntelligenceModule>
    </section>
  )
}

interface PointListProps {
  label: string
  items: string[]
  tone: 'positive' | 'caution'
  accent: string
}

function PointList({ label, items, accent }: PointListProps) {
  return (
    <div>
      <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant mb-3">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 font-body text-sm leading-relaxed text-on-surface"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0"
              style={{ background: accent }}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface HistoryCardProps {
  reference: { team: string; year: number; finish: string }
  accent: string
}

function HistoryCard({ reference, accent }: HistoryCardProps) {
  return (
    <div
      className="rounded-xl p-4 border bg-white/[0.02]"
      style={{ borderColor: `${accent}26` }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-headline text-base tracking-wide uppercase text-on-surface">
          {reference.team}
        </span>
        <span
          className="font-mono text-xs tracking-tight"
          style={{ color: accent }}
        >
          {reference.year}
        </span>
      </div>
      <p className="font-body text-sm text-on-surface-variant leading-snug">
        {reference.finish}
      </p>
    </div>
  )
}
