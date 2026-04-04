import type { Metadata } from 'next'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import { getLatestNarrativePost } from '@/lib/blog-service'
import MatchesClient from './MatchesClient'

export const metadata: Metadata = {
  title: 'World Cup 2026 Match Schedule: Fixtures, Kick-Off Times & Predictions',
  description:
    'Complete World Cup 2026 match schedule with all 72 group-stage fixtures. AI-powered win probability predictions, venues, and kick-off times across 16 host cities in the USA, Canada & Mexico.',
  keywords:
    'World Cup 2026 schedule, World Cup 2026 fixtures, World Cup 2026 matches, World Cup 2026 kick off times, World Cup 2026 predictions',
  alternates: { canonical: 'https://scoutedge.ai/matches' },
}

export default function MatchesPage() {
  const featuredPreview = getLatestNarrativePost('match_preview')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Group-Stage Matches',
    description:
      'All 72 group-stage fixtures for the 2026 FIFA World Cup with AI predictions.',
    numberOfItems: 72,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {featuredPreview && (
        <section className="max-w-[1440px] mx-auto px-6 pt-10">
          <GlassCard className="p-6 md:p-7 border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <Badge variant="primary" size="sm">Featured Match Preview</Badge>
                <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mt-3 mb-3">
                  {featuredPreview.title}
                </h2>
                <p className="text-on-surface-variant leading-relaxed mb-4">
                  {featuredPreview.description}
                </p>
                <div className="flex flex-wrap gap-3 text-xs font-label uppercase tracking-widest text-on-surface-variant">
                  {featuredPreview.sourceDate && <span>Source date {featuredPreview.sourceDate}</span>}
                  {featuredPreview.factCount && <span>{featuredPreview.factCount} anchored facts</span>}
                </div>
              </div>
              <Link
                href={`/blog/${featuredPreview.slug}`}
                className="inline-flex items-center rounded-full border border-primary/40 px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
              >
                Read Preview
              </Link>
            </div>
          </GlassCard>
        </section>
      )}
      <MatchesClient />
    </>
  )
}
