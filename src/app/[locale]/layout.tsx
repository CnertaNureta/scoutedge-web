import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { LOCALE_CONFIGS } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ClientRuntimeWidgets from '@/components/layout/ClientRuntimeWidgets'
import CountdownStrip from '@/components/marketing/CountdownStrip'
import RenderProfiler from '@/components/debug/RenderProfiler'
import AdSlot from '@/components/monetization/AdSlot'
import { jsonLdGraph, websiteJsonLd, organizationJsonLd } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Providers } from '../providers'
import { GoogleTagManagerScript, GoogleTagManagerNoScript } from '@/components/analytics/GoogleTagManager'
import { BRAND, SURFACE } from '@/lib/brand-tokens'
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '@/lib/adsense'
import { pickClientMessages } from '@/i18n/client-namespaces'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  const config = LOCALE_CONFIGS[locale as Locale]
  const alternates = buildAlternates(locale, '/')

  return {
    title: {
      default: 'World Cup 2026 AI Predictions, City Guides & Fan Intelligence | KickOracle',
      template: '%s | KickOracle',
    },
    description:
      'Your North America 2026 match-day intelligence — fixtures, flights, and form in one brief. AI predictions, host-city travel guides, and team dossiers for all 48 nations.',
    keywords: 'World Cup 2026, World Cup predictions, football analysis, squad chemistry',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      title: 'KickOracle',
      statusBarStyle: 'black-translucent',
    },
    openGraph: {
      type: 'website',
      siteName: 'KickOracle',
      url: alternates.canonical,
      locale: (config?.hreflang ?? 'en').replace('-', '_'),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@KickOracle',
      creator: '@KickOracle',
    },
    metadataBase: new URL('https://kickoracle.com'),
    alternates,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    other: {
      'google-adsense-account': ADSENSE_PUBLISHER_ID,
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': SURFACE.background,
      'msapplication-TileImage': '/icons/icon-192.png',
      'theme-color': BRAND.primary,
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const clientMessages = pickClientMessages(messages as Record<string, unknown>)
  const config = LOCALE_CONFIGS[locale as Locale]

  const siteJsonLd = jsonLdGraph([websiteJsonLd(), organizationJsonLd()])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <GoogleTagManagerNoScript />
      <GoogleTagManagerScript />
      <NextIntlClientProvider messages={clientMessages}>
        <RenderProfiler>
          <Providers>
            <div dir={config?.dir ?? 'ltr'} lang={locale}>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-on-primary focus:px-6 focus:py-3 focus:rounded-lg focus:font-label focus:font-bold focus:text-sm focus:uppercase focus:tracking-widest focus:shadow-lg focus:outline-none"
              >
                {(messages as Record<string, Record<string, string>>).footer?.skipToContent ?? 'Skip to main content'}
              </a>
              <CountdownStrip />
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              {ADSENSE_ENABLED ? (
                <div className="w-full px-4 py-6">
                  <AdSlot format="leaderboard" />
                </div>
              ) : null}
              <Footer />
              <ClientRuntimeWidgets />
            </div>
          </Providers>
        </RenderProfiler>
      </NextIntlClientProvider>
    </>
  )
}
