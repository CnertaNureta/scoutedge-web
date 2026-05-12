import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { Link } from '@/i18n/navigation'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gearPage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords:
      'World Cup 2026 jerseys, World Cup 2026 gear, World Cup 2026 merchandise, World Cup 2026 ball',
    alternates: buildAlternates(locale, '/gear'),
  }
}

export default async function GearPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('gearPage')

  return (
    <>
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[180px]" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">{t('badge')}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            World Cup<br />
            <span className="gradient-text">{t('heading').split(' ').pop()}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">{t('browseGear')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/gear/jerseys" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">👕</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                {t('jerseys')}
              </h3>
              <p className="text-on-surface-variant text-sm">
                {t('jerseysDesc')}
              </p>
            </GlassCard>
          </Link>
          <Link href="/gear/ball" className="group">
            <GlassCard className="p-8 text-center hover:bg-surface-bright transition-all hover:-translate-y-1" hover>
              <span className="text-4xl block mb-4">⚽</span>
              <h3 className="font-headline text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                {t('matchBall')}
              </h3>
              <p className="text-on-surface-variant text-sm">
                {t('matchBallDesc')}
              </p>
            </GlassCard>
          </Link>
        </div>
      </section>
    </>
  )
}
