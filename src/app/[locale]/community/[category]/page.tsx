import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FORUM_CATEGORIES } from '@/data/community-data'
import { buildAlternates } from '@/lib/seo/build-alternates'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'

export function generateStaticParams() {
  return FORUM_CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)

  if (!cat) {
    return {
      title: 'Community Archive',
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${cat.title} Archive | KickOracle`,
    description: `${cat.title} is archived while KickOracle narrows v1 around narrative-first World Cup intelligence.`,
    alternates: buildAlternates(locale, `/community/${category}`),
    robots: { index: false, follow: false },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)

  if (!cat) {
    notFound()
  }

  const t = await getTranslations('archivedPage.communityCategory')
  const title = cat.title

  return (
    <ArchivedPageNotice
      badge={t('badge')}
      title={t('title', { title })}
      description={t('description', { title })}
      reasons={[
        t('reason1', { title }),
        t('reason2'),
        t('reason3'),
      ]}
      primaryAction={{ href: '/matches', label: t('primaryAction') }}
      secondaryAction={{ href: '/teams', label: t('secondaryAction') }}
      note={t('note')}
    />
  )
}
