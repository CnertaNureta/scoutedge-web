import Link from 'next/link'
import AuthButton from './AuthButton'
import SearchButton from './SearchButton'
import MobileMenu from './MobileMenu'
import KickOracleLogo from '../ui/ScoutEdgeLogo'

interface DropdownItem {
  label: string
  href: string
}

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  return (
    <div className="relative group">
      <button
        className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {label}
        <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200" role="menu">
        <div className="glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 min-w-[200px]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-5 py-2.5 font-label text-sm text-on-surface-variant hover:text-primary hover:bg-white/[0.04] transition-colors"
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Header() {
  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-primary-container shadow-2xl">
        <nav aria-label="Main navigation" className="flex justify-between items-center px-6 py-4 w-full max-w-[1920px] mx-auto">
          <KickOracleLogo />
          <div className="hidden lg:flex gap-6 items-center">
            <NavDropdown
              label="Predictions"
              items={[
                { label: 'AI Predictions', href: '/predictions' },
                { label: 'Bracket Predictor', href: '/bracket' },
                { label: 'Power Rankings', href: '/power-rankings' },
                { label: 'Odds Comparison', href: '/odds' },
                { label: 'Compare Teams', href: '/compare' },
              ]}
            />
            <Link href="/teams" className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              Teams
            </Link>
            <NavDropdown
              label="Cities & Travel"
              items={[
                { label: 'Host Cities', href: '/cities' },
                { label: 'Travel Guide', href: '/travel' },
                { label: 'Visa Info', href: '/travel/visa' },
                { label: 'Budget Calculator', href: '/travel/budget-calculator' },
              ]}
            />
            <NavDropdown
              label="Tournament"
              items={[
                { label: 'Match Board', href: '/matches' },
                { label: 'Full Schedule', href: '/schedule' },
                { label: 'Group Analysis', href: '/groups/A' },
                { label: 'Countdown', href: '/countdown' },
                { label: 'Time Converter', href: '/schedule/converter' },
              ]}
            />
            <NavDropdown
              label="Play"
              items={[
                { label: 'Predict Matches', href: '/predict' },
                { label: 'My Leagues', href: '/leagues' },
                { label: 'Daily Challenge', href: '/challenges' },
                { label: 'Leaderboard', href: '/leaderboard' },
              ]}
            />
            <NavDropdown
              label="Fan Zone"
              items={[
                { label: 'Sticker Tracker', href: '/stickers' },
                { label: 'Jerseys & Gear', href: '/gear' },
                { label: 'Match Ball', href: '/gear/ball' },
                { label: 'Blog', href: '/blog' },
                { label: 'Daily Briefing', href: '/daily-briefing' },
              ]}
            />
            <NavDropdown
              label="Lingo"
              items={[
                { label: 'Pronunciation Guide', href: '/lingo' },
                { label: 'Countries', href: '/lingo/countries' },
                { label: 'Players', href: '/lingo/players' },
                { label: 'Football Terms', href: '/lingo/terms' },
              ]}
            />
          </div>
          <div className="flex items-center gap-4">
            <SearchButton />
            <div className="hidden md:block">
              <AuthButton />
            </div>
          </div>
        </nav>
      </header>
      {/* Mobile Bottom Nav */}
      <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-background/90 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Home</span>
        </Link>
        <Link href="/predictions" className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-5 py-2 scale-110 active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Predict</span>
        </Link>
        <Link href="/teams" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Teams</span>
        </Link>
        <Link href="/cities" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Cities</span>
        </Link>
        <MobileMenu />
      </nav>
    </>
  )
}
