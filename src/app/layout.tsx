import type { Metadata } from 'next'
import { Epilogue, Manrope, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import '@/styles/globals.css'

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-headline',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-label',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ScoutEdge — AI-Powered World Cup 2026 Intelligence',
    template: '%s | ScoutEdge',
  },
  description:
    'AI-powered analysis of all 48 World Cup 2026 teams. Squad chemistry indexes, win probability predictions, player intelligence reports, and match previews.',
  keywords: 'World Cup 2026, FIFA World Cup, football analysis, soccer predictions, team chemistry, player stats',
  openGraph: {
    type: 'website',
    siteName: 'ScoutEdge',
    title: 'ScoutEdge — AI-Powered World Cup 2026 Intelligence',
    description: 'Deep-dive into all 48 teams competing in the 2026 FIFA World Cup.',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${epilogue.variable} ${manrope.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
