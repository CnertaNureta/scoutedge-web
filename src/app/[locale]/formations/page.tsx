import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { canonicalForLocale } from '@/lib/og-utils'
import { Link } from '@/i18n/navigation';
import { FormationProvider } from '@/components/formations/FormationContext';
import { Pitch } from '@/components/formations/Pitch';
import { Controls } from '@/components/formations/Controls';
import { ExportButton } from '@/components/formations/ExportButton';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'formationsPage' });
  return {
    title: t('heading'),
    description: t('description'),
    keywords: [
      'World Cup 2026 formation builder',
      'football formation builder',
      'soccer lineup builder',
      'FIFA 2026 starting XI',
    ],
    alternates: { canonical: canonicalForLocale(locale, '/formations') },
  };
}

function FormationApp({ heading, description, instruction }: { heading: string; description: string; instruction: string }) {
  return (
    <FormationProvider>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-[#f1f5f9] sm:text-4xl">
            ⚽ {heading}
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            {description}
          </p>
        </div>
        <ExportButton />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Pitch />
          <p className="mt-3 text-center text-xs text-[#475569]">
            {instruction}
          </p>
        </div>
        <aside>
          <Controls />
        </aside>
      </div>
    </FormationProvider>
  );
}

export default async function FormationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('formationsPage');

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2 text-sm text-[#64748b]">
        <Link href="/play" className="hover:text-[#f1f5f9] transition-colors">{t('fanZone')}</Link>
        <span>/</span>
        <span>{t('formationBuilder')}</span>
      </div>

      <FormationApp heading={t('heading')} description={t('description')} instruction={t('instruction')} />
    </main>
  );
}
