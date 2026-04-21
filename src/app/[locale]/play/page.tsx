import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fan Zone — World Cup 2026 Games & Quizzes',
  description:
    'Test your World Cup knowledge, build your dream formation, and explore fan content for the 2026 FIFA World Cup.',
  alternates: { canonical: '/play' },
};

const FEATURES = [
  {
    href: '/play/quiz',
    emoji: '🧠',
    title: 'World Cup Quiz',
    description: 'Test your football knowledge across history, players, host cities, and rules. Casual or timed modes.',
    badge: '20+ questions',
  },
  {
    href: '/formations',
    emoji: '⚽',
    title: 'Formation Builder',
    description: 'Draft your ideal starting XI from all 48 squads. Drag and drop players, pick formations, share your lineup.',
    badge: '48 teams',
  },
  {
    href: '/gear/wallpapers',
    emoji: '🖼️',
    title: 'Wallpaper Generator',
    description: 'Create custom wallpapers for your favourite team. Phone, tablet, or desktop — free PNG download.',
    badge: 'Free download',
  },
];

export default function PlayPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <section className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e94560]/30 bg-[#e94560]/10 px-4 py-1.5 text-sm font-medium text-[#e94560]">
          Fan Zone
        </div>
        <h1 className="mb-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-[#f1f5f9] sm:text-5xl">
          World Cup 2026
          <br />
          <span className="bg-gradient-to-r from-[#e94560] to-[#f5a623] bg-clip-text text-transparent">
            Fan Zone
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-[#94a3b8]">
          Quizzes, formation builders, and fan tools for the biggest football tournament on the planet.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((f) => (
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
              <p className="text-sm text-[#94a3b8]">{f.description}</p>
            </div>
            <span className="mt-auto text-sm font-medium text-[#e94560] opacity-0 group-hover:opacity-100 transition-opacity">
              Play now →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
