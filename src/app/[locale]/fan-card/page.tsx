import type { Metadata } from 'next'
import { buildOGMeta } from '@/lib/og-utils'
import { getAllTeams } from '@/lib/data-service'
import FanCardBuilder from './FanCardBuilder'

export const metadata: Metadata = {
  title: 'Fan Identity Card — Create & Share Your World Cup 2026 Card',
  description:
    'Build your personalized World Cup 2026 Fan Identity Card. Choose your team, earn badges, pick a card theme, and share on Twitter & WhatsApp.',
  keywords:
    'World Cup 2026 fan card, fan identity card, World Cup share card, World Cup 2026 badges, football fan profile',
  alternates: { canonical: 'https://kickoracle.com/fan-card' },
  ...buildOGMeta({
    title: 'Fan Identity Card — World Cup 2026',
    description:
      'Create your personalized Fan Identity Card and share it with friends. Choose your team, earn badges, and show your World Cup spirit.',
    url: 'https://kickoracle.com/fan-card',
  }),
}

export default function FanCardPage() {
  const allTeams = getAllTeams()
    .map((t) => ({ slug: t.slug, name: t.name, flag: t.flag }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      {/* Hero */}
      <section className="relative py-16 md:py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[180px] animate-float" />
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px] animate-float"
          style={{ animationDelay: '2s' }}
        />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-primary/15 text-primary border border-primary/20 font-label font-semibold uppercase tracking-widest rounded-full px-4 py-1 text-xs mb-4">
            Fan Identity
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,6rem)] leading-[0.9] tracking-wide uppercase mt-4 mb-4">
            <span className="block text-on-surface">Your</span>
            <span className="block gradient-text">Fan Card</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
            Build your personalized World Cup 2026 identity card. Pick your team, choose your
            style, earn badges, and share with friends.
          </p>
        </div>
      </section>

      {/* Builder */}
      <section className="page-container pb-24">
        <FanCardBuilder teams={allTeams} />
      </section>
    </>
  )
}
