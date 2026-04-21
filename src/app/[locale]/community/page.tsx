import type { Metadata } from 'next'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'

export const metadata: Metadata = {
  title: 'Community Archive | KickOracle',
  description:
    'The legacy KickOracle community forum has been archived while v1 narrows around narrative-first World Cup intelligence.',
  alternates: { canonical: 'https://kickoracle.com/community' },
  robots: { index: false, follow: false },
}

export default function CommunityPage() {
  return (
    <ArchivedPageNotice
      title="Community Archive"
      description="KickOracle v1 is being narrowed back to narrative-first World Cup intelligence, so the old community/forum surface has been downgraded out of the main product path."
      reasons={[
        'Sprint2 defines v1 as an intelligence product, not a social platform.',
        'Comments, fan forums, and discussion-first loops were pulling attention away from the core team, match, and player narratives.',
        'The archive remains reachable for reference while the main journey stays focused on reading and analysis.',
      ]}
      primaryAction={{ href: '/daily-briefing', label: 'Open Daily Briefing' }}
      secondaryAction={{ href: '/blog', label: 'Read Narrative Library' }}
      note="If you are looking for the current product surface, start with the daily briefing, match board, or team dossiers."
    />
  )
}
