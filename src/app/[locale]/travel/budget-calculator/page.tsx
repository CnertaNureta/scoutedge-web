'use client'

import { useState, useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { HOST_CITIES, type HostCity } from '@/data/cities-data'

const TICKET_PRICES: Record<string, number> = {
  'Group stage': 80,
  'Round of 32': 120,
  'Round of 16': 180,
  'Quarterfinal': 280,
  'Semifinal': 450,
  'Final': 900,
  'Third Place': 200,
}

const DAILY_FOOD_BY_LEVEL: Record<string, Record<string, number>> = {
  budget: { budget: 25, moderate: 35, expensive: 50 },
  moderate: { budget: 40, moderate: 55, expensive: 80 },
  luxury: { budget: 60, moderate: 90, expensive: 140 },
}

const DAILY_TRANSPORT = { budget: 10, moderate: 25, luxury: 50 }

const ACCOM_MULTIPLIER = { budget: 0.6, moderate: 1.0, luxury: 2.2 }

const FX_RATES: Record<string, number> = { USD: 1, MXN: 0.058, CAD: 0.74 }

function getCurrencyCode(city: HostCity): string {
  if (city.currency.startsWith('MXN')) return 'MXN'
  if (city.currency.startsWith('CAD')) return 'CAD'
  return 'USD'
}

function formatUSD(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`
}

export default function BudgetCalculatorPage() {
  const [citySlug, setCitySlug] = useState(HOST_CITIES[0].slug)
  const [days, setDays] = useState(7)
  const [accomLevel, setAccomLevel] = useState<'budget' | 'moderate' | 'luxury'>('moderate')
  const [ticketRound, setTicketRound] = useState('Group stage')
  const [ticketCount, setTicketCount] = useState(3)
  const [includeEsim, setIncludeEsim] = useState(true)

  const city = useMemo(() => HOST_CITIES.find((c) => c.slug === citySlug) ?? HOST_CITIES[0], [citySlug])
  const currencyCode = getCurrencyCode(city)
  const fxRate = FX_RATES[currencyCode] ?? 1

  const breakdown = useMemo(() => {
    const accomPerNight = city.accommodation.avgNightlyUsd * ACCOM_MULTIPLIER[accomLevel]
    const accommodation = accomPerNight * days

    const foodPerDay = DAILY_FOOD_BY_LEVEL[accomLevel]?.[city.food.priceLevel] ?? 50
    const food = foodPerDay * days

    const transportPerDay = DAILY_TRANSPORT[accomLevel]
    const transport = transportPerDay * days

    const tickets = (TICKET_PRICES[ticketRound] ?? 100) * ticketCount

    const esim = includeEsim ? 30 : 0

    const localCostUsd = accommodation + food + transport
    const totalUsd = localCostUsd + tickets + esim

    return {
      accommodation: Math.round(accommodation),
      food: Math.round(food),
      transport: Math.round(transport),
      tickets: Math.round(tickets),
      esim,
      total: Math.round(totalUsd),
      localCurrency: currencyCode !== 'USD' ? Math.round(localCostUsd / fxRate) : null,
      localCurrencyCode: currencyCode,
    }
  }, [city, days, accomLevel, ticketRound, ticketCount, includeEsim, currencyCode, fxRate])

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px] animate-float" />
        <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/6 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary">Trip Planning</Badge>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,6rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">Budget</span>
            <span className="block text-tertiary">Calculator</span>
          </h1>

          <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-6">
            Estimate your total trip cost for the 2026 World Cup. Adjust city, duration, and comfort level
            to plan your budget.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/travel/visa" className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm text-on-surface hover:border-white/20 transition-all">
              Visa Guide
            </Link>
            <Link href="/cities" className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-white/10 font-label text-sm text-on-surface hover:border-white/20 transition-all">
              Host Cities
            </Link>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h2 className="font-headline text-xl uppercase tracking-wide text-on-surface mb-6">
                Trip Details
              </h2>

              {/* City */}
              <div className="mb-5">
                <label htmlFor="city" className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-2">
                  Host City
                </label>
                <select
                  id="city"
                  value={citySlug}
                  onChange={(e) => setCitySlug(e.target.value)}
                  className="w-full bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface focus:border-primary/50 focus:outline-none transition-colors"
                >
                  {HOST_CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.countryCode === 'US' ? '🇺🇸' : c.countryCode === 'MX' ? '🇲🇽' : '🇨🇦'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Days */}
              <div className="mb-5">
                <label htmlFor="days" className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-2">
                  Duration: <span className="text-primary font-mono">{days} nights</span>
                </label>
                <input
                  id="days"
                  type="range"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between font-mono text-[10px] text-on-surface-variant mt-1">
                  <span>1</span><span>7</span><span>14</span><span>21</span><span>30</span>
                </div>
              </div>

              {/* Accommodation Level */}
              <div className="mb-5">
                <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-2">
                  Comfort Level
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['budget', 'moderate', 'luxury'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setAccomLevel(level)}
                      className={`px-3 py-2.5 rounded-xl border font-label text-xs uppercase tracking-wider transition-all ${
                        accomLevel === level
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-surface-container border-white/10 text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      {level === 'budget' ? '$' : level === 'moderate' ? '$$' : '$$$'}
                      <span className="block font-body text-[10px] mt-0.5 normal-case">{level}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets */}
              <div className="mb-5">
                <label htmlFor="ticketRound" className="font-label text-xs uppercase tracking-wider text-on-surface-variant block mb-2">
                  Match Tickets
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    id="ticketRound"
                    value={ticketRound}
                    onChange={(e) => setTicketRound(e.target.value)}
                    className="bg-surface-container-high border border-white/10 rounded-xl px-3 py-2.5 font-body text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                  >
                    {Object.keys(TICKET_PRICES).map((round) => (
                      <option key={round} value={round}>{round}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTicketCount(Math.max(0, ticketCount - 1))}
                      className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 font-mono text-on-surface hover:border-white/20 transition-all"
                      aria-label="Decrease tickets"
                    >
                      −
                    </button>
                    <span className="font-mono text-lg text-on-surface w-8 text-center">{ticketCount}</span>
                    <button
                      onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                      className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 font-mono text-on-surface hover:border-white/20 transition-all"
                      aria-label="Increase tickets"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* eSIM */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEsim}
                    onChange={(e) => setIncludeEsim(e.target.checked)}
                    className="w-5 h-5 rounded accent-primary"
                  />
                  <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                    Include eSIM data plan (~$30)
                  </span>
                </label>
              </div>
            </GlassCard>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            {/* Total */}
            <GlassCard className="p-8 border-l-4 border-l-primary">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">Estimated Total</span>
                <Badge variant="primary">{city.name}</Badge>
              </div>
              <div className="font-headline text-[clamp(3rem,6vw,5rem)] text-primary leading-none">
                {formatUSD(breakdown.total)}
              </div>
              <p className="font-body text-sm text-on-surface-variant mt-2">
                {days} nights · {accomLevel} comfort · {ticketCount} {ticketRound.toLowerCase()} ticket{ticketCount !== 1 ? 's' : ''}
              </p>
              {breakdown.localCurrency && (
                <p className="font-mono text-sm text-on-surface-variant mt-1">
                  ≈ {breakdown.localCurrency.toLocaleString()} {breakdown.localCurrencyCode} (local costs only, excl. tickets)
                </p>
              )}
            </GlassCard>

            {/* Breakdown */}
            <GlassCard className="p-6">
              <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-4">
                Cost Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Accommodation', amount: breakdown.accommodation, color: 'bg-primary' },
                  { label: 'Food & Dining', amount: breakdown.food, color: 'bg-tertiary' },
                  { label: 'Local Transport', amount: breakdown.transport, color: 'bg-[#60a5fa]' },
                  { label: `Tickets (${ticketCount}×)`, amount: breakdown.tickets, color: 'bg-secondary' },
                  ...(breakdown.esim > 0 ? [{ label: 'eSIM Data', amount: breakdown.esim, color: 'bg-on-surface-variant' }] : []),
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-label text-xs text-on-surface-variant">{item.label}</span>
                      <span className="font-mono text-sm text-on-surface">{formatUSD(item.amount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${Math.min(100, (item.amount / breakdown.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.08] mt-5 pt-4 flex justify-between items-center">
                <span className="font-label text-sm uppercase text-on-surface">Total</span>
                <span className="font-mono text-lg font-bold text-primary">{formatUSD(breakdown.total)}</span>
              </div>
            </GlassCard>

            {/* City Quick Info */}
            <GlassCard className="p-6">
              <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-4">
                {city.name} Quick Facts
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <span className="block font-mono text-lg text-on-surface">{city.currency.split(' ')[0]}</span>
                  <span className="font-label text-[10px] uppercase text-on-surface-variant">Currency</span>
                </div>
                <div className="text-center">
                  <span className="block font-mono text-lg text-on-surface">{city.food.tipPercentage}%</span>
                  <span className="font-label text-[10px] uppercase text-on-surface-variant">Tip</span>
                </div>
                <div className="text-center">
                  <span className="block font-mono text-lg text-on-surface">{city.weather.summerHighC}°C</span>
                  <span className="font-label text-[10px] uppercase text-on-surface-variant">Avg High</span>
                </div>
                <div className="text-center">
                  <span className="block font-mono text-lg text-on-surface">{city.safety.level}</span>
                  <span className="font-label text-[10px] uppercase text-on-surface-variant">Safety</span>
                </div>
              </div>
            </GlassCard>

            {/* Affiliate placeholders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="#" data-affiliate="hotels" className="block">
                <GlassCard hover className="p-5 text-center">
                  <span className="font-headline text-lg text-on-surface">🏨 Find Hotels</span>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Compare rates in {city.name}</p>
                </GlassCard>
              </a>
              <a href="#" data-affiliate="esim" className="block">
                <GlassCard hover className="p-5 text-center">
                  <span className="font-headline text-lg text-on-surface">📱 Get eSIM</span>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Stay connected across 3 countries</p>
                </GlassCard>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <p className="font-body text-xs text-on-surface-variant/60 text-center">
          Estimates are approximate and based on average costs as of early 2026. Actual prices may vary based on
          demand, exchange rates, and booking timing. Ticket prices are estimated face-value ranges and may differ
          from official FIFA pricing. This is an unofficial fan guide.
        </p>
      </section>
    </>
  )
}
