import type { Metadata } from 'next'
import { buildOGMeta, breadcrumbJsonLd } from '@/lib/og-utils'
import SectionHeader from '@/components/ui/SectionHeader'
import { FORUM_CATEGORIES, COMMUNITY_STATS } from '@/data/community-data'
import CommunityClient from './CommunityClient'

export const metadata: Metadata = {
  title: 'Fan Community — World Cup 2026 Predictions & Discussion Forum',
  description:
    'Join the ScoutEdge community to discuss World Cup 2026 predictions, team squads, match analysis, and connect with football fans worldwide. Share your bold predictions and debate the favorites.',
  keywords:
    'World Cup 2026 forum, football discussion, World Cup predictions forum, fan community, soccer debate, World Cup 2026 fans',
  alternates: { canonical: 'https://scoutedge.ai/community' },
  ...buildOGMeta({
    title: 'Fan Community — World Cup 2026 Discussion Forum',
    description: 'Predict, debate, and connect with football fans worldwide. Share your World Cup 2026 takes.',
    url: 'https://scoutedge.ai/community',
  }),
}

export default function CommunityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://scoutedge.ai' },
        { name: 'Community', url: 'https://scoutedge.ai/community' },
      ])) }} />

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px] animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-accent/6 blur-[120px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary-container/20 border border-secondary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-secondary">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-slow" />
            {COMMUNITY_STATS.onlineNow} Fans Online
          </span>

          <h1 className="font-headline text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-wide uppercase mb-4">
            <span className="block text-on-surface">Fan</span>
            <span className="block gradient-text">Community</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
            Predict, debate, and connect with football fans from around the world.
            Share your World Cup 2026 takes and see who gets it right.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#forums"
              className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label font-bold uppercase tracking-widest hover:scale-105 transition-all"
            >
              Browse Forums
            </a>
            <a
              href="#giscus-container"
              className="border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] hover:border-primary/40 transition-all"
            >
              Start a Discussion
            </a>
          </div>
        </div>
      </section>

      {/* Forum Content */}
      <section id="forums" className="page-container pb-24">
        <SectionHeader className="mb-8">Discussion Forums</SectionHeader>
        <CommunityClient categories={FORUM_CATEGORIES} stats={COMMUNITY_STATS} />
      </section>
    </>
  )
}
