import type { Metadata } from 'next'
import { breadcrumbJsonLd, buildOGMeta } from '@/lib/og-utils'
import HeroRegistrationCta from '@/components/ui/HeroRegistrationCta'
import QuizWithGate from '@/components/quiz/QuizWithGate'

export const metadata: Metadata = {
  title: 'World Cup 2026 Quiz — Test Your Football Knowledge & Win Badges',
  description:
    'Free World Cup 2026 quiz: test your football trivia, predict match scores, and track your accuracy across the tournament. Earn accuracy badges. Compare vs. AI.',
  keywords:
    'world cup 2026 quiz, football world cup trivia 2026, world cup prediction game 2026, world cup 2026 challenge, football trivia',
  alternates: { canonical: 'https://kickoracle.com/quiz' },
  ...buildOGMeta({
    title: 'World Cup 2026 Quiz — Football Trivia & Prediction Game',
    description: 'Free quiz: test your football knowledge across 4 categories. Earn badges. Compare vs. AI.',
    url: 'https://kickoracle.com/quiz',
  }),
}

export default function QuizPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', url: 'https://kickoracle.com' },
      { name: 'Quiz', url: 'https://kickoracle.com/quiz' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Quiz',
      name: 'World Cup 2026 Football Quiz',
      description: 'Test your knowledge of the 2026 FIFA World Cup — history, squads, host cities, and rules.',
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
            4 Categories · Timed &amp; Casual Modes
          </span>

          <h1 className="font-headline text-[clamp(2.2rem,7vw,5.5rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block text-on-surface">World Cup</span>
            <span className="block gradient-text">2026 Quiz</span>
          </h1>

          <p className="font-body text-base md:text-lg text-on-surface-variant max-w-xl mx-auto mb-8">
            Challenge yourself with football trivia across history, squads, host cities, and predictions.
            Earn accuracy badges and compare your score against AI.
          </p>

          <HeroRegistrationCta
            headline="Track your scores and streaks — free."
            cta="Create Free Account"
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
