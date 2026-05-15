import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// User-state / auth-gated route — exclude from search index but keep PageRank
// flowing through internal links.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/predict'),
    robots: { index: false, follow: true },
  }
}

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children
}
