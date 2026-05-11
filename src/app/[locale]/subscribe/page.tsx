import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  buildOGMeta,
  canonical,
  breadcrumbJsonLd,
  productOfferJsonLd,
  jsonLdGraph,
} from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'subscribePage' })
  const alternates = buildAlternates(locale, '/subscribe')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates,
    ...buildOGMeta({
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: alternates.canonical,
      locale,
    }),
  }
}

export default async function SubscribePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('subscribePage')
  const url = canonical(`/${locale}/subscribe`)

  const subscriptionOffer = productOfferJsonLd({
    name: 'KickOracle Annual Football Intelligence',
    description: 'Year-round AI-powered football predictions, weekly briefings, and tactical intelligence covering Champions League, Premier League, Copa Libertadores, NWSL, WSL, and Liga F.',
    priceCents: 999,
    url,
    category: 'Sports Predictions Subscription',
    availability: 'PreOrder',
  })

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'KickOracle', url: canonical(`/${locale}`) },
    { name: t('badge'), url },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph([subscriptionOffer, breadcrumbs])),
        }}
      />

      <main className="min-h-screen pb-24">
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/[0.06] via-transparent to-transparent" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex rounded-full bg-secondary/10 border border-secondary/30 px-3 py-1 mb-6 text-secondary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {t('badge')}
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-tight tracking-tight mb-5">
              {t('heading')}
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">{t('intro')}</p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 mb-12">
          <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-3">
            {t('leaguesHeading')}
          </h2>
          <p className="text-on-surface-variant text-sm mb-5">{t('leaguesIntro')}</p>
          <ul className="space-y-3">
            {[
              'leagueUcl',
              'leaguePl',
              'leagueCopa',
              'leagueWomens',
              'leagueLatam',
            ].map((key) => (
              <li
                key={key}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-on-surface-variant text-sm leading-relaxed"
              >
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-4 mb-12">
          <div className="rounded-2xl border border-secondary/30 bg-secondary/[0.04] p-6 md:p-8">
            <h2 className="font-headline text-xl font-bold text-on-surface uppercase tracking-tight mb-3">
              {t('pricingHeading')}
            </h2>
            <p className="font-headline text-3xl text-secondary font-bold mb-1">{t('pricingPrice')}</p>
            <p className="text-on-surface-variant text-sm mb-3">{t('pricingPriceAlt')}</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">{t('pricingNote')}</p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4">
          <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 md:p-12 text-center">
            <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-3">
              {t('ctaHeading')}
            </h2>
            <p className="text-on-surface-variant text-sm mb-6">{t('ctaBody')}</p>
            <NewsletterSignup variant="inline" source="article" />
            <p className="text-on-surface-variant/60 text-xs mt-6 italic">{t('ctaFinePrint')}</p>
          </div>
        </section>
      </main>
    </>
  )
}
