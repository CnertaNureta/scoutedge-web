import Link from 'next/link'

export default function Header() {
  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/[0.06]">
        <nav className="flex justify-between items-center px-6 py-3 w-full max-w-[1920px] mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <span className="text-primary font-headline text-lg leading-none">S</span>
            </div>
            <span className="font-headline text-2xl tracking-wider text-on-surface">
              SCOUT<span className="text-primary">EDGE</span>
            </span>
          </Link>
          <div className="hidden md:flex gap-1 items-center">
            {[
              { label: 'Teams', href: '/teams' },
              { label: 'Schedule', href: '/teams' },
              { label: 'Analysis', href: '/teams' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-4 py-2 rounded-lg font-label text-sm font-medium uppercase tracking-widest text-on-surface-variant hover:text-primary hover:bg-white/[0.04] transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex bg-white/[0.04] rounded-xl px-4 py-2 items-center gap-2 border border-white/[0.06]">
              <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-on-surface-variant font-body">Search teams...</span>
            </div>
            <Link
              href="/teams"
              className="hidden md:flex px-5 py-2 rounded-xl bg-primary text-on-primary font-label text-sm font-semibold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all"
            >
              Explore
            </Link>
          </div>
        </nav>
      </header>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-background/90 backdrop-blur-xl z-50 rounded-t-3xl border-t border-white/[0.06]">
        <Link href="/" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[11px] font-label uppercase font-medium tracking-widest mt-1">Home</span>
        </Link>
        <Link href="/teams" className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-2xl px-6 py-2 scale-110 active:scale-90 transition-transform shadow-[0_0_20px_rgba(0,255,135,0.3)]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="text-[11px] font-label uppercase font-medium tracking-widest mt-1">Teams</span>
        </Link>
        <Link href="/teams" className="flex flex-col items-center justify-center text-on-surface-variant active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[11px] font-label uppercase font-medium tracking-widest mt-1">Schedule</span>
        </Link>
      </nav>
    </>
  )
}
