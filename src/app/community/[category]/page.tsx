import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FORUM_CATEGORIES } from '@/data/community-data'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'

export function generateStaticParams() {
  return FORUM_CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)

  if (!cat) {
    return {
      title: 'Community Archive',
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${cat.title} Archive | KickOracle`,
    description: `${cat.title} is archived while KickOracle narrows v1 around narrative-first World Cup intelligence.`,
    alternates: { canonical: `https://kickoracle.com/community/${category}` },
    robots: { index: false, follow: false },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)

  if (!cat) {
    notFound()
  }

  return (
    <ArchivedPageNotice
      badge="Archived Forum Category"
      title={`${cat.title} Archive`}
      description={`${cat.title} is no longer an active discussion surface. KickOracle v1 is concentrating its primary experience around narrative-first World Cup intelligence instead of forum-first engagement.`}
      reasons={[
        `${cat.title} used to be part of the legacy community/forum graph, which is now outside the Sprint2 product boundary.`,
        'The active v1 journey prioritizes reading team, match, and player context instead of comment threads or discussion mechanics.',
        'This category remains addressable only as an archived reference route while the main surface stays focused and buildable.',
      ]}
      primaryAction={{ href: '/matches', label: 'Open Match Board' }}
      secondaryAction={{ href: '/teams', label: 'Browse Team Dossiers' }}
      note="For current product flows, use the match board, daily briefing, and team pages."
    />
  )
}
