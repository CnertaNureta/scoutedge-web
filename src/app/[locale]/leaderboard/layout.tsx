import type { Metadata } from 'next'
import { buildOGMeta } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

interface Props {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const title = 'World Cup 2026 Predictions Leaderboard | KickOracle'
  const description =
    'Top KickOracle World Cup 2026 predictors ranked by points, accuracy, exact scores, and correct calls. Live global pick-em standings.'
  const alternates = buildAlternates(locale, '/leaderboard')
  return {
    title,
    description,
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

export default function LeaderboardLayout({ children }: Props) {
  return children
}
