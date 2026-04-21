import type { Metadata } from 'next'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'World Cup 2026 Sticker Album Tracker — Panini Collection Tool',
  description:
    'Track your World Cup 2026 Panini sticker collection. Find missing stickers, calculate completion cost, and connect with traders.',
  keywords:
    'World Cup 2026 stickers, Panini World Cup 2026, sticker tracker, sticker collection, Panini album 2026',
  alternates: { canonical: 'https://kickoracle.com/stickers' },
}

export default function StickersPage() {
  return (
    <>
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-tertiary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="tertiary" size="md">Collection Tool</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            Sticker<br />
            <span className="gradient-text">Album</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Track your 2026 World Cup Panini sticker collection, find missing stickers,
            and estimate your completion cost.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">Sticker Tools</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/stickers/tracker" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">📋</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                Collection Tracker
              </h3>
              <p className="text-on-surface-variant text-sm">
                Mark which stickers you have and track your completion progress.
              </p>
            </GlassCard>
          </Link>
          <Link href="/stickers/cost-calculator" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">🧮</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                Cost Calculator
              </h3>
              <p className="text-on-surface-variant text-sm">
                Estimate how much it will cost to complete your album.
              </p>
            </GlassCard>
          </Link>
        </div>
      </section>
    </>
  )
}
