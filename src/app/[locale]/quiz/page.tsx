import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { breadcrumbJsonLd, buildOGMeta } from '@/lib/og-utils'
import HeroRegistrationCta from '@/components/ui/HeroRegistrationCta'
import QuizWithGate from '@/components/quiz/QuizWithGate'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'quizPage' })
  return {
    title: t('heading'),
    description: t('description'),
    alternates: { canonical: canonicalForLocale(locale, '/quiz') },
    ...buildOGMeta({
      title: t('heading'),
      description: t('description'),
      url: 'https://kickoracle.com/quiz',
    }),
  }
}

export default async function QuizPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('quizPage')
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', url: 'https://kickoracle.com' },
      { name: t('heading'), url: 'https://kickoracle.com/quiz' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Quiz',
      name: t('heading'),
      description: t('description'),
      educationalUse: 'Practice',
      learningResourceType: 'Quiz',
    },
  ]

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      {/* Hero */}
      <section className="relative py-16 md:py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-secondary">
            {t('badge')}
          </span>

          <h1 className="font-headline text-[clamp(2.2rem,7vw,5.5rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block gradient-text">{t('heading')}</span>
          </h1>

          <p className="font-body text-base md:text-lg text-on-surface-variant max-w-xl mx-auto mb-8">
            {t('description')}
          </p>

          <HeroRegistrationCta
            headline={t('ctaText')}
            cta={t('ctaButton')}
            className="justify-center"
          />
        </div>
      </section>

      {/* Quiz */}
      <section className="pb-20">
        <QuizWithGate />
      </section>
    </>
  )
}
