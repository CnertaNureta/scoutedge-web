import type { Metadata } from 'next'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'

export const metadata: Metadata = {
  title: 'Pricing Archive | ScoutEdge',
  description:
    'Pricing and subscription positioning have been downgraded while ScoutEdge v1 focuses on narrative-first World Cup intelligence.',
  robots: { index: false, follow: false },
}

export default function PricingPage() {
  return (
    <ArchivedPageNotice
      title="Pricing Archive"
      description="Pricing and subscription packaging are no longer leading the ScoutEdge experience while v1 focuses on open, narrative-first World Cup intelligence."
      reasons={[
        'Sprint2 does not position ScoutEdge v1 as a subscription-led product journey.',
        'Pricing-first messaging was overexposing monetization ahead of the core intelligence surface.',
        'The route remains reachable as an archive marker while navigation and homepage flows stay focused on reading and analysis.',
      ]}
      primaryAction={{ href: '/teams', label: 'Browse Team Dossiers' }}
      secondaryAction={{ href: '/daily-briefing', label: 'Read Daily Briefing' }}
      note="Core intelligence pages remain the primary experience while packaging decisions are deprioritized."
    />
  )
}
