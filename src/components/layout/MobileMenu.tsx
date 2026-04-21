'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('nav')

  const NAV_SECTIONS = [
    {
      title: t('predictions'),
      links: [
        { label: t('aiPredictions'), href: '/predictions' as const },
        { label: t('bracketPredictor'), href: '/bracket' as const },
        { label: t('powerRankings'), href: '/power-rankings' as const },
        { label: t('oddsComparison'), href: '/odds' as const },
        { label: t('compareTeams'), href: '/compare' as const },
      ],
    },
    {
      title: t('tournament'),
      links: [
        { label: t('teams'), href: '/teams' as const },
        { label: t('matchBoard'), href: '/matches' as const },
        { label: t('fullSchedule'), href: '/schedule' as const },
        { label: t('groupAnalysis'), href: '/groups/A' as const },
        { label: t('countdown'), href: '/countdown' as const },
        { label: t('timeConverter'), href: '/schedule/converter' as const },
      ],
    },
    {
      title: t('citiesTravel'),
      links: [
        { label: t('hostCities'), href: '/cities' as const },
        { label: t('travelGuide'), href: '/travel' as const },
        { label: t('visaInfo'), href: '/travel/visa' as const },
        { label: t('budgetCalculator'), href: '/travel/budget-calculator' as const },
      ],
    },
    {
      title: t('play'),
      links: [
        { label: t('predictMatches'), href: '/predict' as const },
        { label: t('dailyChallenge'), href: '/challenges' as const },
        { label: t('myLeagues'), href: '/leagues' as const },
        { label: t('leaderboard'), href: '/leaderboard' as const },
      ],
    },
    {
      title: t('fanZone'),
      links: [
        { label: t('stickerTracker'), href: '/stickers' as const },
        { label: t('jerseysGear'), href: '/gear' as const },
        { label: t('matchBall'), href: '/gear/ball' as const },
        { label: t('blog'), href: '/blog' as const },
        { label: t('dailyBriefing'), href: '/daily-briefing' as const },
      ],
    },
  ]

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const common = useTranslations('common')

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
        aria-label="More navigation"
        aria-expanded={open}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
        <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">
          {open ? common('close') : '...'}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl overflow-y-auto"
          style={{ paddingBottom: '100px', paddingTop: '80px' }}
        >
          <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="font-label text-xs text-primary uppercase tracking-widest font-bold mb-4">
                  {section.title}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container border border-white/[0.04] hover:border-primary/20 hover:bg-surface-container-high transition-colors"
                    >
                      <span className="font-headline text-sm tracking-tight">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
