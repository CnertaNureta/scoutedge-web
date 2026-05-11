import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import ArchivedPageNotice from '@/components/ui/ArchivedPageNotice'
import { buildAlternates } from '@/lib/seo/build-alternates'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Community Archive | KickOracle',
    description:
      'The legacy KickOracle community forum has been archived while v1 narrows around narrative-first World Cup intelligence.',
    alternates: buildAlternates(locale, '/community'),
    robots: { index: false, follow: false },
  }
}

export default async function CommunityPage() {
  const t = await getTranslations('archivedPage.communityArchive')
  return (
    <ArchivedPageNotice
      title={t('title')}
      description={t('description')}
      reasons={[t('reason1'), t('reason2'), t('reason3')]}
      primaryAction={{ href: '/daily-briefing', label: t('primaryAction') }}
      secondaryAction={{ href: '/blog', label: t('secondaryAction') }}
      note={t('note')}
    />
  )
}
