import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// Service-worker fallback — not meaningful to crawl. Keep follow=true so any
// internal links still pass PageRank.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/offline'),
    robots: { index: false, follow: true },
  }
}

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children
}
