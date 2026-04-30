import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { SUPPORTED_LOCALES, LOCALE_CONFIGS } from '@/i18n/locales'
import KickOracleLogo from '../ui/ScoutEdgeLogo'

export default function Footer() {
  const t = useTranslations('footer')
  const nav = useTranslations('nav')

  return (
    <footer className="bg-surface-container-lowest py-20 px-6 border-t border-outline-variant/10 pb-32 md:pb-20">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
          <div className="col-span-2">
            <div className="mb-6">
              <KickOracleLogo variant="stacked" />
            </div>
            <p className="text-on-surface-variant max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
            <Link
              href="/daily-briefing"
              className="inline-flex items-center gap-2 mt-6 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t('newsletterCta')}
            </Link>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">{t('predictionsHeading')}</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/predictions" className="hover:text-on-surface transition-colors">{nav('aiPredictions')}</Link></li>
              <li><Link href="/bracket" className="hover:text-on-surface transition-colors">{nav('bracketPredictor')}</Link></li>
              <li><Link href="/power-rankings" className="hover:text-on-surface transition-colors">{nav('powerRankings')}</Link></li>
              <li><Link href="/compare" className="hover:text-on-surface transition-colors">{nav('compareTeams')}</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">{t('tournamentHeading')}</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/teams" className="hover:text-on-surface transition-colors">{t('allTeams')}</Link></li>
              <li><Link href="/matches" className="hover:text-on-surface transition-colors">{nav('matchBoard')}</Link></li>
              <li><Link href="/schedule" className="hover:text-on-surface transition-colors">{nav('fullSchedule')}</Link></li>
              <li><Link href="/countdown" className="hover:text-on-surface transition-colors">{nav('countdown')}</Link></li>
              <li><Link href="/blog" className="hover:text-on-surface transition-colors">{nav('blog')}</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">{t('citiesTravelHeading')}</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/cities" className="hover:text-on-surface transition-colors">{nav('hostCities')}</Link></li>
              <li><Link href="/travel" className="hover:text-on-surface transition-colors">{nav('travelGuide')}</Link></li>
              <li><Link href="/travel/visa" className="hover:text-on-surface transition-colors">{nav('visaInfo')}</Link></li>
              <li><Link href="/travel/budget-calculator" className="hover:text-on-surface transition-colors">{nav('budgetCalculator')}</Link></li>
              <li><Link href="/stickers" className="hover:text-on-surface transition-colors">{nav('stickerTracker')}</Link></li>
              <li><Link href="/gear" className="hover:text-on-surface transition-colors">{t('gearJerseys')}</Link></li>
            </ul>
          </div>
          <div>
            <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-6">{t('aboutHeading')}</h6>
            <ul className="space-y-4 text-on-surface-variant">
              <li><Link href="/developers" className="hover:text-on-surface transition-colors">{t('apiAccess')}</Link></li>
              <li><Link href="/pricing" className="hover:text-on-surface transition-colors">{t('pricing')}</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-on-surface transition-colors">{t('privacyPolicy')}</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-on-surface transition-colors">{t('termsOfService')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Language picker — passes link equity to all locale homepages
            and helps Google discover the localized URL space */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10">
          <h6 className="font-label font-bold text-sm uppercase tracking-widest text-primary mb-4">
            Languages
          </h6>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-on-surface-variant">
            {SUPPORTED_LOCALES.map((loc) => {
              const cfg = LOCALE_CONFIGS[loc]
              const href = loc === 'en' ? 'https://kickoracle.com/' : `https://kickoracle.com/${loc}`
              return (
                <li key={loc}>
                  <a
                    href={href}
                    hrefLang={cfg.hreflang}
                    className="hover:text-on-surface transition-colors text-sm"
                  >
                    <span aria-hidden="true" className="mr-1.5">{cfg.flag}</span>
                    {cfg.nativeName}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-outline-variant/10 space-y-3">
          <p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-4xl">
            {t('disclaimer')}
          </p>
          <p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-4xl">
            {t('affiliateDisclosure')}
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center text-xs text-on-surface-variant gap-4">
          <span>&copy; {t('copyright')}</span>
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
            <Link href="/privacy-policy" className="hover:text-on-surface transition-colors">{t('privacyPolicy')}</Link>
            <Link href="/terms-of-service" className="hover:text-on-surface transition-colors">{t('termsOfService')}</Link>
            <a href="/sitemap.xml" className="hover:text-on-surface transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
