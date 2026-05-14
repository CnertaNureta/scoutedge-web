import type { Metadata } from 'next'

// Auth-gated daily challenges. User-specific state and login wall — exclude
// from search index but keep follow=true so PageRank flows through internal
// links to public surfaces.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return children
}
