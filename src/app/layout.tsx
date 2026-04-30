import type { Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { bebasNeue, epilogue, jetbrainsMono, manrope, oswald, plusJakartaSans } from './fonts'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`dark ${epilogue.variable} ${manrope.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
