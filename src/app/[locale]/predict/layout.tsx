import type { Metadata } from 'next'

// User-state / auth-gated route — exclude from search index but keep PageRank
// flowing through internal links.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children
}
