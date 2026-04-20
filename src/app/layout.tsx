import type { Metadata, Viewport } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'
import InstallBanner from '@/components/pwa/InstallBanner'
import { bebasNeue, epilogue, jetbrainsMono, manrope, oswald, plusJakartaSans } from './fonts'
import { Providers } from './providers'
import { GoogleTagManagerScript, GoogleTagManagerNoScript } from '@/components/analytics/GoogleTagManager'
import '@/styles/globals.css'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: SURFACE.background },
    { media: '(prefers-color-scheme: light)', color: BRAND.primary },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'World Cup 2026 AI Predictions, City Guides & Fan Intelligence | KickOracle',
    template: '%s | KickOracle',
  },
  description:
    'AI-powered World Cup 2026 predictions, host city guides, and fan intelligence for all 48 teams. Win probabilities, squad analysis, travel planning, and match insights across the USA, Canada, and Mexico.',
  keywords: 'World Cup 2026, World Cup predictions, World Cup 2026 host cities, football analysis, squad chemistry, World Cup 2026 schedule, World Cup 2026 travel',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'KickOracle',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: 'KickOracle',
    locale: 'en_US',
    title: 'World Cup 2026 AI Predictions & Fan Intelligence | KickOracle',
    description: 'AI-powered predictions, city guides, and deep analysis for all 48 teams competing in the 2026 World Cup.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@KickOracle',
    creator: '@KickOracle',
  },
  metadataBase: new URL('https://kickoracle.com'),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${epilogue.variable} ${manrope.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <GoogleTagManagerNoScript />
        <GoogleTagManagerScript />
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-on-primary focus:px-6 focus:py-3 focus:rounded-lg focus:font-label focus:font-bold focus:text-sm focus:uppercase focus:tracking-widest focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
          <InstallBanner />
        </Providers>
      </body>
    </html>
  )
}
