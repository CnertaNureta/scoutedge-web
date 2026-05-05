import type { Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { bebasNeue, epilogue, jetbrainsMono, manrope, oswald, plusJakartaSans } from './fonts'
import '@/styles/globals.css'
import { AdSenseScript } from '@/components/analytics/AdSenseScript'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`dark ${epilogue.variable} ${manrope.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
      </head>
      <body className="min-h-screen flex flex-col">
        <AdSenseScript />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
