import type { Metadata } from 'next'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'

export const metadata: Metadata = {
  title: 'Predictions Archive | ScoutEdge',
  description:
    'The legacy prediction challenge has been archived while ScoutEdge narrows v1 around narrative-first World Cup intelligence.',
  alternates: { canonical: 'https://scoutedge.ai/predictions' },
  robots: { index: false, follow: false },
}

export default function PredictionsPage() {
  return (
    <ArchivedPageNotice
      title="Prediction Challenge Archive"
      description="ScoutEdge is not shipping v1 as a pick-em or bracket game, so the old prediction challenge has been moved out of the primary product path."
      reasons={[
        'Sprint2 defines the product as narrative-first World Cup intelligence rather than a game mechanic.',
        'Model probabilities still appear where they support analysis, but challenge flows and social sharing are no longer core surfaces.',
        'This archived route is kept only to make the boundary explicit while the main experience is simplified.',
      ]}
      primaryAction={{ href: '/matches', label: 'Open Match Board' }}
      secondaryAction={{ href: '/daily-briefing', label: 'Read Daily Briefing' }}
      note="If you want the current model view, use the match board and team pages where probabilities stay tied to narrative context."
    />
  )
}
