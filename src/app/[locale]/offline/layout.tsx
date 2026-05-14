import type { Metadata } from 'next'

// Service-worker fallback — not meaningful to crawl. Keep follow=true so any
// internal links still pass PageRank.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children
}
