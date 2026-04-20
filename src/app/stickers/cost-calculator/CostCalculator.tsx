'use client'

import { useState, useMemo } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

/* ── Math helpers ── */

function harmonicNumber(n: number): number {
  let h = 0
  for (let i = 1; i <= n; i++) {
    h += 1 / i
  }
  return h
}

function calculateResults(
  totalStickers: number,
  stickersPerPack: number,
  packPrice: number,
  tradingPartners: number,
) {
  const cappedPartners = Math.min(tradingPartners, 10)

  // Trading reduction: diminishing returns — each partner reduces remaining
  // stickers by 15%, but with diminishing effect beyond 5 partners.
  // Factor = 1 - 0.15 * min(partners, 5) - 0.05 * max(partners - 5, 0)
  const baseReduction = 0.15 * Math.min(cappedPartners, 5)
  const extraReduction = 0.05 * Math.max(cappedPartners - 5, 0)
  const tradingFactor = Math.max(1 - baseReduction - extraReduction, 0.2)

  const effectiveStickers = Math.ceil(totalStickers * tradingFactor)

  // Coupon Collector's Problem: expected packs = (N / stickersPerPack) * H(N)
  const hN = harmonicNumber(effectiveStickers)
  const expectedPacks = Math.ceil((effectiveStickers / stickersPerPack) * hN)
  const expectedCost = expectedPacks * packPrice
  const totalStickersCollected = expectedPacks * stickersPerPack
  const expectedDuplicates = totalStickersCollected - effectiveStickers

  // Completion probability milestones
  // At k packs, expected unique stickers ~ N * (1 - ((N-1)/N)^(k * stickersPerPack / N) * ...)
  // Simplified: use the coupon collector CDF approximation
  // P(complete at k packs) ~ integral approximation
  // For display, we invert: packs needed for X% completion of unique stickers
  const completionMilestones = [0.5, 0.75, 0.9, 0.95, 0.99].map((fraction) => {
    const targetUnique = Math.floor(effectiveStickers * fraction)
    if (targetUnique <= 0) return { fraction, packs: 0, cost: 0 }

    // For collecting targetUnique out of N stickers:
    // Expected packs = (N / stickersPerPack) * sum(1/(N-i) for i in 0..targetUnique-1)
    // = (1 / stickersPerPack) * sum(N/(N-i) for i in 0..targetUnique-1)
    let expectedPacksForTarget = 0
    for (let i = 0; i < targetUnique; i++) {
      expectedPacksForTarget += effectiveStickers / (effectiveStickers - i)
    }
    expectedPacksForTarget = Math.ceil(expectedPacksForTarget / stickersPerPack)
    const cost = expectedPacksForTarget * packPrice

    return { fraction, packs: expectedPacksForTarget, cost }
  })

  // Progress data: at various pack counts, how many unique stickers expected
  const progressPoints = [50, 100, 200, 300, 500, 700, 1000, 1500].filter(
    (p) => p <= expectedPacks * 1.5,
  )

  const progressData = progressPoints.map((packCount) => {
    const stickersOpened = packCount * stickersPerPack
    // Expected unique = N * (1 - ((N-1)/N)^stickersOpened)
    const expectedUnique = Math.min(
      effectiveStickers * (1 - Math.pow((effectiveStickers - 1) / effectiveStickers, stickersOpened)),
      effectiveStickers,
    )
    return {
      packs: packCount,
      unique: Math.round(expectedUnique),
      percentage: Math.min((expectedUnique / totalStickers) * 100, 100),
    }
  })

  return {
    expectedPacks,
    expectedCost,
    totalStickersCollected,
    expectedDuplicates,
    effectiveStickers,
    tradingFactor,
    completionMilestones,
    progressData,
    hN,
  }
}

/* ── Format helpers ── */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/* ── Component ── */

