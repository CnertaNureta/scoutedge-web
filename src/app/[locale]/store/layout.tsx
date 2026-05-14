import type { Metadata } from 'next'

// Auth-gated points store — not useful in search results, but follow links so
// PageRank reaches the discoverable pages it points to.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children
}
