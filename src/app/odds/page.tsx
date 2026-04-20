import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams, getMarketIntel } from '@/lib/data-service'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import AffiliateSlot from '@/components/monetization/AffiliateSlot'
import type { Team, MarketIntelData, ValueBet } from '@/lib/types'

export const revalidate = 300

const ogMeta = buildOGMeta({
  title: 'World Cup 2026 Odds Comparison — Latest Betting Lines | KickOracle',
  description:
    'Compare World Cup 2026 outright winner odds across Bet365, Betfair, William Hill, Betway & Unibet. AI-detected value bets, implied probabilities, and market movement updated every 5 minutes.',
  url: 'https://kickoracle.com/odds',
})

export const metadata: Metadata = {
  title: 'World Cup 2026 Odds Comparison — Latest Betting Lines | KickOracle',
  description:
    'Compare World Cup 2026 outright winner odds across Bet365, Betfair, William Hill, Betway & Unibet. AI-detected value bets, implied probabilities, and market movement updated every 5 minutes.',
  keywords:
    'World Cup 2026 odds, World Cup 2026 betting odds, World Cup 2026 outright winner odds, World Cup 2026 odds comparison, football betting odds 2026, World Cup value bets, best World Cup odds, FIFA World Cup 2026 sportsbook odds',
  alternates: { canonical: 'https://kickoracle.com/odds' },
  ...ogMeta,
}

const BOOKMAKERS = ['Bet365', 'Betfair', 'William Hill', 'Betway', 'Unibet'] as const

interface TeamWithOdds {
  team: Team
  intel: MarketIntelData
}

function getSignalBadge(strength: ValueBet['signalStrength']): {
  label: string
  variant: 'primary' | 'secondary' | 'tertiary'
} {
  switch (strength) {
    case 'strong':
      return { label: 'Strong Signal', variant: 'primary' }
    case 'moderate':
      return { label: 'Moderate Signal', variant: 'tertiary' }
    case 'weak':
      return { label: 'Weak Signal', variant: 'secondary' }
  }
}

function MovementIndicator({ movement }: { movement: MarketIntelData['movement'] }) {
  switch (movement) {
    case 'shortening':
      return (
        <span className="text-primary" aria-label="Odds shortening" title="Odds shortening (more money coming in)">
          &#9650;
        </span>
      )
    case 'drifting':
      return (
        <span className="text-secondary" aria-label="Odds drifting" title="Odds drifting (less interest)">
          &#9660;
        </span>
      )
    case 'stable':
      return (
        <span className="text-on-surface-variant" aria-label="Odds stable" title="Odds stable">
          &#9644;
        </span>
      )
  }
}

function ValueBetCard({ team, intel }: TeamWithOdds) {
  const vb = intel.valueBet
  if (!vb) return null

  const badge = getSignalBadge(vb.signalStrength)
  const edgePercent = (vb.edge * 100).toFixed(1)
  const isPositive = vb.edge > 0

  return (
    <GlassCard className="p-5 md:p-6 border-primary/30 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{team.flag}</span>
          <div>
            <Link href={`/teams/${team.slug}`} className="font-headline text-lg font-bold uppercase tracking-tight hover:text-primary transition-colors">
              {team.name}
            </Link>
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
              FIFA #{team.fifaRanking}
            </p>
          </div>
        </div>
        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">AI Model</p>
          <p className="font-mono text-lg font-bold text-primary">
            {(vb.ourProbability * 100).toFixed(1)}%
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Market</p>
          <p className="font-mono text-lg font-bold">
            {(vb.marketProbability * 100).toFixed(1)}%
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Edge</p>
          <p className={`font-mono text-lg font-bold ${isPositive ? 'text-primary' : 'text-secondary'}`}>
            {isPositive ? '+' : ''}{edgePercent}%
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Best Odds</p>
          <p className="font-mono text-lg font-bold">
            {vb.bestOdds.toFixed(2)}
          </p>
          <p className="font-label text-[10px] text-on-surface-variant">{vb.bestBookmaker}</p>
        </div>
      </div>
    </GlassCard>
  )
}

