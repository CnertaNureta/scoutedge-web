import type { CoachProfile } from '@/data/coaches-data'
import { getTranslations } from 'next-intl/server'
import IntelligenceModule from '@/components/ui/IntelligenceModule'
import Badge from '@/components/ui/Badge'
import { BRAND } from '@/lib/brand-tokens'
import { computeCoachPressure } from '@/lib/intelligence/coach-pressure'

interface CoachPressureProfileProps {
  coach: CoachProfile
  teamSlug: string
  teamName: string
}

function pickBiasVariant(bias: 'attacking' | 'defensive' | 'neutral'): 'primary' | 'secondary' | 'outline' {
  if (bias === 'attacking') return 'primary'
  if (bias === 'defensive') return 'secondary'
  return 'outline'
}

export default async function CoachPressureProfile({
  coach,
  teamSlug,
  teamName,
}: CoachPressureProfileProps) {
  const t = await getTranslations('coachPressure')

  const breakdown = computeCoachPressure(coach)
  const dossierId = `SCT-${teamSlug.toUpperCase().slice(0, 3)}-T7-COACH-PRESSURE-2026`

  if (!breakdown.hasProfile) {
    return (
      <section className="max-w-[1440px] mx-auto px-6 mb-12">
        <IntelligenceModule
          title={t('heading')}
          subtitle={t('subtitle')}
          dossierId={dossierId}
          accentColor={BRAND.primary}
        >
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            {t('pendingState', { coach: coach.name, team: teamName })}
          </p>
        </IntelligenceModule>
      </section>
    )
  }

  const winRatePct = breakdown.bigGameRecord
    ? Math.round(breakdown.bigGameRecord.winRate * 100)
    : null

  const biasLabel = {
    attacking: t('biasAttacking'),
    defensive: t('biasDefensive'),
    neutral: t('biasNeutral'),
  }[breakdown.setPieceBias]

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <IntelligenceModule
        title={t('heading')}
        subtitle={t('subtitle')}
        dossierId={dossierId}
        scoutVerdict={t('scoutVerdict', { coach: coach.name })}
        signalCount={breakdown.signalCount}
        sourceCount={breakdown.sourceCount}
        accentColor={BRAND.primary}
      >
        {/* Big-game record */}
        {breakdown.bigGameRecord && (
          <div className="mb-6">
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block mb-3">
              {t('bigGameLabel')}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary" size="md">
                {breakdown.bigGameRecord.won}W
              </Badge>
              <Badge variant="outline" size="md">
                {breakdown.bigGameRecord.drawn}D
              </Badge>
              <Badge variant="secondary" size="md">
                {breakdown.bigGameRecord.lost}L
              </Badge>
              {winRatePct !== null && (
                <span className="font-headline text-2xl text-primary ml-2">
                  {winRatePct}%
                </span>
              )}
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                · {breakdown.bigGameRecord.played} {t('bigGamePlayed')}
              </span>
            </div>
          </div>
        )}

        {/* In-game tells */}
        {breakdown.inGameTells.length > 0 && (
          <div className="mb-6">
            <span className="font-label text-[10px] text-primary uppercase tracking-widest block mb-3">
              {t('inGameTellsLabel')}
            </span>
            <ol className="space-y-2">
              {breakdown.inGameTells.slice(0, 5).map((tell, idx) => (
                <li
                  key={`tell-${idx}`}
                  className="flex items-start gap-3 text-sm text-on-surface leading-relaxed"
                >
                  <span
                    className="font-mono text-[10px] text-primary mt-1 shrink-0"
                    aria-hidden="true"
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{tell}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Formation tweaks */}
        {breakdown.formationTweaks.length > 0 && (
          <div className="mb-6">
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block mb-3">
              {t('formationTweaksLabel')}
            </span>
            <div className="flex flex-wrap gap-2">
              {breakdown.formationTweaks.map((tweak, idx) => (
                <span
                  key={`tweak-${idx}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-white/[0.04] border border-primary/20 text-xs text-on-surface"
                >
                  {tweak}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Set-piece bias */}
        <div>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block mb-3">
            {t('setPieceLabel')}
          </span>
          <Badge variant={pickBiasVariant(breakdown.setPieceBias)} size="md">
            {biasLabel}
          </Badge>
        </div>
      </IntelligenceModule>
    </section>
  )
}
