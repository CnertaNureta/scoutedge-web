import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  buildOGMeta,
  canonical,
  breadcrumbJsonLd,
  jsonLdGraph,
} from '@/lib/og-utils'
import NewsletterSignup from '@/components/monetization/NewsletterSignup'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'upcomingPage' })
  const url = canonical(`/${locale}/upcoming`)

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: url },
    ...buildOGMeta({
      title: t('metaTitle'),
      description: t('metaDescription'),
      url,
      locale,
    }),
  }
}

const TOURNAMENTS = [
  { id: 'wwc', accent: 'from-tertiary/15 to-tertiary/[0.04]', borderColor: 'border-tertiary/30', textColor: 'text-tertiary' },
  { id: 'afcon', accent: 'from-primary/15 to-primary/[0.04]', borderColor: 'border-primary/30', textColor: 'text-primary' },
  { id: 'euro', accent: 'from-secondary/15 to-secondary/[0.04]', borderColor: 'border-secondary/30', textColor: 'text-secondary' },
] as const

export default async function UpcomingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('upcomingPage')
  const url = canonical(`/${locale}/upcoming`)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'KickOracle', url: canonical(`/${locale}`) },
    { name: t('badge'), url },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph([breadcrumbs])),
        }}
      />

      <main className="min-h-screen pb-24">
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-tertiary/[0.05] via-transparent to-transparent" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex rounded-full bg-tertiary/10 border border-tertiary/30 px-3 py-1 mb-6 text-tertiary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
              {t('badge')}
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-tight tracking-tight mb-5">
              {t('heading')}
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">{t('intro')}</p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {TOURNAMENTS.map((tt) => (
            <div
              key={tt.id}
              className={`rounded-2xl border ${tt.borderColor} bg-gradient-to-br ${tt.accent} p-6 flex flex-col`}
            >
              <h3 className={`font-headline text-xl font-bold uppercase tracking-tight mb-2 ${tt.textColor}`}>
                {t(`${tt.id}.name`)}
              </h3>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-4">
                {t(`${tt.id}.window`)}
              </p>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {t(`${tt.id}.summary`)}
              </p>
            </div>
          ))}
        </section>

        <section className="max-w-3xl mx-auto px-4">
          <div className="glass-panel rounded-2xl border border-white/[0.08] p-8 text-center">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-3">
              {t('waitlistHeading')}
            </h2>
            <p className="text-on-surface-variant text-sm mb-6">{t('waitlistBody')}</p>
            <NewsletterSignup variant="inline" source="article" />
          </div>
        </section>
      </main>
    </>
  )
}
