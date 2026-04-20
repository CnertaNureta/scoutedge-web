import Link from 'next/link'
import KickOracleLogo from '../ui/ScoutEdgeLogo'

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest py-20 px-6 border-t border-outline-variant/10 pb-32 md:pb-20">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
          <div className="col-span-2">
            <div className="mb-6">
              <KickOracleLogo variant="stacked" />
            </div>
            <p className="text-on-surface-variant max-w-sm leading-relaxed">
              AI-powered prediction and intelligence platform for the 2026 World Cup.
              Independent analysis, squad chemistry, and predictive insights for all 48 nations.
            </p>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">Predictions</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/predictions" className="hover:text-on-surface transition-colors">AI Predictions</Link></li>
              <li><Link href="/bracket" className="hover:text-on-surface transition-colors">Bracket Predictor</Link></li>
              <li><Link href="/power-rankings" className="hover:text-on-surface transition-colors">Power Rankings</Link></li>
              <li><Link href="/odds" className="hover:text-on-surface transition-colors">Odds Comparison</Link></li>
              <li><Link href="/compare" className="hover:text-on-surface transition-colors">Compare Teams</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">Tournament</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/teams" className="hover:text-on-surface transition-colors">All Teams</Link></li>
              <li><Link href="/matches" className="hover:text-on-surface transition-colors">Match Board</Link></li>
              <li><Link href="/schedule" className="hover:text-on-surface transition-colors">Full Schedule</Link></li>
              <li><Link href="/countdown" className="hover:text-on-surface transition-colors">Countdown</Link></li>
              <li><Link href="/blog" className="hover:text-on-surface transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">Cities & Travel</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/cities" className="hover:text-on-surface transition-colors">Host Cities</Link></li>
              <li><Link href="/travel" className="hover:text-on-surface transition-colors">Travel Guide</Link></li>
              <li><Link href="/travel/visa" className="hover:text-on-surface transition-colors">Visa Info</Link></li>
              <li><Link href="/travel/budget-calculator" className="hover:text-on-surface transition-colors">Budget Calculator</Link></li>
              <li><Link href="/stickers" className="hover:text-on-surface transition-colors">Sticker Tracker</Link></li>
              <li><Link href="/gear" className="hover:text-on-surface transition-colors">Gear & Jerseys</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">About</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/developers" className="hover:text-on-surface transition-colors">API Access</Link></li>
              <li><Link href="/pricing" className="hover:text-on-surface transition-colors">Pricing</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-on-surface transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-on-surface transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Trademark Disclaimers */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10 space-y-3">
          <p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-4xl">
            This is an independent, unofficial fan-made resource and is not affiliated with or endorsed by FIFA or the FIFA World Cup.
            All team names, logos, and related marks are trademarks of their respective owners and are used here for identification purposes only.
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center text-xs text-on-surface-variant gap-4">
          <span>&copy; 2026 KickOracle. AI-Powered World Cup Intelligence. All rights reserved.</span>
          <div className="flex space-x-8">
            <Link href="/privacy-policy" className="hover:text-on-surface transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-on-surface transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
