import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog-service'
import Badge from '@/components/ui/Badge'
import BlogFilter from '@/components/blog/BlogFilter'

export const metadata: Metadata = {
  title: 'World Cup 2026 Blog: Analysis, Predictions & Guides',
  description:
    'Expert analysis and AI-powered insights for the 2026 FIFA World Cup. In-depth guides, team predictions, group breakdowns, and everything you need to know about the biggest World Cup in history.',
  keywords:
    'World Cup 2026 blog, World Cup 2026 analysis, World Cup 2026 predictions, World Cup 2026 guide, FIFA World Cup 2026 articles',
  alternates: { canonical: 'https://scoutedge.ai/blog' },
}

export default function BlogPage() {
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
          <Badge variant="primary" size="md">{posts.length} Articles</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-6">
            World Cup 2026<br />
            <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Deep-dive analysis, predictions, and plain-English guides written for real football fans.
            No jargon, no fluff — just the insights you need.
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
