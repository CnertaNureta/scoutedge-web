import Link from 'next/link'
import type { Metadata } from 'next'
import { routing } from '@/i18n/routing'

export const metadata: Metadata = {
  title: '404 — Page not found | KickOracle',
  robots: { index: false, follow: false },
}

/**
 * Global root not-found — rendered when no route matches at all, including
 * paths that escape the [locale] segment. Sits OUTSIDE the locale layout
 * so it has no NextIntlClientProvider; must use plain next/link rather than
 * the i18n Link helper, which calls useLocale() and would throw "No intl
 * context found".
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6 text-center">
        <p className="text-sm uppercase tracking-widest text-white/50 mb-2">404</p>
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Page not found</h1>
        <p className="text-white/70 max-w-md mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href={`/${routing.defaultLocale}`}
          className="px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition"
        >
          Back to homepage
        </Link>
      </body>
    </html>
  )
}