export default function CostCalculator() {
  const [totalStickers, setTotalStickers] = useState(700)
  const [stickersPerPack, setStickersPerPack] = useState(5)
  const [packPrice, setPackPrice] = useState(1.5)
  const [tradingPartners, setTradingPartners] = useState(0)

  const results = useMemo(
    () => calculateResults(totalStickers, stickersPerPack, packPrice, tradingPartners),
    [totalStickers, stickersPerPack, packPrice, tradingPartners],
  )

  const savingsWithTrading = tradingPartners > 0
    ? ((1 - results.tradingFactor) * 100).toFixed(0)
    : null

  return (
    <div className="space-y-10">
      {/* Controls + Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls panel */}
        <GlassCard className="lg:col-span-2 p-6 md:p-8">
          <h2 className="font-headline text-xl uppercase tracking-tight mb-6 text-on-surface flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-tertiary shrink-0" />
            Configure
          </h2>

          <div className="space-y-7">
            {/* Total stickers */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="total-stickers" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  Total Stickers in Album
                </label>
                <span className="font-mono text-sm text-primary font-semibold">
                  {totalStickers}
                </span>
              </div>
              <input
                id="total-stickers"
                type="range"
                min={500}
                max={800}
                step={10}
                value={totalStickers}
                onChange={(e) => setTotalStickers(Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-full bg-surface-container-high appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(160,212,148,0.5)]
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-container
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-container"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/50 mt-1 font-mono">
                <span>500</span>
                <span>800</span>
              </div>
            </div>

            {/* Stickers per pack */}
            <div>
              <label htmlFor="stickers-per-pack" className="block font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">
                Stickers per Pack
              </label>
              <div className="flex gap-2">
                {[5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStickersPerPack(n)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-sm font-bold transition-all duration-200 border ${
                      stickersPerPack === n
                        ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_20px_rgba(160,212,148,0.1)]'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:border-white/20'
                    }`}
                  >
                    {n} stickers
                  </button>
                ))}
              </div>
            </div>

            {/* Pack price */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="pack-price" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  Pack Price (USD)
                </label>
                <span className="font-mono text-sm text-primary font-semibold">
                  ${packPrice.toFixed(2)}
                </span>
              </div>
              <input
                id="pack-price"
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={packPrice}
                onChange={(e) => setPackPrice(Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-full bg-surface-container-high appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(160,212,148,0.5)]
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-container
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-container"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/50 mt-1 font-mono">
                <span>$0.50</span>
                <span>$5.00</span>
              </div>
            </div>

            {/* Trading partners */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="trading-partners" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  Trading Partners
                </label>
                <span className="font-mono text-sm text-tertiary font-semibold">
                  {tradingPartners} {tradingPartners === 1 ? 'friend' : 'friends'}
                </span>
              </div>
              <input
                id="trading-partners"
                type="range"
                min={0}
                max={10}
                step={1}
                value={tradingPartners}
                onChange={(e) => setTradingPartners(Number(e.target.value))}
                className="w-full accent-tertiary h-1.5 rounded-full bg-surface-container-high appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tertiary [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(233,196,0,0.4)]
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-on-tertiary
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-tertiary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-on-tertiary"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/50 mt-1 font-mono">
                <span>0</span>
                <span>10</span>
              </div>
              {savingsWithTrading && (
                <p className="text-tertiary text-xs mt-2 font-label">
                  Trading saves ~{savingsWithTrading}% of the effort
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Results panel */}
        <GlassCard className="lg:col-span-3 p-6 md:p-8">
          <h2 className="font-headline text-xl uppercase tracking-tight mb-6 text-on-surface flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-primary shrink-0" />
            Your Estimate
          </h2>

          {/* Hero stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Expected Cost
              </p>
              <p className="font-mono text-3xl md:text-4xl font-bold text-primary leading-none">
                {formatCurrency(results.expectedCost)}
              </p>
            </div>
            <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Packs Needed
              </p>
              <p className="font-mono text-3xl md:text-4xl font-bold text-on-surface leading-none">
                {formatNumber(results.expectedPacks)}
              </p>
            </div>
            <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Total Stickers Opened
              </p>
              <p className="font-mono text-2xl font-bold text-on-surface leading-none">
                {formatNumber(results.totalStickersCollected)}
              </p>
            </div>
            <div className="glass-panel rounded-xl border border-white/[0.08] p-5 text-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Duplicates
              </p>
              <p className="font-mono text-2xl font-bold text-secondary leading-none">
                {formatNumber(results.expectedDuplicates)}
              </p>
            </div>
          </div>

          {/* Completion milestones */}
          <div className="mb-2">
            <h3 className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-4">
              Cost by Completion Target
            </h3>
            <div className="space-y-3">
              {results.completionMilestones.map(({ fraction, packs, cost }) => {
                const percent = fraction * 100
                const widthPercent = Math.min(
                  (cost / results.expectedCost) * 100,
                  100,
                )
                return (
                  <div key={fraction}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="font-mono text-xs text-on-surface-variant">
                        {percent}%{' '}
                        <span className="text-on-surface-variant/50">
                          ({Math.floor(totalStickers * fraction)} stickers)
                        </span>
                      </span>
                      <span className="font-mono text-xs text-on-surface">
                        {formatNumber(packs)} packs &middot;{' '}
                        <span className="text-primary font-semibold">{formatCurrency(cost)}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${widthPercent}%`,
                          background:
                            percent <= 75
                              ? 'linear-gradient(90deg, #a0d494, #78a96e)'
                              : percent <= 95
                                ? 'linear-gradient(90deg, #e9c400, #c9a900)'
                                : 'linear-gradient(90deg, #ffb4aa, #e10211)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Progress visualization */}
      <GlassCard className="p-6 md:p-8">
        <h2 className="font-headline text-xl uppercase tracking-tight mb-6 text-on-surface flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-primary shrink-0" />
          Album Fill Rate
        </h2>
        <p className="text-on-surface-variant text-sm mb-6 max-w-xl">
          See how your album fills up as you buy more packs. The first packs feel great —
          but the last few stickers get exponentially harder to find.
        </p>

        <div className="space-y-4">
          {results.progressData.map(({ packs, unique, percentage }) => {
            const isComplete = percentage >= 99.5
            return (
              <div key={packs} className="group">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="font-mono text-xs text-on-surface-variant">
                    {formatNumber(packs)} packs
                    <span className="text-on-surface-variant/40 ml-1.5">
                      ({formatCurrency(packs * packPrice)})
                    </span>
                  </span>
                  <span className="font-mono text-xs">
                    <span className={isComplete ? 'text-primary font-bold' : 'text-on-surface'}>
                      {unique}
                    </span>
                    <span className="text-on-surface-variant/50">
                      /{totalStickers}
                    </span>
                    <span className="text-on-surface-variant ml-1.5">
                      {percentage.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-surface-container-high overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      background: isComplete
                        ? 'linear-gradient(90deg, #a0d494, #bcf0ae)'
                        : `linear-gradient(90deg, rgba(160,212,148,0.3), rgba(160,212,148,${0.3 + (percentage / 100) * 0.7}))`,
                    }}
                  >
                    {isComplete && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-on-primary">
                        DONE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Did You Know section */}
      <div>
        <SectionHeader className="mb-6">Did You Know?</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6 group" hover>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-lg" aria-hidden="true">
                  #
                </span>
              </div>
              <div>
                <h3 className="font-headline text-sm uppercase tracking-tight mb-1 text-on-surface">
                  The Pack Problem
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  An average collector needs <span className="text-primary font-mono font-semibold">~970 packs</span> to
                  complete a 700-sticker album. That is nearly 7x the album size in packs.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 group" hover>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                <span className="text-secondary text-lg" aria-hidden="true">
                  x2
                </span>
              </div>
              <div>
                <h3 className="font-headline text-sm uppercase tracking-tight mb-1 text-on-surface">
                  Duplicate Mountain
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  You will open roughly <span className="text-secondary font-mono font-semibold">~4,850 stickers</span> total — that
                  means <span className="text-secondary font-mono font-semibold">~4,150 duplicates</span>. Almost 6 out of every 7.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 group" hover>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center shrink-0">
                <span className="text-tertiary text-lg" aria-hidden="true">
                  %%
                </span>
              </div>
              <div>
                <h3 className="font-headline text-sm uppercase tracking-tight mb-1 text-on-surface">
                  Trade to Save
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Trading with just <span className="text-tertiary font-mono font-semibold">3 friends</span> reduces
                  your expected cost by roughly <span className="text-tertiary font-mono font-semibold">~35%</span>. The
                  more you trade, the less you spend.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Math explanation */}
      <GlassCard className="p-6 md:p-8">
        <h2 className="font-headline text-xl uppercase tracking-tight mb-4 text-on-surface flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-on-surface-variant shrink-0" />
          The Math
        </h2>
        <div className="text-on-surface-variant text-sm leading-relaxed space-y-3 max-w-2xl">
          <p>
            This calculator uses the{' '}
            <span className="text-on-surface font-semibold">Coupon Collector&apos;s Problem</span> from
            probability theory. The expected number of stickers to collect all{' '}
            <span className="font-mono text-primary">N</span> unique items is:
          </p>
          <div className="glass-panel rounded-xl border border-white/[0.08] p-4 font-mono text-xs md:text-sm text-on-surface text-center">
            E[stickers] = N &times; H(N) = N &times; (1 + 1/2 + 1/3 + ... + 1/N)
          </div>
          <p>
            For <span className="font-mono text-primary">{totalStickers}</span> stickers at{' '}
            <span className="font-mono text-primary">{stickersPerPack}</span> per pack, H({results.effectiveStickers}) ={' '}
            <span className="font-mono text-primary">{results.hN.toFixed(2)}</span>, giving{' '}
            <span className="font-mono text-primary">{formatNumber(results.expectedPacks)}</span> expected
            packs.
          </p>
          <p className="text-on-surface-variant/60 text-xs">
            Trading partners reduce the effective pool of stickers you need to find on your own,
            modeled here with diminishing returns per additional partner.
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
