import type { Metadata } from 'next';
import Link from 'next/link';
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils';
import QuizApp from '@/components/quiz/QuizApp';

export const metadata: Metadata = {
  title: '2026 World Cup Quiz — Test Your Football Knowledge',
  description:
    'How well do you know the 2026 FIFA World Cup? Test your knowledge of history, players, host cities, and rules. Casual and timed modes available.',
  keywords: 'World Cup 2026 quiz, football knowledge quiz, FIFA World Cup trivia, soccer quiz 2026',
  alternates: { canonical: 'https://kickoracle.com/play/quiz' },
  ...buildOGMeta({
    title: '2026 World Cup Quiz — Test Your Football Knowledge',
    description: 'How well do you know the 2026 FIFA World Cup? Casual and timed modes. 4 categories.',
    url: 'https://kickoracle.com/play/quiz',
  }),
};

export default function QuizPage() {
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', url: 'https://kickoracle.com' },
    { name: 'Fan Zone', url: 'https://kickoracle.com/play' },
    { name: 'Quiz', url: 'https://kickoracle.com/play/quiz' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
          <Link href="/play" className="hover:text-on-surface transition-colors">Fan Zone</Link>
          <span>/</span>
          <span>Quiz</span>
        </div>

        <QuizApp />
      </main>
    </>
  );
}
