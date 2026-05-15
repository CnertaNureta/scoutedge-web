import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// Auth-gated user wallet (KickOracle Points balance + earning ledger). Not
// useful in SERPs; follow=true preserves PageRank to public destinations.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/points'),
    robots: { index: false, follow: true },
  }
}

export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return children
}
