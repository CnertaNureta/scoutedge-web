import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation'
import WallpaperGenerator from '@/components/wallpapers/WallpaperGenerator';

export const metadata: Metadata = {
  title: 'World Cup 2026 HD Wallpapers by Team - Free Download',
  description:
    'Create and download custom World Cup 2026 wallpapers for all 48 teams. Choose your team, device size, and template. Free PNG download.',
  keywords: [
    'World Cup 2026 wallpapers',
    'FIFA World Cup wallpaper download',
    'football team wallpapers 2026',
    'soccer phone wallpaper',
  ],
  alternates: { canonical: '/gear/wallpapers' },
};

export default function WallpapersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2 text-sm text-[#64748b]">
        <Link href="/gear" className="hover:text-[#f1f5f9] transition-colors">Gear</Link>
        <span>/</span>
        <span>Wallpapers</span>
      </div>

      <section className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-1.5 text-sm font-medium text-[#60a5fa]">
          FIFA World Cup 2026 — 48 Teams
        </div>
        <h1 className="mb-4 font-[var(--font-display)] text-4xl font-black tracking-tight text-[#f1f5f9] sm:text-5xl">
          World Cup 2026
          <br />
          <span className="bg-gradient-to-r from-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent">
            Wallpaper Generator
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-[#94a3b8]">
          Custom wallpapers for all 48 nations. Choose your team, pick a template, and download a
          full-resolution PNG for phone, tablet, or desktop.
        </p>
      </section>

      <WallpaperGenerator />
    </main>
  );
}
