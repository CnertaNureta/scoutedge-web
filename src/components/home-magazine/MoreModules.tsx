'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useCountdown } from '@/hooks/useCountdown'
import { Flag, PhotoPlaceholder, TEAMS } from './visual-system'

// ── DAILY BRIEFING + NEWSLETTER (merged) ──────
export interface BriefingLeadStoryProp {
  eyebrow: string
  headline: string
  body: string
  author: string
  readMinutes: number
}

export interface BriefingQuickStoryProp {
  tag: string
  headline: string
  body: string
  readMinutes: number
}

interface DailyBriefingModuleProps {
  newsletterSlot?: ReactNode
  leadStory?: BriefingLeadStoryProp
  quickStories?: BriefingQuickStoryProp[]
}

const DEMO_LEAD: BriefingLeadStoryProp = {
  eyebrow: 'EDITORIAL · GROUP D PREVIEW',
  headline: "Brazil's reckoning with the press.",
  body: "Eight months ago, Brazil were a fourth-place embarrassment. Tonight they walk in as favourites against the reigning champions. The press did it — not the names you'd guess.",
  author: 'BY M. RIBEIRO',
  readMinutes: 8,
}

const DEMO_QUICK: BriefingQuickStoryProp[] = [
  { tag: 'INJURY · BRA', headline: 'Vinícius cleared for tonight.', body: 'Medical team signs off on the hamstring — minutes will be managed.', readMinutes: 2 },
  { tag: 'TACTICS · ARG', headline: 'Scaloni hints at a back three.', body: 'Bench leaks suggest a press-resistant midfield rotation for the second half.', readMinutes: 5 },
  { tag: 'WEATHER · ATL', headline: 'Storm cell pushed to Wednesday.', body: 'Kick-off dry, 22°C, 8 mph crosswind. Crossing teams benefit.', readMinutes: 1 },
]

