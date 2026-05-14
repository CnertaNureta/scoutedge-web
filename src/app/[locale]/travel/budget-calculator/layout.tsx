import type { Metadata } from 'next'
import { buildOGMeta } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'

interface Props {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const title = 'World Cup 2026 Budget Calculator — Trip Cost Estimator | KickOracle'
  const description =
    'Plan your 2026 World Cup trip: estimate hotels, tickets, food, and transport for any host city. Budget, mid-range, and luxury tiers in USD, MXN, and CAD.'
  const alternates = buildAlternates(locale, '/travel/budget-calculator')
  return {
    title,
    description,
    keywords:
      'World Cup 2026 budget, World Cup trip cost, World Cup 2026 ticket prices, FIFA 2026 hotel budget, World Cup travel calculator',
    alternates,
    ...buildOGMeta({ title, description, url: alternates.canonical, locale }),
  }
}

export default function BudgetCalculatorLayout({ children }: Props) {
  return children
}
