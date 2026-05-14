import type { MatchFixture } from '@/lib/types'
import { getTeamBySlug } from '@/lib/data-service'
import { getTeamColors } from '@/lib/team-colors'
import ProbabilityBar from '@/components/ui/ProbabilityBar'
import SectionHeader from '@/components/ui/SectionHeader'
import { SURFACE } from '@/lib/brand-tokens'
import { getLocale, getTranslations } from 'next-intl/server'

interface MatchScheduleProps {
  fixtures: MatchFixture[]
  teamSlug: string
}

function formatDate(utc: string, locale: string): { date: string; time: string } {
  const d = new Date(utc)
  const date = d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  return { date, time }
}

export default async function MatchSchedule({ fixtures, teamSlug }: MatchScheduleProps) {
  if (fixtures.length === 0) return null

  const locale = await getLocale()
  const t = await getTranslations('teamSchedule')
  const colors = getTeamColors(teamSlug)
  const team = getTeamBySlug(teamSlug)

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <SectionHeader className="mb-8">{t('groupStageSchedule')}</SectionHeader>

      <div className="relative" role="list" aria-label={`${team?.name ?? teamSlug} group stage matches`}>
        {/* Vertical timeline line */}
        <div
          className="absolute left-4 md:left-6 top-0 bottom-0 w-[2px] rounded-full"
          style={{
            background: `linear-gradient(to bottom, ${colors.primary}60, ${colors.primary}20, transparent)`,
          }}
          aria-hidden="true"
        />

        <div className="space-y-6">
          {fixtures.map((fixture, idx) => {
            const { date, time } = formatDate(fixture.kickoffUtc, locale)
            const isHome = fixture.homeTeamSlug === teamSlug
            const opponent = getTeamBySlug(isHome ? fixture.awayTeamSlug : fixture.homeTeamSlug)
            const opponentColors = getTeamColors(isHome ? fixture.awayTeamSlug : fixture.homeTeamSlug)

            const winProb = isHome ? fixture.homeWinProb : fixture.awayWinProb
            const drawProb = fixture.drawProb
            const loseProb = isHome ? fixture.awayWinProb : fixture.homeWinProb

            return (
              <div key={idx} className="relative pl-12 md:pl-16" role="listitem">
                {/* Timeline dot */}
                <div
                  className="absolute left-[10px] md:left-[18px] top-6 w-3 h-3 rounded-full border-2 z-10"
                  style={{
                    borderColor: colors.primary,
                    backgroundColor: SURFACE.background,
                  }}
                  aria-hidden="true"
                />

                {/* Match card */}
                <div
                  data-testid="match-card"
                  className="rounded-2xl border p-5 md:p-6 transition-all duration-300 hover:border-opacity-40"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${colors.primary} 3%, ${SURFACE.surfaceContainer})`,
                    borderColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  }}
                >
                  {/* Round + Date */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className="font-label text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border"
                      style={{
                        color: colors.glow,
                        borderColor: `${colors.primary}30`,
                        backgroundColor: `${colors.primary}10`,
                      }}
                    >
                      {fixture.round}
                    </span>
                    <span data-testid="match-kickoff" className="font-label text-xs text-on-surface-variant">{date}</span>
                    <span className="font-mono text-xs text-on-surface-variant/60">{time}</span>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{team?.flag}</span>
                      <span className="font-headline text-lg tracking-wide">
                        {team?.name}
                      </span>
                    </div>
                    <span className="font-label text-xs text-on-surface-variant/60 uppercase tracking-widest px-3">
                      vs
                    </span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="font-headline text-lg tracking-wide text-right">
                        {opponent?.name ?? (isHome ? fixture.awayTeamSlug : fixture.homeTeamSlug)}
                      </span>
                      <span className="text-2xl">{opponent?.flag}</span>
                    </div>
                  </div>

                  {/* Venue */}
                  <p data-testid="match-venue" className="font-label text-xs text-on-surface-variant mb-4">
                    {fixture.venue} &middot; {fixture.city}
                  </p>

                  {/* Win probability */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="font-headline text-lg" style={{ color: colors.glow }}>
                        {Math.round(winProb * 100)}%
                      </span>
                      <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Win</span>
                    </div>
                    <div>
                      <span className="font-headline text-lg text-on-surface-variant">
                        {Math.round(drawProb * 100)}%
                      </span>
                      <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Draw</span>
                    </div>
                    <div>
                      <span className="font-headline text-lg" style={{ color: opponentColors.glow }}>
                        {Math.round(loseProb * 100)}%
                      </span>
                      <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Lose</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
