import type { Metadata } from 'next'
import { Bebas_Neue, Inter, Oswald, JetBrains_Mono } from 'next/font/google'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'
import { Providers } from './providers'
import '@/styles/globals.css'

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'World Cup 2026 Narratives, Squad Analysis & Match Intelligence | ScoutEdge',
    template: '%s | ScoutEdge',
  },
  description:
    'Narrative-first World Cup 2026 intelligence for all 48 teams. Team identity, squad chemistry, player reports, and match context across the USA, Canada, and Mexico.',
  keywords: 'World Cup 2026, World Cup intelligence, World Cup narratives, football analysis, squad chemistry, player reports, World Cup 2026 schedule',
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${bebasNeue.variable} ${inter.variable} ${oswald.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  )
}
