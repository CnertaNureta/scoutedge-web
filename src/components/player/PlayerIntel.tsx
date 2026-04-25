import type { Player, PlayerSignal } from '@/lib/types'
import { getTeamColors } from '@/lib/team-colors'
import GlassCard from '@/components/ui/GlassCard'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import Badge from '@/components/ui/Badge'
import { Newspaper, MessageSquare, BarChart3, FlaskConical, AlertTriangle, Clock3 } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

interface PlayerIntelProps {
  player: Player
}

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  training: <Newspaper className="w-5 h-5 text-primary shrink-0" />,
  quote: <MessageSquare className="w-5 h-5 text-tertiary shrink-0" />,
  data: <BarChart3 className="w-5 h-5 text-on-surface-variant shrink-0" />,
}

function getRiskVariant(risk: Player['selectionRisk']) {
  if (risk === 'high') return 'secondary'
  if (risk === 'medium') return 'tertiary'
  return 'primary'
}

export default async function PlayerIntel({ player }: PlayerIntelProps) {
  const locale = await getLocale()
  const t = await getTranslations('playerIntel')
  const colors = getTeamColors(player.teamSlug)
  const lastUpdatedLabel = player.intelLastUpdated
    ? new Date(player.intelLastUpdated).toLocaleDateString(locale, {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <GlassCard hover={false} className="p-8 relative overflow-hidden">
        {/* Neon accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${colors.glow}, transparent)` }}
        />

        <div className="flex items-center gap-3 mb-6">
          <FlaskConical className="w-6 h-6" style={{ color: colors.glow }} />
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight">{t('intelligenceReport')}</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Fitness */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest">{t('fitnessStatus')}</span>
                <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
              </div>
              <p className="text-on-surface-variant italic">&ldquo;{player.fitnessNote}&rdquo;</p>
            </div>

            {/* Sentiment */}
            <div>
              <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
                {t('sentimentAnalysis')}
              </span>
              <ChemistryBar value={player.sentimentScore} label={player.sentimentLabel} />
              <p className="text-on-surface-variant text-xs mt-2">{t('sentimentDescription')}</p>
            </div>

            {(player.selectionRisk || player.tacticalRisk) && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-on-surface-variant" />
                  <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                    {t('selectionRisk')}
                  </span>
                  {player.selectionRisk && (
                    <Badge variant={getRiskVariant(player.selectionRisk)} size="md">
                      {player.selectionRisk}
                    </Badge>
                  )}
                </div>
                {player.selectionNote && (
                  <p className="text-on-surface-variant text-sm leading-relaxed">{player.selectionNote}</p>
                )}
                {player.tacticalNote && (
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    {t('tacticalRead', { note: player.tacticalNote })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recent signals */}
          <div className="space-y-4">
            <span className="font-label text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
              {t('recentSignals')}
            </span>
            <div className="space-y-3">
              {player.recentSignals && player.recentSignals.length > 0 ? (
                <>
                  {player.recentSignals.map((signal: PlayerSignal, i: number) => (
                    <div key={signal.id ?? i} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5">
                      {SIGNAL_ICONS[signal.type] ?? SIGNAL_ICONS.data}
                      <div className="min-w-0">
                        {signal.category && (
                          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                            {signal.category}
                          </p>
                        )}
                        <p className="text-sm text-on-surface">{signal.text}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg opacity-40 blur-[2px] border border-white/5">
                    {SIGNAL_ICONS.data}
                    <p className="text-sm">Advanced tactical analysis and positional data...</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg border border-white/5">
                  <Newspaper className="w-5 h-5 text-on-surface-variant/50 shrink-0" />
                  <p className="text-sm text-on-surface-variant italic">{t('noSignals')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/20">
          <p className="text-on-surface-variant text-sm">
            {player.recentSignals && player.recentSignals.length > 0
              ? t('signalsRefresh')
              : t('panelExpands')}
          </p>
          {lastUpdatedLabel && (
            <p className="text-on-surface-variant text-xs mt-1 inline-flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" />
              {t('updated', { date: lastUpdatedLabel })}
            </p>
          )}
        </div>
      </GlassCard>
    </section>
  )
}
