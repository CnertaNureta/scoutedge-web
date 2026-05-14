import type { Metadata } from 'next'

// Authenticated user dashboard — should never appear in SERPs. Follow=true
// preserves PageRank flow through any internal navigation.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
