'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { HeroA } from './HeroA'
import { NextMatchModule } from './NextMatch'
import { TopContendersModule, type Contender } from './TopContenders'
import {
  CompareModule,
  DailyBriefingModule,
  GroupStandingsModule,
  LeaderboardModule,
  ScheduleModule,
  type BriefingLeadStoryProp,
  type BriefingQuickStoryProp,
  type CompareStat,
  type CompareTeamProp,
  type CountdownProp,
  type GroupStandingProp,
  type LeaderboardPodiumProp,
  type NextKickoffProp,
  type TodayFixtureProp,
  type WeekDayProp,
} from './MoreModules'

const DESIGN_WIDTH = 1440

interface BandProps {
  children: ReactNode
  height: number
  bg?: string
  id?: string
}

function Band({ children, height, bg, id }: BandProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const w = ref.current?.clientWidth || window.innerWidth
      setScale(Math.min(1, w / DESIGN_WIDTH))
    }
    update()
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section
      ref={ref}
      id={id}
      className="ko-module-band"
      style={{ background: bg || 'var(--ink)', height: `${height * scale}px` }}
    >
      <div
        className="ko-module-artboard"
        style={{ height, transform: `translateX(-50%) scale(${scale})` }}
      >
        {children}
      </div>
    </section>
  )
}

function Rule() {
  return <div className="ko-section-rule" />
}

interface NextFixtureProp {
  homeName: string
  homeCode: string
  homeColors: [string, string, string]
  awayName: string
  awayCode: string
  awayColors: [string, string, string]
  group: string
  round: string
  venue: string
  city: string
  kickoffLabel: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

interface HeroStatsProp {
  fixtures: number
  federations: number
  hitRate: string
  predictionsCast: string
}

interface CompareTeamsProp {
  home: CompareTeamProp
  away: CompareTeamProp
  stats?: CompareStat[]
}

interface MagazineHomePageProps {
  contenders?: Contender[]
  totalTeams?: number
  newsletterSlot?: ReactNode
  nextFixture?: NextFixtureProp
  stats?: HeroStatsProp
  tickerItems?: string[]
  leadStory?: BriefingLeadStoryProp
  quickStories?: BriefingQuickStoryProp[]
  groups?: GroupStandingProp[]
  selectedGroupIds?: [string, string]
  weekDays?: WeekDayProp[]
  todayFixtures?: TodayFixtureProp[]
  fixturesByDay?: TodayFixtureProp[][]
  todayIndex?: number
  countdown?: CountdownProp
  countdownTargetIso?: string
  nextKickoff?: NextKickoffProp
  compareTeams?: CompareTeamsProp
  /**
   * Whether to render the Leaderboard module. True once the
   * `global_leaderboard` view has rows (driven by `getLeaderboardData()`).
   */
  showLeaderboard?: boolean
  /** Top 3 from the global leaderboard. Empty when `showLeaderboard` is false. */
  leaderboardPodium?: LeaderboardPodiumProp[]
  leaderboardTotalUsers?: number
}

export default function MagazineHomePage({
  contenders,
  totalTeams,
  newsletterSlot,
  nextFixture,
  stats,
  tickerItems,
  leadStory,
  quickStories,
  groups,
  selectedGroupIds,
  weekDays,
  todayFixtures,
  fixturesByDay,
  todayIndex,
  countdown,
  countdownTargetIso,
  nextKickoff,
  compareTeams,
  showLeaderboard = false,
  leaderboardPodium,
  leaderboardTotalUsers,
}: MagazineHomePageProps = {}) {
  const tBrand = useTranslations('magazine.brand')
  return (
    <div data-testid="home-magazine" className="kick-oracle-root" style={{ width: '100%', overflowX: 'hidden' }}>
      {/* 01 Hero */}
      <Band id="hero" height={900}>
        <HeroA
          hideMasthead
          nextFixture={nextFixture}
          stats={stats}
          tickerItems={tickerItems}
        />
      </Band>

      {/* Brand band divider */}
      <div
        style={{
          background: 'var(--ink)',
          padding: '14px 0',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="ko-brand-band-inner">
          <span className="ko-eyebrow ko-gold">{tBrand('bandLine')}</span>
          <span className="ko-mono ko-muted" style={{ fontSize: 10, letterSpacing: '0.22em' }}>
            {tBrand('issueLabel')}
          </span>
        </div>
      </div>

      {/* 02 Next Match */}
      <Band id="next-match" height={900}><NextMatchModule fixture={nextFixture} /></Band>
      <Rule />

      {/* 03 Briefing + Newsletter (merged) */}
      <Band id="briefing" height={860}>
        <DailyBriefingModule
          newsletterSlot={newsletterSlot}
          leadStory={leadStory}
          quickStories={quickStories}
        />
      </Band>
      <Rule />

      {/* 04 Top Contenders */}
      <Band id="contenders" height={900}>
        <TopContendersModule contenders={contenders} totalCount={totalTeams} />
      </Band>
      <Rule />

      {/* 05 Group Standings */}
      <Band id="groups" height={900}>
        <GroupStandingsModule groups={groups} selectedGroupIds={selectedGroupIds} />
      </Band>
      <Rule />

      {/* 06 Calendar (Schedule + Countdown merged) */}
      <Band id="schedule" height={920}>
        <ScheduleModule
          weekDays={weekDays}
          fixturesByDay={fixturesByDay}
          todayFixtures={todayFixtures}
          todayIndex={todayIndex}
          countdown={countdown}
          countdownTargetIso={countdownTargetIso}
          nextKickoff={nextKickoff}
        />
      </Band>
      <Rule />

      {/* 07 Compare / H2H */}
      <Band id="compare" height={820}>
        <CompareModule
          teamA={compareTeams?.home}
          teamB={compareTeams?.away}
          stats={compareTeams?.stats}
        />
      </Band>

      {/* 08 Leaderboard — visible once global_leaderboard view has rows (see docs/leaderboard-schema.md) */}
      {showLeaderboard && (
        <>
          <Rule />
          <Band id="leaderboard" height={720}>
            <LeaderboardModule podium={leaderboardPodium} totalUsers={leaderboardTotalUsers} />
          </Band>
        </>
      )}
    </div>
  )
}
