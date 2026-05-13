import type { Venue, TeamTimezone } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import GlassCard from '@/components/ui/GlassCard'

interface MatchCenterProps {
  venues: Venue[]
  teamTimezone?: TeamTimezone
  jetLagTier?: string
  teamName: string
}

type MatchCenterTranslator = (key: string, values?: Record<string, string | number>) => string

function jetLagBadge(tier: string, t: MatchCenterTranslator): { label: string; colorClass: string } {
  switch (tier) {
    case 'none': return { label: t('jetLag.none'), colorClass: 'bg-green-500/20 text-green-400' }
    case 'moderate': return { label: t('jetLag.moderate'), colorClass: 'bg-yellow-500/20 text-yellow-400' }
    case 'significant': return { label: t('jetLag.significant'), colorClass: 'bg-orange-500/20 text-orange-400' }
    case 'extreme': return { label: t('jetLag.extreme'), colorClass: 'bg-red-500/20 text-red-400' }
    default: return { label: tier, colorClass: 'bg-outline/20 text-on-surface-variant' }
  }
}

function countryFlag(countryCode: string): string {
  switch (countryCode) {
    case 'US': return '\u{1F1FA}\u{1F1F8}'
    case 'MX': return '\u{1F1F2}\u{1F1FD}'
    case 'CA': return '\u{1F1E8}\u{1F1E6}'
    default: return ''
  }
}

export default async function MatchCenter({ venues, teamTimezone, jetLagTier, teamName }: MatchCenterProps) {
  if (venues.length === 0 && !teamTimezone) return null

  const t = await getTranslations('matchCenter')
  const badge = jetLagTier ? jetLagBadge(jetLagTier, t as MatchCenterTranslator) : null

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
        {t('title')}
      </h2>

      {/* Timezone & Jet Lag Info */}
      {teamTimezone && (
        <GlassCard className="p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                {t('timezoneAdjustment')}
              </h3>
              <p className="font-body text-sm text-on-surface">
                {t('homeTimezone', { team: teamName })} <span className="font-mono text-primary font-bold">UTC{teamTimezone.utcOffset >= 0 ? '+' : ''}{teamTimezone.utcOffset}</span>
              </p>
              {teamTimezone.adjustmentHours !== 0 && (
                <p className="font-body text-sm text-on-surface-variant mt-0.5">
                  {teamTimezone.notes}
                </p>
              )}
            </div>
            {badge && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full font-label text-xs font-bold uppercase tracking-wider shrink-0 ${badge.colorClass}`}>
                {badge.label}
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* Venue Grid */}
      {venues.length > 0 && (
        <>
          <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
            {t('venuesHeading', { count: venues.length })}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {venues.map((venue) => (
              <GlassCard key={venue.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-headline text-sm font-bold text-on-surface leading-tight">
                    {venue.name}
                  </h4>
                  <span className="text-base shrink-0" aria-hidden="true">
                    {countryFlag(venue.countryCode)}
                  </span>
                </div>
                <p className="font-label text-xs text-on-surface-variant mb-3">
                  {venue.metro}, {venue.state}
                </p>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{t('capacity')}</span>
                    <span className="font-mono text-xs text-on-surface font-bold">{venue.capacity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{t('altitude')}</span>
                    <span className="font-mono text-xs text-on-surface font-bold">{venue.altitudeMeters}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{t('roof')}</span>
                    <span className="font-label text-xs text-on-surface">{venue.roofType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{t('surface')}</span>
                    <span className="font-label text-xs text-on-surface">{venue.surface}</span>
                  </div>
                </div>

                {/* Climate summary */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{t('climate')}</span>
                  <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {venue.climate.description}
                  </p>
                  <div className="flex gap-3 mt-1.5">
                    <span className="font-mono text-[10px] text-on-surface-variant">
                      {t('juneTemp', { high: venue.climate.juneAvgHighC, low: venue.climate.juneAvgLowC })}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant">
                      {t('julyTemp', { high: venue.climate.julyAvgHighC, low: venue.climate.julyAvgLowC })}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
