import Link from 'next/link'

interface DropdownItem {
  label: string
  href: string
}

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  return (
    <div className="relative group">
      <button className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
        {label}
        <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 min-w-[200px]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-5 py-2.5 font-label text-sm text-on-surface-variant hover:text-primary hover:bg-white/[0.04] transition-colors"
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
        <nav className="flex justify-between items-center px-6 py-4 w-full max-w-[1920px] mx-auto">
          <Link href="/" className="text-2xl font-black italic tracking-tighter text-primary">
            SCOUTEDGE
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/teams" className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              Teams
            </Link>
            <NavDropdown
              label="Tournament"
              items={[
                { label: 'Full Schedule', href: '/schedule' },
                { label: 'Match Board', href: '/matches' },
                { label: 'Group Analysis', href: '/groups/A' },
                { label: 'Countdown', href: '/countdown' },
                { label: 'Time Converter', href: '/schedule/converter' },
              ]}
            />
            <NavDropdown
              label="Analysis"
              items={[
                { label: 'Power Rankings', href: '/power-rankings' },
                { label: 'Daily Briefing', href: '/daily-briefing' },
              ]}
            />
            <Link href="/compare" className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              Compare
            </Link>
            <Link href="/blog" className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              Blog
            </Link>
            <Link href="/predictions" className="font-headline font-bold tracking-tight text-[#e9c400] hover:brightness-125 transition-all">
              Predictions
            </Link>
            <Link href="/community" className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors">
              Community
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-surface-container-high rounded-full px-4 py-2 items-center gap-2">
              <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-on-surface-variant">Search teams...</span>
            </div>
          </div>
        </nav>
      </header>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-background/90 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Home</span>
        </Link>
        <Link href="/teams" className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-6 py-2 scale-110 active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Teams</span>
        </Link>
        <Link href="/matches" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Matches</span>
        </Link>
        <Link href="/predictions" className="flex flex-col items-center justify-center text-[#e9c400] active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[11px] font-label uppercase font-bold tracking-widest mt-1">Predict</span>
        </Link>
      </nav>
    </>
  )
}
