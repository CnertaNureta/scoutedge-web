import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'playPage' })
  return {
    title: t('heading'),
    description: t('description'),
    alternates: { canonical: '/play' },
  }
}

export default async function PlayPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('playPage')

  const features = [
    { href: '/play/quiz', emoji: '🧠', title: t('quiz'), desc: t('quizDesc'), badge: t('quizBadge') },
    { href: '/formations', emoji: '⚽', title: t('formations'), desc: t('formationsDesc'), badge: t('formationsBadge') },
    { href: '/gear/wallpapers', emoji: '🖼️', title: t('wallpapers'), desc: t('wallpapersDesc'), badge: t('wallpapersBadge') },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <section className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e94560]/30 bg-[#e94560]/10 px-4 py-1.5 text-sm font-medium text-[#e94560]">
          {t('badge')}
        </div>
        <h1 className="mb-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-[#f1f5f9] sm:text-5xl">
          <span className="bg-gradient-to-r from-[#e94560] to-[#f5a623] bg-clip-text text-transparent">
            {t('heading')}
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-[#94a3b8]">
          {t('description')}
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group flex flex-col gap-4 rounded-xl border border-[#1e293b] bg-[#111827] p-6 transition-all hover:border-[#e94560]/50 hover:bg-[#111827]/80"
          >
            <div className="flex items-start justify-between">
              <span className="text-4xl">{f.emoji}</span>
              <span className="rounded-full border border-[#1e293b] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
                {f.badge}
              </span>
            </div>
            <div>
              <h2 className="mb-1 text-lg font-bold text-[#f1f5f9] group-hover:text-[#e94560] transition-colors">
                {f.title}
              </h2>
              <p className="text-sm text-[#94a3b8]">{f.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
