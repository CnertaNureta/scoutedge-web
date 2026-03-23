import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest py-20 px-6 border-t border-white/[0.06] pb-32 md:pb-20">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-headline text-lg leading-none">S</span>
              </div>
              <span className="font-headline text-2xl tracking-wider text-on-surface">
                SCOUT<span className="text-primary">EDGE</span>
              </span>
            </div>
            <p className="text-on-surface-variant max-w-sm leading-relaxed">
              AI-powered intelligence platform for the FIFA World Cup 2026. Deep squad analysis, chemistry indexes,
              and predictive insights for all 48 participating nations.
            </p>
          </div>
          <div>
            <h6 className="font-label font-semibold text-sm uppercase tracking-widest text-primary mb-6">Tournament</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/teams" className="hover:text-primary transition-colors">All Teams</Link></li>
              <li><Link href="/teams" className="hover:text-primary transition-colors">Group Standings</Link></li>
              <li><Link href="/teams" className="hover:text-primary transition-colors">Match Schedule</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-semibold text-sm uppercase tracking-widest text-primary mb-6">Analysis</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/teams" className="hover:text-primary transition-colors">Chemistry Index</Link></li>
              <li><Link href="/teams" className="hover:text-primary transition-colors">Win Probabilities</Link></li>
              <li><Link href="/teams" className="hover:text-primary transition-colors">Player Intel</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-semibold text-sm uppercase tracking-widest text-primary mb-6">About</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Methodology</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Access</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        {/* Neon divider */}
        <div className="mt-20 mb-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-on-surface-variant gap-4">
          <span>&copy; 2026 ScoutEdge. AI-Powered World Cup Intelligence. All rights reserved.</span>
          <div className="flex space-x-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
