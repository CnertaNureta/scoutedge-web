import type { Metadata } from 'next'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'

export const metadata: Metadata = {
  title: 'World Cup 2026 Official Match Ball — History & Encyclopedia',
  description: 'The official match ball of the 2026 World Cup. Design, technology, and the complete history of World Cup match balls from 1930 to 2026.',
  alternates: { canonical: 'https://kickoracle.com/gear/ball' },
}

export default function BallPage() {
  return (
    <>
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">Encyclopedia</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            Match <span className="gradient-text">Ball</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-8">
            The story of the 2026 World Cup official match ball and the complete history
            of World Cup match balls.
          </p>
          <Link
            href="/gear/ball/history/2022"
            className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            View Ball History
          </Link>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <GlassCard className="p-6 md:p-8 text-center">
          <p className="text-on-surface-variant leading-relaxed">
            Match ball encyclopedia content coming soon.
          </p>
        </GlassCard>
      </section>
    </>
  )
}
