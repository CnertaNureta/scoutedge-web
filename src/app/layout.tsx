import type { Metadata, Viewport } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'
import InstallBanner from '@/components/pwa/InstallBanner'
import { bebasNeue, epilogue, jetbrainsMono, manrope, oswald, plusJakartaSans } from './fonts'
import { Providers } from './providers'
import '@/styles/globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#121412' },
    { media: '(prefers-color-scheme: light)', color: '#a0d494' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'World Cup 2026 Narratives, Squad Analysis & Match Intelligence | ScoutEdge',
    template: '%s | ScoutEdge',
  },
  description:
    'Narrative-first World Cup 2026 intelligence for all 48 teams. Team identity, squad chemistry, player reports, and match context across the USA, Canada, and Mexico.',
  keywords: 'World Cup 2026, World Cup intelligence, World Cup narratives, football analysis, squad chemistry, player reports, World Cup 2026 schedule',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'ScoutEdge',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: 'ScoutEdge',
    locale: 'en_US',
    title: 'World Cup 2026 Narratives & Squad Analysis | ScoutEdge',
    description: 'Narrative-first intelligence and deep-dive analysis for all 48 teams competing in the 2026 FIFA World Cup.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@scoutedge_ai',
    creator: '@scoutedge_ai',
  },
  metadataBase: new URL('https://scoutedge.ai'),
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
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#121412',
    'msapplication-TileImage': '/icons/icon-192.png',
    'theme-color': '#a0d494',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${epilogue.variable} ${manrope.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
          <InstallBanner />
        </Providers>
      </body>
    </html>
  )
}
