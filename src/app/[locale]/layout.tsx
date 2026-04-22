import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { LOCALE_CONFIGS } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'
import InstallBanner from '@/components/pwa/InstallBanner'
import UpsellBanner from '@/components/monetization/UpsellBanner'
import { Providers } from '../providers'
import { GoogleTagManagerScript, GoogleTagManagerNoScript } from '@/components/analytics/GoogleTagManager'
import { AdSenseScript } from '@/components/analytics/AdSenseScript'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

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

  const languages: Record<string, string> = { 'x-default': 'https://kickoracle.com' }
  for (const loc of routing.locales) {
    const cfg = LOCALE_CONFIGS[loc]
    languages[cfg.hreflang] = loc === 'en' ? 'https://kickoracle.com' : `https://kickoracle.com/${loc}`
  }

  return {
    title: {
      default: 'World Cup 2026 AI Predictions, City Guides & Fan Intelligence | KickOracle',
      template: '%s | KickOracle',
    },
    description:
      'AI-powered World Cup 2026 predictions, host city guides, and fan intelligence for all 48 teams.',
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
      locale: config?.hreflang ?? 'en',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@KickOracle',
      creator: '@KickOracle',
    },
    metadataBase: new URL('https://kickoracle.com'),
    alternates: { languages },
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
  const config = LOCALE_CONFIGS[locale as Locale]

  return (
    <>
      <GoogleTagManagerNoScript />
      <GoogleTagManagerScript />
      <AdSenseScript />
      <NextIntlClientProvider messages={messages}>
        <Providers>
          <div dir={config?.dir ?? 'ltr'} lang={locale}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-on-primary focus:px-6 focus:py-3 focus:rounded-lg focus:font-label focus:font-bold focus:text-sm focus:uppercase focus:tracking-widest focus:shadow-lg focus:outline-none"
            >
              {(messages as Record<string, Record<string, string>>).footer?.skipToContent ?? 'Skip to main content'}
            </a>
            <Header />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <ChatWidget />
            <UpsellBanner />
            <InstallBanner />
          </div>
        </Providers>
      </NextIntlClientProvider>
    </>
  )
}
