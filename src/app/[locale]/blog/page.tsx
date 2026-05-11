import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo/build-alternates'
import { getAllPosts } from '@/lib/blog-service'
import Badge from '@/components/ui/Badge'
import BlogFilter from '@/components/blog/BlogFilter'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blogPage' })
  return {
    title: t('heading'),
    description: t('description'),
    keywords:
      'World Cup 2026 blog, World Cup 2026 analysis, World Cup 2026 predictions, World Cup 2026 guide, FIFA World Cup 2026 articles',
    alternates: buildAlternates(locale, '/blog'),
  }
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blogPage')
  const posts = getAllPosts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'World Cup 2026 Blog',
    description: 'Expert analysis and guides for the 2026 FIFA World Cup.',
    numberOfItems: posts.length,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="primary" size="md">{t('articles', { count: posts.length })}</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-6">
            <span className="gradient-text">{t('heading')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
      </section>

      {/* Posts grid with filtering */}
      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <BlogFilter posts={posts} />
      </section>
    </>
  )
}
