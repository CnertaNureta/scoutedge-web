import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// User-state route (member leagues) — exclude from search index. Keep follow
// so PageRank flows through internal links to public surfaces.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/leagues'),
    robots: { index: false, follow: true },
  }
}

export default function LeaguesLayout({ children }: { children: React.ReactNode }) {
  return children
}
