import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// Auth-gated daily challenges. User-specific state and login wall — exclude
// from search index but keep follow=true so PageRank flows through internal
// links to public surfaces.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/challenges'),
    robots: { index: false, follow: true },
  }
}

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return children
}
