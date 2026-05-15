import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// Auth-gated points store — not useful in search results, but follow links so
// PageRank reaches the discoverable pages it points to.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/store'),
    robots: { index: false, follow: true },
  }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children
}
