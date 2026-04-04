import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'
import { bebasNeue, epilogue, jetbrainsMono, manrope, oswald, plusJakartaSans } from './fonts'
import { Providers } from './providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'World Cup 2026 AI Predictions, Squad Analysis & Match Previews | ScoutEdge',
    template: '%s | ScoutEdge',
  },
  description:
    'AI-powered predictions and analysis for all 48 World Cup 2026 teams. Squad chemistry indexes, win probabilities, player scouting reports, and match previews across the USA, Canada & Mexico.',
  keywords: 'World Cup 2026, World Cup 2026 predictions, FIFA World Cup 2026, soccer predictions, football analysis, team chemistry, player stats, World Cup 2026 schedule',
  openGraph: {
    type: 'website',
    siteName: 'ScoutEdge',
    locale: 'en_US',
    title: 'World Cup 2026 AI Predictions & Squad Analysis | ScoutEdge',
    description: 'AI-powered predictions and deep-dive analysis for all 48 teams competing in the 2026 FIFA World Cup.',
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
        </Providers>
      </body>
    </html>
  )
}
