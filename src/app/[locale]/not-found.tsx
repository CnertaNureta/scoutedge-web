import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = {
  title: '404 — Page not found',
  robots: { index: false, follow: false },
}

export default async function LocaleNotFound() {
  const t = await getTranslations('notFound').catch(() => null)

  const heading = t ? t('heading') : 'Page not found'
  const description = t
    ? t('description')
    : 'The page you are looking for does not exist or has moved.'
  const cta = t ? t('cta') : 'Back to homepage'

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center py-16">
      <p className="text-sm uppercase tracking-widest text-white/50 mb-2">404</p>
      <h1 className="text-3xl md:text-5xl font-bold mb-4 text-on-surface">{heading}</h1>
      <p className="text-on-surface/70 max-w-md mb-8">{description}</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary/90 transition"
      >
        {cta}
      </Link>
    </div>
  )
}