function OddsTableRow({ team, intel }: TeamWithOdds) {
  const oddsMap = new Map(intel.tournamentOdds.map((o) => [o.bookmaker, o]))

  return (
    <tr className="border-b border-white/5 hover:bg-surface-container-high transition-colors group">
      <td className="px-3 md:px-5 py-3 whitespace-nowrap">
        <Link href={`/teams/${team.slug}`} className="flex items-center gap-2.5">
          <span className="text-xl">{team.flag}</span>
          <div className="min-w-0">
            <span className="font-headline text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors block truncate">
              {team.name}
            </span>
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
              FIFA #{team.fifaRanking}
            </span>
          </div>
        </Link>
      </td>
      {BOOKMAKERS.map((bk) => {
        const odds = oddsMap.get(bk)
        return (
          <td key={bk} className="px-3 md:px-5 py-3 text-center whitespace-nowrap hidden sm:table-cell">
            <span className="font-mono text-sm">{odds ? odds.decimalOdds.toFixed(2) : '—'}</span>
          </td>
        )
      })}
      <td className="px-3 md:px-5 py-3 text-center whitespace-nowrap">
        <span className="font-mono text-sm font-bold">{intel.averageOdds.toFixed(2)}</span>
      </td>
      <td className="px-3 md:px-5 py-3 text-center whitespace-nowrap hidden md:table-cell">
        <span className="font-mono text-sm">{intel.impliedProbability.toFixed(1)}%</span>
      </td>
      <td className="px-3 md:px-5 py-3 text-center whitespace-nowrap">
        <MovementIndicator movement={intel.movement} />
      </td>
      <td className="px-3 md:px-5 py-3 text-center whitespace-nowrap hidden lg:table-cell">
        {intel.valueBet ? (
          <Badge
            variant={intel.valueBet.edge > 0 ? 'primary' : 'secondary'}
            size="sm"
          >
            {intel.valueBet.edge > 0 ? '+' : ''}
            {(intel.valueBet.edge * 100).toFixed(1)}%
          </Badge>
        ) : (
          <span className="text-on-surface-variant text-xs">—</span>
        )}
      </td>
    </tr>
  )
}

