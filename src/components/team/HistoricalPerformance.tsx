import type { WorldCupHistory } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'

interface HistoricalPerformanceProps {
  history: WorldCupHistory
}

function bestFinishColor(finish: string): string {
  if (finish.includes('Winner') || finish.includes('Champions')) return 'text-tertiary'
  if (finish.includes('Final') && !finish.includes('Quarter') && !finish.includes('Semi')) return 'text-tertiary'
  if (finish.includes('Semi')) return 'text-primary'
  if (finish.includes('Quarter')) return 'text-primary'
  return 'text-on-surface'
}

export default function HistoricalPerformance({ history }: HistoricalPerformanceProps) {
  const { allTimeRecord } = history
  const winRate = allTimeRecord.played > 0
    ? Math.round((allTimeRecord.won / allTimeRecord.played) * 100)
    : 0

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-tertiary" aria-hidden="true" />
        World Cup History
      </h2>

      {/* Key stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-5">
          <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Appearances
          </span>
          <div className="font-headline text-3xl font-black text-on-surface mt-1">
            {history.totalAppearances}
          </div>
          <p className="font-label text-xs text-on-surface-variant mt-1">
            Since {history.firstAppearance}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Best Finish
          </span>
          <div className={`font-headline text-lg md:text-xl font-black mt-1 leading-tight ${bestFinishColor(history.bestFinish)}`}>
            {history.bestFinish}
          </div>
          <p className="font-label text-xs text-on-surface-variant mt-1">
            {history.bestFinishYear.join(', ')}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Titles Won
          </span>
          <div className={`font-headline text-3xl font-black mt-1 ${history.titlesWon > 0 ? 'text-tertiary' : 'text-on-surface'}`}>
            {history.titlesWon}
          </div>
          {history.titlesWon > 0 && (
            <p className="font-label text-xs text-tertiary mt-1 font-bold">
              World Champion{history.titlesWon > 1 ? 's' : ''}
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Win Rate
          </span>
          <div className="font-headline text-3xl font-black text-on-surface mt-1">
            {winRate}%
          </div>
          <p className="font-label text-xs text-on-surface-variant mt-1">
            {allTimeRecord.won}W {allTimeRecord.drawn}D {allTimeRecord.lost}L
          </p>
        </GlassCard>
      </div>

      {/* All-time record bar */}
      <GlassCard className="p-5 mb-6">
        <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          All-Time World Cup Record — {allTimeRecord.played} Matches
        </h3>
        <div className="w-full h-3 rounded-full overflow-hidden flex" role="img" aria-label={`Won ${allTimeRecord.won}, Drawn ${allTimeRecord.drawn}, Lost ${allTimeRecord.lost} of ${allTimeRecord.played} matches`}>
          {allTimeRecord.won > 0 && (
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(allTimeRecord.won / allTimeRecord.played) * 100}%` }}
            />
          )}
          {allTimeRecord.drawn > 0 && (
            <div
              className="bg-outline h-full"
              style={{ width: `${(allTimeRecord.drawn / allTimeRecord.played) * 100}%` }}
            />
          )}
          {allTimeRecord.lost > 0 && (
            <div
              className="bg-secondary h-full"
              style={{ width: `${(allTimeRecord.lost / allTimeRecord.played) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-label text-xs font-bold text-green-500">
            {allTimeRecord.won} Won
          </span>
          <span className="font-label text-xs font-bold text-outline">
            {allTimeRecord.drawn} Drawn
          </span>
          <span className="font-label text-xs font-bold text-secondary">
            {allTimeRecord.lost} Lost
          </span>
        </div>
      </GlassCard>

      {/* Iconic Moments */}
      {history.iconicMoments.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
            Iconic Moments
          </h3>
          <div className="space-y-4">
            {history.iconicMoments.map((moment, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <span className="font-mono text-sm font-bold text-tertiary">
                    {moment.year}
                  </span>
                  {i < history.iconicMoments.length - 1 && (
                    <div className="w-px flex-1 bg-outline-variant mt-2" />
                  )}
                </div>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed pb-2">
                  {moment.description}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </section>
  )
}