export function DailyBriefingModule({
  newsletterSlot,
  leadStory,
  quickStories,
}: DailyBriefingModuleProps = {}) {
  const t = useTranslations('magazine.briefing')
  const lead = leadStory ?? DEMO_LEAD
  const stories = (quickStories && quickStories.length > 0 ? quickStories : DEMO_QUICK).map((s) => ({
    tag: s.tag,
    h: s.headline,
    b: s.body,
    t: `${s.readMinutes} min`,
  }))
  return (
    <div data-testid="more-modules" style={{ width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--cream)', padding: 48, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>{t('sectionLabel')}</div>
          <div className="ko-display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--green)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="ko-mono ko-muted" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{t('editionLabel', { n: 187 })}</div>
          <div className="ko-mono ko-muted" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{t('editionDate')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 18 }}>
        {/* Lead story */}
        <Link href="/daily-briefing" className="ko-card" style={{ background: 'var(--soft)', borderColor: 'var(--line-strong)', padding: 0, overflow: 'hidden', position: 'relative', display: 'block', color: 'inherit', textDecoration: 'none' }}>
          <PhotoPlaceholder caption="[locker room · pre-match]" noCaption className="no-caption" src="/images/kick-oracle/briefing-lead.jpg" alt="Pre-match locker room atmosphere" style={{ height: 340, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(15,26,19,0.95) 100%)' }} />
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
              <span className="ko-strike ko-label" style={{ fontSize: 9 }}>{t('leadBadge')}</span>
            </div>
            <div className="ko-display" style={{ position: 'absolute', right: 20, top: 14, fontSize: 100, fontStyle: 'italic', color: 'rgba(243,201,105,0.2)', lineHeight: 1 }}>01</div>
          </PhotoPlaceholder>
          <div style={{ padding: 26 }}>
            <div className="ko-eyebrow" style={{ color: 'var(--green)', marginBottom: 12 }}>{lead.eyebrow}</div>
            <div className="ko-display" style={{ fontSize: 38, lineHeight: 1, marginBottom: 14 }}>
              {lead.headline}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>
              {lead.body}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-2)' }} />
              <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.18em' }}>{t('byLineTemplate', { author: lead.author, minutes: lead.readMinutes })}</div>
              <div style={{ flex: 1 }} />
              <span className="ko-label ko-gold" style={{ fontSize: 11 }}>{t('readCta')}</span>
            </div>
          </div>
        </Link>

        {/* Quick stories spanning 2 columns */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {stories.map((s, i) => (
            <div key={s.h} className="ko-card" style={{ padding: 22, display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 18, alignItems: 'center', background: 'var(--surface)' }}>
              <div className="ko-display" style={{ fontSize: 44, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>0{i + 2}</div>
              <div>
                <div className="ko-mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--green)', marginBottom: 6 }}>{s.tag}</div>
                <div className="ko-display" style={{ fontSize: 22, lineHeight: 1.05, marginBottom: 6 }}>{s.h}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.75 }}>{s.b}</p>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'flex-start' }}>
                <div className="ko-mono ko-muted" style={{ fontSize: 9, letterSpacing: '0.16em' }}>{s.t.toUpperCase()}</div>
                <span className="ko-label ko-gold" style={{ fontSize: 11, marginTop: 8, display: 'inline-block' }}>{t('readCta')}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: newsletterSlot ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Link href="/daily-briefing" className="ko-card" style={{ padding: 16, background: 'transparent', borderStyle: 'dashed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
              <span className="ko-mono ko-muted" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{t('moreThisWeek')}</span>
              <span className="ko-label ko-gold" style={{ fontSize: 11 }}>{t('archiveCta')}</span>
            </Link>
            {/* Newsletter CTA (right-side slot preserved from original design) */}
            <div
              style={{
                background: 'var(--green)',
                color: 'var(--ink)',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="ko-eyebrow" style={{ color: 'var(--ink)', opacity: 0.65, marginBottom: 12 }}>
                {t('newsletterEyebrow')}
              </div>
              <div className="ko-display" style={{ fontSize: 28, lineHeight: 0.92, color: 'var(--ink)' }}>
                {t('newsletterTitleLine1')}
                <br />
                <em>{t('newsletterTitleEm')}</em>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                {newsletterSlot ?? (
                  <div style={{ display: 'flex', border: '2px solid var(--ink)' }}>
                    <input
                      type="email"
                      placeholder={t('subscribeEmailPlaceholder')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: 0,
                        background: 'transparent',
                        fontFamily: 'var(--f-body)',
                        fontSize: 13,
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                    <button className="ko-btn" style={{ background: 'var(--ink)', color: 'var(--green)', padding: '10px 16px', fontSize: 11 }}>
                      {t('subscribeCta')}
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14, marginTop: 12, color: 'var(--ink)', opacity: 0.72 }}>
                  <BriefingStat v="187" l={t('statEditions')} />
                  <BriefingStat v="42K" l={t('statReaders')} />
                  <BriefingStat v="4.8" l={t('statRating')} />
                </div>
              </div>
              <div
                className="ko-display"
                style={{
                  position: 'absolute',
                  left: -10,
                  bottom: -60,
                  fontSize: 160,
                  fontStyle: 'italic',
                  color: 'rgba(10,13,10,0.06)',
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}
              >
                26
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BriefingStat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{v}</div>
      <div className="ko-mono" style={{ fontSize: 9, marginTop: 3, letterSpacing: '0.18em' }}>{l.toUpperCase()}</div>
    </div>
  )
}

// ── SCHEDULE TIMELINE ──────────────────────────
export interface WeekDayProp {
  day: string
  date: string
  count: number
  today: boolean
  monthShort?: string
  weekdayFull?: string
}

export interface TodayFixtureProp {
  time: string
  homeName: string
  homeColors: [string, string, string]
  awayName: string
  awayColors: [string, string, string]
  group: string
  note: string
  featured?: boolean
}

export interface CountdownProp {
  days: string
  hours: string
  minutes: string
  seconds: string
}

export interface NextKickoffProp {
  homeCode: string
  awayCode: string
  hoursUntil: number
  minutesUntil: number
}

interface ScheduleModuleProps {
  weekDays?: WeekDayProp[]
  /** Per-day fixtures, indexed 0–6 aligned with `weekDays`. */
  fixturesByDay?: TodayFixtureProp[][]
  /** Fallback "today" list when `fixturesByDay` is absent. */
  todayFixtures?: TodayFixtureProp[]
  /** Initial selected day index. Defaults to whichever weekDay is `today`. */
  todayIndex?: number
  /** SSR-seed countdown values (used until the ticking hook takes over). */
  countdown?: CountdownProp
  /** ISO for the target moment the countdown ticks toward. */
  countdownTargetIso?: string
  nextKickoff?: NextKickoffProp
}

const DEFAULT_COUNTDOWN_TARGET_ISO = '2026-07-19T20:00:00-04:00'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const DEMO_DAYS: WeekDayProp[] = [
  { day: 'MON', date: '11', count: 0, today: false },
  { day: 'TUE', date: '12', count: 4, today: true },
  { day: 'WED', date: '13', count: 3, today: false },
  { day: 'THU', date: '14', count: 4, today: false },
  { day: 'FRI', date: '15', count: 2, today: false },
  { day: 'SAT', date: '16', count: 4, today: false },
  { day: 'SUN', date: '17', count: 3, today: false },
]

const DEMO_FIXTURES: TodayFixtureProp[] = [
  { time: '16:00', homeName: 'England', homeColors: TEAMS.ENG.colors, awayName: 'Netherlands', awayColors: TEAMS.NED.colors, group: 'B', note: 'Wembley · Group decider' },
  { time: '18:30', homeName: 'France', homeColors: TEAMS.FRA.colors, awayName: 'Japan', awayColors: TEAMS.JPN.colors, group: 'C', note: 'Mbappé fitness watch' },
  { time: '21:00', homeName: 'Brazil', homeColors: TEAMS.BRA.colors, awayName: 'Argentina', awayColors: TEAMS.ARG.colors, group: 'D', note: "★ Tonight's pick", featured: true },
  { time: '23:30', homeName: 'USA', homeColors: TEAMS.USA.colors, awayName: 'Portugal', awayColors: TEAMS.POR.colors, group: 'F', note: 'Cristiano milestone' },
]

const DEMO_COUNTDOWN: CountdownProp = { days: '68', hours: '14', minutes: '32', seconds: '07' }

export function ScheduleModule({
  weekDays,
  fixturesByDay,
  todayFixtures,
  todayIndex,
  countdown,
  countdownTargetIso,
  nextKickoff,
}: ScheduleModuleProps = {}) {
  const t = useTranslations('magazine.calendar')
  const days = weekDays && weekDays.length > 0 ? weekDays : DEMO_DAYS
  const initialDayIndex = (() => {
    if (typeof todayIndex === 'number' && todayIndex >= 0 && todayIndex < days.length) {
      return todayIndex
    }
    const idx = days.findIndex((d) => d.today)
    return idx >= 0 ? idx : 0
  })()
  const [selectedDay, setSelectedDay] = useState<number>(initialDayIndex)

  // Build per-day buckets. If the caller passed `fixturesByDay`, use it; else
  // place the legacy `todayFixtures` on the selected day and leave the others
  // empty so the UI doesn't lie about other days.
  const buckets: TodayFixtureProp[][] = useMemo(() => {
    if (fixturesByDay && fixturesByDay.length === days.length) return fixturesByDay
    const fallback: TodayFixtureProp[][] = Array.from({ length: days.length }, () => [])
    const todayList =
      todayFixtures && todayFixtures.length > 0 ? todayFixtures : DEMO_FIXTURES
    fallback[initialDayIndex] = todayList
    return fallback
  }, [fixturesByDay, days.length, todayFixtures, initialDayIndex])

  const fixtures = buckets[selectedDay] ?? []

  // SSR-seeded ticking countdown. The seed is used implicitly: `useCountdown`
  // computes from `Date.now()` at first render so the SSR HTML and the client
  // hydration match within ~one second drift.
  const targetIso = countdownTargetIso ?? DEFAULT_COUNTDOWN_TARGET_ISO
  const live = useCountdown(targetIso)
  const countdownVals: CountdownProp = {
    days: String(live.days),
    hours: pad2(live.hours),
    minutes: pad2(live.minutes),
    seconds: pad2(live.seconds),
  }

  const selectedDayInfo = days[selectedDay] ?? days[initialDayIndex]
  const isTodaySelected = selectedDay === initialDayIndex && selectedDayInfo?.today
  const weekdayLabel = (selectedDayInfo?.weekdayFull ?? selectedDayInfo?.day ?? '').toUpperCase()
  const monthLabel = (selectedDayInfo?.monthShort ?? '').toUpperCase()
  const dateLabel = selectedDayInfo?.date ?? ''
  const fixturesLabel =
    fixtures.length === 0
      ? t('fixtureCountZero')
      : fixtures.length === 1
        ? t('fixtureCountOne')
        : t('fixtureCountOther', { count: fixtures.length })
  const eyebrowParts = [
    isTodaySelected ? t('todayPrefix') : null,
    [weekdayLabel, dateLabel, monthLabel].filter(Boolean).join(' '),
    fixturesLabel,
  ].filter(Boolean)
  const eyebrowText = eyebrowParts.join(' · ')

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--cream)', padding: 48, position: 'relative', overflow: 'hidden' }}>
      <div className="ko-pitch-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>{t('sectionLabel')}</div>
          <div className="ko-display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--gold)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ko-mono ko-muted" style={{ fontSize: 11, letterSpacing: '0.18em', textAlign: 'right' }}>
            {t('finalLine1')}<br />{t('finalLine2')}
          </div>
          <Link href="/schedule" className="ko-btn ko-btn-ghost">{t('fullCalendarCta')}</Link>
        </div>
      </div>

      {/* Countdown header strip */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
        {[
          { v: countdownVals.days, l: t('countdownDays') },
          { v: countdownVals.hours, l: t('countdownHours') },
          { v: countdownVals.minutes, l: t('countdownMinutes') },
          { v: countdownVals.seconds, l: t('countdownSeconds') },
        ].map((b, i) => (
          <div
            key={b.l}
            style={{
              position: 'relative',
              padding: '22px 20px',
              background: i === 0 ? 'var(--green)' : 'rgba(15,26,19,0.7)',
              color: i === 0 ? 'var(--ink)' : 'var(--cream)',
              border: i === 0 ? '0' : '1px solid var(--line-strong)',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 72, lineHeight: 0.85, letterSpacing: '-0.02em' }}>{b.v}</div>
            <div className="ko-mono" style={{ fontSize: 9, marginTop: 10, letterSpacing: '0.22em', opacity: i === 0 ? 0.72 : 0.6 }}>
              {b.l.toUpperCase()}
            </div>
            <div
              className="ko-display"
              style={{
                position: 'absolute',
                bottom: 10,
                right: 14,
                fontSize: 28,
                fontStyle: 'italic',
                color: i === 0 ? 'rgba(10,13,10,0.15)' : 'rgba(243,201,105,0.15)',
                lineHeight: 1,
              }}
            >
              0{i + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Next kick-off reminder strip */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'rgba(168,224,99,0.08)',
          border: '1px dashed var(--green)',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="ko-tick" />
          <div>
            <div className="ko-label" style={{ fontSize: 12, color: 'var(--green)' }}>{t('nextKickoffLabel')}</div>
            <div className="ko-display" style={{ fontSize: 22, fontStyle: 'italic', marginTop: 4 }}>
              {nextKickoff
                ? t('nextKickoffTemplate', {
                    home: nextKickoff.homeCode,
                    away: nextKickoff.awayCode,
                    hours: nextKickoff.hoursUntil,
                    minutes: nextKickoff.minutesUntil,
                  })
                : t('nextKickoffPlaceholder')}
            </div>
          </div>
        </div>
        <Link href="/predict" className="ko-btn ko-btn-ghost">{t('setReminderCta')}</Link>
      </div>

      {/* Week strip */}
      <div className="ko-eyebrow ko-muted" style={{ marginBottom: 10 }}>{t('thisWeekLabel')}</div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 22 }}>
        {days.map((d, idx) => {
          const isSelected = idx === selectedDay
          return (
            <button
              key={d.date + '-' + idx}
              type="button"
              onClick={() => setSelectedDay(idx)}
              style={{
                padding: '14px 12px',
                border: '1px solid var(--line)',
                background: isSelected ? 'var(--green)' : 'var(--surface)',
                color: isSelected ? 'var(--ink)' : 'var(--cream)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
              }}
              aria-pressed={isSelected}
              aria-label={`Show fixtures for ${d.day} ${d.date}`}
            >
              <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.2em', opacity: isSelected ? 0.7 : 0.5 }}>{d.day}</div>
              <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 32, lineHeight: 1 }}>{d.date}</div>
              <div className="ko-mono" style={{ fontSize: 10, opacity: isSelected ? 0.7 : 0.55 }}>
                {d.count === 0
                  ? t('restDay')
                  : d.count === 1
                    ? t('fixtureCountOne')
                    : t('fixtureCountOther', { count: d.count })}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <div className="ko-eyebrow ko-green" style={{ marginBottom: 16 }}>{eyebrowText}</div>
        {fixtures.length === 0 ? (
          <div
            style={{
              padding: '32px 24px',
              border: '1px dashed var(--line)',
              background: 'rgba(168,224,99,0.04)',
              textAlign: 'center',
            }}
          >
            <div className="ko-display" style={{ fontSize: 28, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>
              {t('restDayTitle')}
            </div>
            <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em', marginTop: 10 }}>
              {t('restDayHint')}
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fixtures.map((f, i) => (
            <Link
              key={i}
              href="/predict"
              style={{
                padding: '16px 24px',
                background: f.featured ? 'rgba(168,224,99,0.08)' : 'var(--surface)',
                border: f.featured ? '1px solid var(--green)' : '1px solid var(--line)',
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr 40px 1fr 1fr 1fr 100px',
                alignItems: 'center',
                gap: 14,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <div className="ko-label" style={{ fontSize: 14, color: f.featured ? 'var(--green)' : 'var(--cream)' }}>{f.time}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                <span className="ko-label" style={{ fontSize: 13 }}>{f.homeName.toUpperCase()}</span>
                <Flag colors={f.homeColors} style={{ width: 26, height: 18 }} />
              </div>
              <div></div>
              <div className="ko-display" style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--muted)', textAlign: 'center' }}>vs</div>
              <div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flag colors={f.awayColors} style={{ width: 26, height: 18 }} />
                <span className="ko-label" style={{ fontSize: 13 }}>{f.awayName.toUpperCase()}</span>
              </div>
              <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: f.featured ? 'var(--gold)' : 'rgba(245,239,228,0.6)' }}>
                {t('groupNoteTemplate', { group: f.group, note: f.note.toUpperCase() })}
              </div>
              <span className="ko-label ko-gold" style={{ fontSize: 11, textAlign: 'right' }}>{t('predictCta')}</span>
            </Link>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}

// ── COMPARE TEAMS ─────────────────────────
/**
 * Stat row passed into the Compare module. Values may be `null` when the
 * underlying metric isn't wired yet — the renderer draws an em-dash and a
 * flat 50% bar so the cell is visibly inert instead of fake.
 */
export interface CompareStat {
  label: string
  a: number | null
  b: number | null
  format?: 'pct' | 'rating' | 'count'
}

export interface CompareTeamProp {
  name: string
  code: string
  colors: [string, string, string]
  slug?: string
}

interface CompareModuleProps {
  teamA?: CompareTeamProp
  teamB?: CompareTeamProp
  stats?: CompareStat[]
}

const DEMO_COMPARE_A: CompareTeamProp = { name: 'Brazil', code: 'BRA', colors: TEAMS.BRA.colors, slug: 'brazil' }
const DEMO_COMPARE_B: CompareTeamProp = { name: 'Argentina', code: 'ARG', colors: TEAMS.ARG.colors, slug: 'argentina' }

function formatStat(value: number | null, format: CompareStat['format']): string {
  if (value === null || Number.isNaN(value)) return '—'
  switch (format) {
    case 'pct':
      return `${Math.round(value)}%`
    case 'rating':
      return value.toFixed(1)
    case 'count':
    default:
      return `${Math.round(value)}`
  }
}

// Stats fall back to these placeholder rows when no real per-team data has
// been wired. They MIRROR the eight slots in the design but render `—` and a
// flat 50/50 bar so the surface is honest about missing data.
const DEMO_STATS: CompareStat[] = [
  { label: 'Elo Rating', a: null, b: null, format: 'rating' },
  { label: 'Goals / 90', a: null, b: null, format: 'rating' },
  { label: 'xG / 90', a: null, b: null, format: 'rating' },
  { label: 'Possession %', a: null, b: null, format: 'pct' },
  { label: 'Press Intensity', a: null, b: null, format: 'rating' },
  { label: 'Pass Accuracy %', a: null, b: null, format: 'pct' },
  { label: 'Clean Sheets · 10', a: null, b: null, format: 'count' },
  { label: 'Aerial Win %', a: null, b: null, format: 'pct' },
]

export function CompareModule({ teamA, teamB, stats: statsProp }: CompareModuleProps = {}) {
  const t = useTranslations('magazine.compare')
  const a = teamA ?? DEMO_COMPARE_A
  const b = teamB ?? DEMO_COMPARE_B
  const stats = statsProp && statsProp.length > 0 ? statsProp : DEMO_STATS
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--cream)', padding: 48, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>{t('sectionLabel')}</div>
          <div className="ko-display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--green)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <Link href="/compare" className="ko-btn ko-btn-ghost">{t('compareAnyCta')}</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 24 }}>
        <div style={{ position: 'relative', overflow: 'hidden', padding: 28, background: 'linear-gradient(135deg, rgba(0,156,59,0.18) 0%, var(--soft) 70%)', borderLeft: '3px solid var(--green)' }}>
          <PhotoPlaceholder caption="[BRA · team]" noCaption className="no-caption" src="/images/kick-oracle/compare-bra.jpg" alt="Brazil team backdrop" style={{ position: 'absolute', inset: 0, opacity: 0.18 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <Flag colors={a.colors} style={{ width: 44, height: 30 }} />
              <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 28 }}>{a.name.toUpperCase()}</div>
              <span className="ko-strike ko-label" style={{ fontSize: 9, marginLeft: 'auto' }}>{t('rankedBadge')}</span>
            </div>
            <div className="ko-display" style={{ fontSize: 36, lineHeight: 1, fontStyle: 'italic', color: 'var(--gold)' }}>{t('teamACharacter')}</div>
            <p style={{ fontSize: 13, marginTop: 10, opacity: 0.8, maxWidth: 400 }}>
              {t('teamACharacterBody')}
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden', padding: 28, background: 'linear-gradient(225deg, rgba(117,170,219,0.20) 0%, var(--soft) 70%)', borderRight: '3px solid var(--gold)', textAlign: 'right' }}>
          <PhotoPlaceholder caption="[ARG · team]" noCaption className="no-caption" src="/images/kick-oracle/compare-arg.jpg" alt="Argentina team backdrop" style={{ position: 'absolute', inset: 0, opacity: 0.18 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexDirection: 'row-reverse' }}>
              <Flag colors={b.colors} style={{ width: 44, height: 30 }} />
              <div style={{ fontFamily: 'var(--f-condensed)', fontWeight: 900, fontSize: 28 }}>{b.name.toUpperCase()}</div>
              <span className="ko-label" style={{ padding: '4px 10px', background: 'var(--gold)', color: 'var(--ink)' }}>{t('challengerBadge')}</span>
            </div>
            <div className="ko-display" style={{ fontSize: 36, lineHeight: 1, fontStyle: 'italic', color: 'var(--gold)' }}>{t('teamBCharacter')}</div>
            <p style={{ fontSize: 13, marginTop: 10, opacity: 0.8, marginLeft: 'auto', maxWidth: 400 }}>
              {t('teamBCharacterBody')}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {stats.map((s) => {
          const hasBoth = s.a !== null && s.b !== null
          const total = hasBoth ? (s.a as number) + (s.b as number) : 0
          // When real values are missing, render flat 50/50 bars + em-dashes.
          const pa = hasBoth && total > 0 ? ((s.a as number) / total) * 100 : 50
          const pb = 100 - pa
          const aWins = hasBoth ? (s.a as number) > (s.b as number) : false
          const bWins = hasBoth ? (s.b as number) > (s.a as number) : false
          return (
            <Fragment key={s.label}>
              <div style={{ padding: '12px 20px', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, borderLeft: aWins ? '2px solid var(--green)' : '2px solid transparent' }}>
                <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', position: 'relative' }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${pa}%`, background: aWins ? 'var(--green)' : 'var(--muted)' }} />
                </div>
                <div className="ko-label" style={{ fontSize: 18, color: aWins ? 'var(--green)' : 'var(--cream)', minWidth: 80, textAlign: 'right' }}>{formatStat(s.a, s.format)}</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.16em', minWidth: 130, textAlign: 'right' }}>{s.label.toUpperCase()}</div>
              </div>
              <div style={{ padding: '12px 20px', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, borderRight: bWins ? '2px solid var(--gold)' : '2px solid transparent' }}>
                <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.16em', minWidth: 130 }}>{s.label.toUpperCase()}</div>
                <div className="ko-label" style={{ fontSize: 18, color: bWins ? 'var(--gold)' : 'var(--cream)', minWidth: 80 }}>{formatStat(s.b, s.format)}</div>
                <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pb}%`, background: bWins ? 'var(--gold)' : 'var(--muted)' }} />
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ── GROUP STANDINGS ────────────────────────
export interface GroupStandingTeamProp {
  slug: string
  name: string
  code: string
  colors: [string, string, string]
  w: number
  d: number
  l: number
  gd: string
  pts: number
}

export interface GroupStandingProp {
  id: string
  matchday: number
  totalMatchdays: number
  isFeatured?: boolean
  teams: GroupStandingTeamProp[]
}

interface GroupStandingsModuleProps {
  groups?: GroupStandingProp[]
  selectedGroupIds?: [string, string]
}

const DEMO_GROUPS: GroupStandingProp[] = [
  {
    id: 'B',
    matchday: 2,
    totalMatchdays: 3,
    teams: [
      { slug: 'england', name: 'England', code: 'ENG', colors: TEAMS.ENG.colors, w: 2, d: 0, l: 0, gd: '+5', pts: 6 },
      { slug: 'netherlands', name: 'Netherlands', code: 'NED', colors: TEAMS.NED.colors, w: 1, d: 1, l: 0, gd: '+2', pts: 4 },
      { slug: 'usa', name: 'USA', code: 'USA', colors: TEAMS.USA.colors, w: 0, d: 1, l: 1, gd: '-1', pts: 1 },
      { slug: 'japan', name: 'Japan', code: 'JPN', colors: TEAMS.JPN.colors, w: 0, d: 0, l: 2, gd: '-6', pts: 0 },
    ],
  },
  {
    id: 'D',
    matchday: 2,
    totalMatchdays: 3,
    isFeatured: true,
    teams: [
      { slug: 'brazil', name: 'Brazil', code: 'BRA', colors: TEAMS.BRA.colors, w: 2, d: 0, l: 0, gd: '+7', pts: 6 },
      { slug: 'argentina', name: 'Argentina', code: 'ARG', colors: TEAMS.ARG.colors, w: 1, d: 1, l: 0, gd: '+3', pts: 4 },
      { slug: 'germany', name: 'Germany', code: 'GER', colors: TEAMS.GER.colors, w: 0, d: 1, l: 1, gd: '-2', pts: 1 },
      { slug: 'spain', name: 'Spain', code: 'ESP', colors: TEAMS.ESP.colors, w: 0, d: 0, l: 2, gd: '-8', pts: 0 },
    ],
  },
]

// 2026 World Cup runs Groups A–L (48 teams · 12 groups). The current data may
// only emit a subset; show A–H by default and add any extra letters present.
const BASE_SELECTOR_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function GroupStandingsModule({
  groups: groupsProp,
  selectedGroupIds,
}: GroupStandingsModuleProps = {}) {
  const t = useTranslations('magazine.groups')
  const groups = groupsProp && groupsProp.length > 0 ? groupsProp : DEMO_GROUPS
  const groupsById = useMemo(() => {
    const map = new Map<string, GroupStandingProp>()
    for (const g of groups) map.set(g.id, g)
    return map
  }, [groups])

  const initialActive: [string, string] =
    selectedGroupIds ?? (groups.length >= 2 ? [groups[0].id, groups[1].id] : ['B', 'D'])

  // FIFO order — index 0 is the older selection, replaced first when a third
  // letter is picked.
  const [active, setActive] = useState<string[]>(() => [...initialActive])

  const selectorIds = useMemo(() => {
    const set = new Set<string>(BASE_SELECTOR_IDS)
    for (const g of groups) set.add(g.id)
    return Array.from(set).sort()
  }, [groups])

  const handleSelect = (id: string) => {
    setActive((prev) => {
      const has = prev.includes(id)
      if (has) {
        // Minimum 1 selection — refuse to deselect the last one.
        if (prev.length <= 1) return prev
        return prev.filter((p) => p !== id)
      }
      if (prev.length >= 2) {
        // Drop oldest (FIFO), append new.
        return [prev[1], id]
      }
      return [...prev, id]
    })
  }

  const shownGroups: Array<{ id: string; data?: GroupStandingProp }> = active.map((id) => ({
    id,
    data: groupsById.get(id),
  }))

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--cream)', padding: 48, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>{t('sectionLabel')}</div>
          <div className="ko-display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--gold)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {selectorIds.map((g) => {
              const isActive = active.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleSelect(g)}
                  aria-pressed={isActive}
                  className="ko-label"
                  style={{
                    fontSize: 12,
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--green)' : 'var(--cream)',
                    opacity: isActive ? 1 : 0.5,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {g}
                </button>
              )
            })}
          </div>
          <div
            className="ko-mono ko-muted"
            style={{ fontSize: 9, letterSpacing: '0.18em', fontFamily: 'var(--f-mono, monospace)' }}
          >
            {t('selectorHintTemplate', { ids: active.join(' · ') })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {shownGroups.map(({ id, data }) => {
          if (!data) {
            return (
              <div
                key={id}
                className="ko-card"
                style={{
                  background: 'var(--soft)',
                  borderColor: 'var(--line-strong)',
                  padding: '40px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: 10,
                  minHeight: 280,
                }}
              >
                <div className="ko-display" style={{ fontSize: 56, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>{id}</div>
                <div className="ko-label" style={{ fontSize: 14 }}>{t('groupLabel', { id })}</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
                  {t('noDataLabel')}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.7, maxWidth: 320 }}>
                  {t('noDataBody')}
                </p>
              </div>
            )
          }
          const g = data
          return (
          <div key={g.id} data-testid="standings-table" className="ko-card" style={{ background: 'var(--soft)', padding: 0, overflow: 'hidden', borderColor: 'var(--line-strong)' }}>
            <div
              style={{
                padding: '18px 24px',
                background: g.isFeatured ? 'var(--green)' : 'var(--surface)',
                color: g.isFeatured ? 'var(--ink)' : 'var(--cream)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="ko-display" style={{ fontSize: 38, fontStyle: 'italic', lineHeight: 1 }}>{g.id}</div>
                <div>
                  <div className="ko-label" style={{ fontSize: 14 }}>{t('groupLabel', { id: g.id })}</div>
                  <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.7 }}>
                    {t('matchdayLabel', { current: g.matchday, total: g.totalMatchdays })}
                  </div>
                </div>
              </div>
              {g.isFeatured && (
                <span className="ko-label" style={{ fontSize: 10, padding: '4px 10px', background: 'var(--ink)', color: 'var(--green)' }}>{t('featuredBadge')}</span>
              )}
            </div>
            <div style={{ padding: '8px 0' }}>
              {g.teams.map((row, i) => (
                <Link
                  key={row.slug || row.code}
                  data-testid="standings-row"
                  href={row.slug ? `/teams/${row.slug}` : `/groups/${g.id}`}
                  style={{
                    padding: '12px 24px',
                    display: 'grid',
                    gridTemplateColumns: '24px 32px 1fr 32px 32px 32px 48px 48px',
                    alignItems: 'center',
                    gap: 14,
                    borderTop: i === 2 ? '1px dashed rgba(168,224,99,0.3)' : 'none',
                    background: 'transparent',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div className="ko-display" style={{ fontSize: 20, fontStyle: 'italic', color: i < 2 ? 'var(--green)' : 'var(--muted)' }}>{i + 1}</div>
                  <Flag colors={row.colors} style={{ width: 26, height: 18 }} />
                  <div className="ko-label" style={{ fontSize: 13 }}>{row.name.toUpperCase()}</div>
                  <div className="ko-mono" style={{ fontSize: 12, textAlign: 'center', opacity: 0.7 }}>{row.w}</div>
                  <div className="ko-mono" style={{ fontSize: 12, textAlign: 'center', opacity: 0.7 }}>{row.d}</div>
                  <div className="ko-mono" style={{ fontSize: 12, textAlign: 'center', opacity: 0.7 }}>{row.l}</div>
                  <div className="ko-mono" style={{ fontSize: 12, textAlign: 'center', color: row.gd.startsWith('+') ? 'var(--green)' : row.gd.startsWith('-') ? 'var(--red)' : 'var(--cream)' }}>{row.gd}</div>
                  <div className="ko-label ko-gold" style={{ fontSize: 18, textAlign: 'right' }}>{row.pts}</div>
                </Link>
              ))}
              <div style={{ padding: '8px 24px', borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '24px 32px 1fr 32px 32px 32px 48px 48px', gap: 14 }}>
                <div /><div /><div />
                <div className="ko-mono ko-muted" style={{ fontSize: 9, textAlign: 'center', letterSpacing: '0.16em' }}>W</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 9, textAlign: 'center', letterSpacing: '0.16em' }}>D</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 9, textAlign: 'center', letterSpacing: '0.16em' }}>L</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 9, textAlign: 'center', letterSpacing: '0.16em' }}>GD</div>
                <div className="ko-mono ko-muted" style={{ fontSize: 9, textAlign: 'right', letterSpacing: '0.16em' }}>PTS</div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <Link href="/groups/A" style={{ marginTop: 18, padding: 14, border: '1px dashed var(--line)', display: 'flex', justifyContent: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
        <span className="ko-mono ko-muted" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
          {t('moreGroups', { count: Math.max(0, selectorIds.length - active.length) })}
        </span>
        <span className="ko-label ko-gold" style={{ fontSize: 11 }}>{t('viewAllGroups', { total: selectorIds.length })}</span>
      </Link>
    </div>
  )
}

// ── LEADERBOARD ─────────────────────────────
type LeaderboardTab = 'today' | 'week' | 'tournament' | 'allTime'

export interface LeaderboardPodiumProp {
  userId: string
  displayName: string
  avatarUrl: string | null
  favoriteTeamSlug: string | null
  totalPoints: number
  accuracyPct: number
  rank: number
}

interface LeaderboardModuleProps {
  podium?: LeaderboardPodiumProp[]
  totalUsers?: number
}

function flagFor(slug: string | null): [string, string, string] {
  if (!slug) return ['#6b6b6b', '#3a3a3a', '#6b6b6b']
  const team = Object.values(TEAMS).find((t) => t.name.toLowerCase().replace(/\s+/g, '-') === slug)
  return team?.colors ?? ['#6b6b6b', '#3a3a3a', '#6b6b6b']
}

export function LeaderboardModule({ podium = [], totalUsers = 0 }: LeaderboardModuleProps = {}) {
  const t = useTranslations('magazine.leaderboard')
  const [tab, setTab] = useState<LeaderboardTab>('week')
  const leaderboardTabs: Array<{ id: LeaderboardTab; label: string }> = [
    { id: 'today', label: t('tabToday') },
    { id: 'week', label: t('tabWeek') },
    { id: 'tournament', label: t('tabTournament') },
    { id: 'allTime', label: t('tabAllTime') },
  ]
  // Pad to 3 with empty slots when real data has fewer entries.
  const padded: Array<LeaderboardPodiumProp | null> =
    podium.length >= 3
      ? podium.slice(0, 3)
      : [...podium, ...Array<null>(Math.max(0, 3 - podium.length)).fill(null)]
  const heights: Record<number, number> = { 1: 220, 2: 180, 3: 150 }
  // Visual layout: rank 2 left, rank 1 center (tallest), rank 3 right.
  const order = [1, 0, 2]

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--ink)', color: 'var(--cream)', padding: 48, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(50% 40% at 50% 0%, rgba(243,201,105,0.10), transparent 60%)' }} />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div className="ko-eyebrow ko-gold" style={{ marginBottom: 12 }}>{t('sectionLabel')}</div>
          <div className="ko-display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            {t('titleLine1')}
            <br />
            <em style={{ color: 'var(--green)' }}>{t('titleEmphasis')}</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {leaderboardTabs.map((tabItem) => {
            const isActive = tab === tabItem.id
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                aria-pressed={isActive}
                className="ko-label"
                style={{
                  fontSize: 11,
                  padding: '8px 14px',
                  border: '1px solid var(--line)',
                  background: isActive ? 'var(--green)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--cream)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {tabItem.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr',
          gap: 12,
          alignItems: 'end',
          marginBottom: 24,
        }}
      >
        {order.map((idx) => {
          const p = padded[idx]
          const r = idx + 1
          if (!p) {
            return (
              <div
                key={`empty-${idx}`}
                className="ko-card"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--muted)',
                  padding: 24,
                  height: heights[r],
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  border: '1px dashed var(--line-strong)',
                  opacity: 0.5,
                }}
              >
                <div className="ko-display" style={{ fontSize: r === 1 ? 96 : 72, fontStyle: 'italic', lineHeight: 0.85 }}>{r}</div>
                <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.7 }}>{t('slotOpen')}</div>
              </div>
            )
          }
          return (
            <div
              key={p.userId}
              className="ko-card"
              style={{
                background: r === 1 ? 'var(--gold)' : 'var(--surface)',
                color: r === 1 ? 'var(--ink)' : 'var(--cream)',
                padding: 24,
                height: heights[r],
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                border: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="ko-display" style={{ fontSize: r === 1 ? 96 : 72, fontStyle: 'italic', lineHeight: 0.85 }}>{r}</div>
                <Flag colors={flagFor(p.favoriteTeamSlug)} style={{ width: 30, height: 22 }} />
              </div>
              <div>
                <div className="ko-label" style={{ fontSize: 16 }}>{p.displayName.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <div className="ko-bignum" style={{ fontSize: r === 1 ? 36 : 28, color: r === 1 ? 'var(--ink)' : 'var(--gold)' }}>
                    {p.totalPoints.toLocaleString()}
                  </div>
                  <div className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.7 }}>{t('ptsLabel')}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span className="ko-mono" style={{ fontSize: 10, letterSpacing: '0.14em', opacity: 0.7 }}>
                    {t('accLabel', { pct: p.accuracyPct.toFixed(1) })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="ko-mono ko-muted"
        style={{
          position: 'relative',
          fontSize: 9,
          letterSpacing: '0.22em',
          textAlign: 'center',
          marginBottom: 14,
          opacity: 0.6,
        }}
      >
        {totalUsers > 0
          ? t('predictorsTotal', { count: totalUsers.toLocaleString(), tab: tab.toUpperCase() })
          : t('warmingUp', { tab: tab.toUpperCase() })}
      </div>

      <div
        className="ko-card"
        style={{
          position: 'relative',
          padding: '22px 28px',
          background: 'rgba(168,224,99,0.06)',
          borderColor: 'var(--green)',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div
          className="ko-display"
          style={{
            fontSize: 44,
            fontStyle: 'italic',
            color: 'var(--gold)',
            lineHeight: 1,
          }}
        >
          #—
        </div>
        <div>
          <div className="ko-label" style={{ fontSize: 14, color: 'var(--green) ' }}>{t('yourStanding')}</div>
          <div className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.18em', marginTop: 4 }}>
            {t('signInPrompt')}
          </div>
        </div>
        <Link href="/predict" className="ko-btn ko-btn-primary">{t('predictCta')}</Link>
      </div>
    </div>
  )
}
