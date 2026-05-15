import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'

// Authenticated user dashboard — should never appear in SERPs. Follow=true
// preserves PageRank flow through any internal navigation.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: buildAlternates(locale, '/dashboard'),
    robots: { index: false, follow: true },
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
