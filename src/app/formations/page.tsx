import type { Metadata } from 'next';
import Link from 'next/link';
import { FormationProvider } from '@/components/formations/FormationContext';
import { Pitch } from '@/components/formations/Pitch';
import { Controls } from '@/components/formations/Controls';
import { ExportButton } from '@/components/formations/ExportButton';

export const metadata: Metadata = {
  title: '2026 World Cup Formation Builder - Draft Your Starting XI',
  description:
    'Build your ideal World Cup 2026 starting XI. Choose from all 48 squads, pick a formation, drag players to positions, and share your lineup.',
  keywords: [
    'World Cup 2026 formation builder',
    'football formation builder',
    'soccer lineup builder',
    'FIFA 2026 starting XI',
  ],
  alternates: { canonical: '/formations' },
};

function FormationApp() {
  return (
    <FormationProvider>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-black tracking-tight text-[#f1f5f9] sm:text-4xl">
            ⚽ Formation Builder
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Draft your ideal World Cup 2026 XI — all 48 squads
          </p>
        </div>
        <ExportButton />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Pitch />
          <p className="mt-3 text-center text-xs text-[#475569]">
            Drag players to swap positions on the pitch
          </p>
        </div>
        <aside>
          <Controls />
        </aside>
      </div>
    </FormationProvider>
  );
}

export default function FormationsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2 text-sm text-[#64748b]">
        <Link href="/play" className="hover:text-[#f1f5f9] transition-colors">Fan Zone</Link>
        <span>/</span>
        <span>Formation Builder</span>
      </div>

      <FormationApp />
    </main>
  );
}
