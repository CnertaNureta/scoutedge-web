import type { MarketIntelData } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

interface MarketIntelProps {
  teamName: string
  marketIntel: MarketIntelData
}

function MovementIndicator({ movement }: { movement: MarketIntelData['movement'] }) {
  if (movement === 'shortening') {
    return (
      <span className="inline-flex items-center gap-1.5 font-label text-sm font-bold text-green-500">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 11V3M7 3L3 7M7 3L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Shortening
      </span>
    )
  }
  if (movement === 'drifting') {
    return (
      <span className="inline-flex items-center gap-1.5 font-label text-sm font-bold text-secondary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 3V11M7 11L3 7M7 11L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Drifting
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-label text-sm font-bold text-on-surface-variant">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Stable
    </span>
  )
}

export default function MarketIntel({ teamName, marketIntel }: MarketIntelProps) {
  const { tournamentOdds, averageOdds, impliedProbability, movement, valueBet } = marketIntel

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-tertiary" aria-hidden="true" />
        Market Intelligence
      </h2>
      <p className="text-on-surface-variant text-sm mb-6">What the bookmakers think. Lower odds = the team is more likely to win the tournament. Higher implied probability = stronger favorite.</p>

      <GlassCard className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="font-body text-sm text-on-surface-variant">
            Tournament winner odds for {teamName}, aggregated across {tournamentOdds.length} bookmakers.
            The market currently implies a <span className="font-bold text-on-surface">{impliedProbability}%</span> chance of lifting the trophy.
          </p>
          <MovementIndicator movement={movement} />
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <GlassCard className="p-4">
            <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Avg Odds
            </span>
            <div className="font-headline text-2xl font-black text-on-surface mt-1">
              {averageOdds.toFixed(2)}
            </div>
            <p className="font-label text-xs text-on-surface-variant mt-1">
              {tournamentOdds.length} bookmakers
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Implied Prob
            </span>
            <div className="font-headline text-2xl font-black text-on-surface mt-1">
              {impliedProbability}%
            </div>
            <p className="font-label text-xs text-on-surface-variant mt-1">
              Market consensus
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Movement
            </span>
            <div className="font-headline text-2xl font-black text-on-surface mt-1">
              {movement === 'shortening' ? 'Shortening' : movement === 'drifting' ? 'Drifting' : 'Stable'}
            </div>
            <p className="font-label text-xs text-on-surface-variant mt-1">
              {movement === 'shortening' ? 'Money coming in' : movement === 'drifting' ? 'Odds lengthening' : 'No significant shift'}
            </p>
          </GlassCard>
        </div>

        {/* Bookmaker odds breakdown */}
        <div className="mb-6">
          <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            Bookmaker Odds
          </h3>
          <div className="space-y-2">
            {tournamentOdds.map((odds) => (
              <div
                key={odds.bookmaker}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-container-low px-4 py-2.5"
              >
                <span className="font-label text-sm font-bold text-on-surface">{odds.bookmaker}</span>
                <div className="flex items-center gap-3">
                  <span className="font-label text-xs text-on-surface-variant">{odds.impliedProbability}%</span>
                  <span className="font-mono text-lg font-bold text-primary">{odds.decimalOdds.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value bet callout */}
        {valueBet && (
          <div
            className={`rounded-xl border p-4 mb-4 ${
              valueBet.signalStrength === 'strong'
                ? 'border-green-500/40 bg-green-500/5'
                : valueBet.signalStrength === 'moderate'
                  ? 'border-tertiary/40 bg-tertiary/5'
                  : 'border-primary/40 bg-primary/5'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-sm font-bold text-on-surface">Value bet detected</span>
              <Badge
                variant={valueBet.signalStrength === 'strong' ? 'primary' : valueBet.signalStrength === 'moderate' ? 'tertiary' : 'outline'}
                size="sm"
              >
                {valueBet.signalStrength} signal
              </Badge>
            </div>
            <p className="font-body text-sm text-on-surface-variant mt-2">
              ScoutEdge model gives {teamName} a {(valueBet.ourProbability * 100).toFixed(1)}% chance
              vs the market&apos;s {(valueBet.marketProbability * 100).toFixed(1)}% — an edge
              of {(valueBet.edge * 100).toFixed(1)}pp. Best available
              at <span className="font-bold text-primary">{valueBet.bestOdds.toFixed(2)}</span> ({valueBet.bestBookmaker}).
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="font-label text-[10px] text-on-surface-variant/60">
          Odds for informational purposes only. ScoutEdge does not facilitate or encourage gambling.
          Odds sourced from third-party providers and may not reflect real-time market conditions.
        </p>
      </GlassCard>
    </section>
  )
}
