import type { Metadata } from 'next'

// Auth-gated user wallet (KickOracle Points balance + earning ledger). Not
// useful in SERPs; follow=true preserves PageRank to public destinations.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return children
}
