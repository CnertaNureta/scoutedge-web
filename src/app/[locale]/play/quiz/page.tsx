import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo/build-alternates';
import { Link } from '@/i18n/navigation'
import { buildOGMeta, breadcrumbJsonLd, canonicalForLocale } from '@/lib/og-utils';
import QuizApp from '@/components/quiz/QuizApp';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const alternates = buildAlternates(locale, '/play/quiz');

  return {
    title: '2026 World Cup Quiz — Test Your Football Knowledge',
    description:
      'How well do you know the 2026 FIFA World Cup? Test your knowledge of history, players, host cities, and rules. Casual and timed modes available.',
    keywords: 'World Cup 2026 quiz, football knowledge quiz, FIFA World Cup trivia, soccer quiz 2026',
    alternates,
    ...buildOGMeta({
      title: '2026 World Cup Quiz — Test Your Football Knowledge',
      description: 'How well do you know the 2026 FIFA World Cup? Casual and timed modes. 4 categories.',
      url: alternates.canonical,
      locale,
    }),
  };
}

export default async function QuizPage({ params }: Props) {
  const { locale } = await params;
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', url: canonicalForLocale(locale, '/') },
    { name: 'Fan Zone', url: canonicalForLocale(locale, '/play') },
    { name: 'Quiz', url: canonicalForLocale(locale, '/play/quiz') },
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