export default function OddsPage() {
  const teams = getAllTeams()

  const teamsWithOdds: TeamWithOdds[] = teams
    .map((team) => {
      const intel = getMarketIntel(team.slug)
      return intel ? { team, intel } : null
    })
    .filter((entry): entry is TeamWithOdds => entry !== null)
    .sort((a, b) => a.intel.averageOdds - b.intel.averageOdds)

  const valueBets = teamsWithOdds
    .filter((entry) => entry.intel.valueBet !== null && entry.intel.valueBet.signalStrength !== 'weak')
    .sort((a, b) => {
      const strengthOrder = { strong: 0, moderate: 1, weak: 2 }
      const aStrength = a.intel.valueBet?.signalStrength ?? 'weak'
      const bStrength = b.intel.valueBet?.signalStrength ?? 'weak'
      if (strengthOrder[aStrength] !== strengthOrder[bStrength]) {
        return strengthOrder[aStrength] - strengthOrder[bStrength]
      }
      return Math.abs(b.intel.valueBet?.edge ?? 0) - Math.abs(a.intel.valueBet?.edge ?? 0)
    })

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const jsonLdBreadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Odds', url: 'https://kickoracle.com/odds' },
  ])

  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'World Cup 2026 Odds Comparison — Latest Betting Lines',
    description:
      'Compare World Cup 2026 outright winner odds across major sportsbooks with AI-detected value bets.',
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'KickOracle',
      url: 'https://kickoracle.com',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />

      {/* ── Hero ── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[200px]" />
        <div className="absolute bottom-1/3 right-1/5 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[180px]" />
        <div className="absolute top-2/3 left-2/3 w-[400px] h-[400px] rounded-full bg-tertiary/5 blur-[160px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Updated Every 5 min</Badge>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase mt-4 mb-4">
            Betting<br />
            <span className="text-primary">Odds</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-4">
            Compare outright winner odds across 5 major sportsbooks for all 48 World Cup 2026 teams.
            AI-powered value detection highlights where the market diverges from our model.
          </p>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-8">
            Last updated: {lastUpdated} &middot; {teamsWithOdds.length} teams tracked
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/predictions"
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              AI Predictions
            </Link>
            <Link
              href="/power-rankings"
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:bg-surface-container-high transition-colors"
            >
              Power Rankings
            </Link>
          </div>
        </div>
      </section>

      {/* ── Value Bets ── */}
      {valueBets.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Value Bets
            </h2>
            <Badge variant="primary" size="sm">AI Detected</Badge>
          </div>
          <p className="text-on-surface-variant text-sm max-w-3xl mb-6">
            Teams where our AI probability model diverges significantly from the consensus market odds.
            A positive edge means our model rates the team higher than bookmakers do.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {valueBets.map(({ team, intel }) => (
              <ValueBetCard key={team.slug} team={team} intel={intel} />
            ))}
          </div>
        </section>
      )}

      {/* ── Odds Table ── */}
      <section className="max-w-[1440px] mx-auto px-6 mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight">
            Full Odds Table
          </h2>
          <Badge variant="outline" size="sm">{teamsWithOdds.length} Teams</Badge>
        </div>

        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-left min-w-[160px]">
                    Team
                  </th>
                  {BOOKMAKERS.map((bk) => (
                    <th
                      key={bk}
                      className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-center whitespace-nowrap hidden sm:table-cell"
                    >
                      {bk}
                    </th>
                  ))}
                  <th className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-center whitespace-nowrap">
                    Avg Odds
                  </th>
                  <th className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-center whitespace-nowrap hidden md:table-cell">
                    Impl. Prob.
                  </th>
                  <th className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-center whitespace-nowrap w-14">
                    Move
                  </th>
                  <th className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 md:px-5 py-3 text-center whitespace-nowrap hidden lg:table-cell">
                    Edge
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamsWithOdds.map(({ team, intel }) => (
                  <OddsTableRow key={team.slug} team={team} intel={intel} />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      {/* ── Methodology ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-6 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-headline text-xl md:text-2xl font-bold uppercase tracking-tight">
              How Odds Work
            </h2>
            <Badge variant="outline" size="sm">Methodology</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-on-surface-variant text-sm leading-relaxed">
            <div className="space-y-4">
              <div>
                <h3 className="font-label text-xs text-on-surface uppercase tracking-widest font-bold mb-1">
                  Decimal Odds
                </h3>
                <p>
                  Decimal odds represent the total payout per unit staked, including your original stake.
                  For example, odds of 6.00 mean a $10 bet returns $60 total ($50 profit + $10 stake)
                  if successful.
                </p>
              </div>
              <div>
                <h3 className="font-label text-xs text-on-surface uppercase tracking-widest font-bold mb-1">
                  Implied Probability
                </h3>
                <p>
                  The market&apos;s estimate of a team&apos;s chance of winning, derived from odds.
                  Calculated as 1 / decimal odds. Lower odds = higher implied probability. Note that the sum
                  of all implied probabilities exceeds 100% due to the bookmaker&apos;s margin (overround).
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-label text-xs text-on-surface uppercase tracking-widest font-bold mb-1">
                  Market Movement
                </h3>
                <p>
                  <span className="text-primary">&#9650; Shortening</span> means odds are decreasing (more money
                  backing this team).{' '}
                  <span className="text-secondary">&#9660; Drifting</span> means odds are increasing (less
                  market confidence).{' '}
                  <span>&#9644; Stable</span> means no significant change.
                </p>
              </div>
              <div>
                <h3 className="font-label text-xs text-on-surface uppercase tracking-widest font-bold mb-1">
                  Value Bets (AI Edge)
                </h3>
                <p>
                  Our AI model independently estimates each team&apos;s tournament win probability using
                  squad chemistry, form signals, and historical performance data. When our model&apos;s probability
                  diverges significantly from the market&apos;s implied probability, we flag it as a potential
                  value bet. A positive edge means our model is more bullish than the market.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.08]">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
              Disclaimer: Odds are for informational purposes only. KickOracle does not facilitate betting. Always gamble responsibly.
            </p>
          </div>
        </GlassCard>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 md:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AffiliateSlot id="betting" placement="odds-footer" context="outright-winner" />
          <AffiliateSlot id="insurance" placement="odds-footer" context="travel-insurance" />
        </div>
      </section>
    </>
  )
}
