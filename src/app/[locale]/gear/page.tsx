import type { Metadata } from 'next'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'World Cup 2026 Gear — Jerseys, Match Balls & Fan Merchandise',
  description:
    'Browse World Cup 2026 gear. Team jerseys, official match ball collection, and fan merchandise with links to trusted retailers.',
  keywords:
    'World Cup 2026 jerseys, World Cup 2026 gear, World Cup 2026 merchandise, World Cup 2026 ball',
  alternates: { canonical: 'https://kickoracle.com/gear' },
}

export default function GearPage() {
  return (
    <>
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Fan Shop</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            World Cup<br />
            <span className="gradient-text">Gear</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Jerseys, match balls, and fan merchandise for the 2026 World Cup.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">Browse Gear</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/gear/jerseys" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">👕</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                Jerseys
              </h3>
              <p className="text-on-surface-variant text-sm">
                Home, away, and third kits for all 48 teams.
              </p>
            </GlassCard>
          </Link>
          <Link href="/gear/ball" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">⚽</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                Match Ball
              </h3>
              <p className="text-on-surface-variant text-sm">
                Official match ball encyclopedia and history.
              </p>
            </GlassCard>
          </Link>
        </div>
      </section>
    </>
  )
}
