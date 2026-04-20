'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAV_SECTIONS = [
  {
    title: 'Predictions',
    links: [
      { label: 'AI Predictions', href: '/predictions' },
      { label: 'Bracket Predictor', href: '/bracket' },
      { label: 'Power Rankings', href: '/power-rankings' },
      { label: 'Odds Comparison', href: '/odds' },
      { label: 'Compare Teams', href: '/compare' },
    ],
  },
  {
    title: 'Tournament',
    links: [
      { label: 'All Teams', href: '/teams' },
      { label: 'Match Board', href: '/matches' },
      { label: 'Full Schedule', href: '/schedule' },
      { label: 'Group Analysis', href: '/groups/A' },
      { label: 'Countdown', href: '/countdown' },
      { label: 'Time Converter', href: '/schedule/converter' },
    ],
  },
  {
    title: 'Cities & Travel',
    links: [
      { label: 'Host Cities', href: '/cities' },
      { label: 'Travel Guide', href: '/travel' },
      { label: 'Visa Info', href: '/travel/visa' },
      { label: 'Budget Calculator', href: '/travel/budget-calculator' },
    ],
  },
  {
    title: 'Play',
    links: [
      { label: 'Predict Matches', href: '/predict' },
      { label: 'Daily Challenge', href: '/challenges' },
      { label: 'My Leagues', href: '/leagues' },
      { label: 'Leaderboard', href: '/leaderboard' },
      { label: 'Group Simulator', href: '/simulator' },
    ],
  },
  {
    title: 'Fan Zone',
    links: [
      { label: 'Sticker Tracker', href: '/stickers' },
      { label: 'Jerseys & Gear', href: '/gear' },
      { label: 'Match Ball', href: '/gear/ball' },
      { label: 'Blog', href: '/blog' },
      { label: 'Daily Briefing', href: '/daily-briefing' },
    ],
  },
] as const

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

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
          {open ? 'Close' : 'More'}
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
