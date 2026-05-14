import type { Metadata } from 'next'

// User-state route (member leagues) — exclude from search index. Keep follow
// so PageRank flows through internal links to public surfaces.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function LeaguesLayout({ children }: { children: React.ReactNode }) {
  return children
}
