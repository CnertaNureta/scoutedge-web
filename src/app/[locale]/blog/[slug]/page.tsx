import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/blog-service'
import { notFound } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import ArticleSubscribeBar from '@/components/monetization/ArticleSubscribeBar'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Article Not Found' }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords.join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.lastUpdated,
      authors: [post.author],
      siteName: 'KickOracle',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: { canonical: `https://kickoracle.com/blog/${slug}` },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = getAllPosts().filter((p) => p.slug !== slug).slice(0, 3)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.lastUpdated,
    wordCount: post.wordCount,
    author: { '@type': 'Organization', name: 'KickOracle', url: 'https://kickoracle.com' },
    publisher: { '@type': 'Organization', name: 'KickOracle', url: 'https://kickoracle.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://kickoracle.com/blog/${slug}` },
    keywords: post.keywords.join(', '),
  }

  // FAQ schema (if post has FAQs)
  const faqJsonLd = post.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  } : null

  // Breadcrumb schema
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kickoracle.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://kickoracle.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://kickoracle.com/blog/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Header */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="relative z-10 max-w-[800px] mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span aria-hidden="true">/</span>
            <span className="text-on-surface truncate">{post.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-4">
            <Badge variant="primary" size="sm">{post.category}</Badge>
            <span className="font-label text-xs text-on-surface-variant">{post.readingTime} min read</span>
            <span className="font-label text-xs text-on-surface-variant">· {post.wordCount.toLocaleString()} words</span>
          </div>

          <h1 className="font-headline text-3xl md:text-5xl tracking-wide uppercase mb-6 leading-tight">
            {post.title}
          </h1>

          <p className="text-on-surface-variant text-lg leading-relaxed mb-6 italic">{post.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant pb-6 border-b border-white/[0.08]">
            <span>By <span className="text-on-surface font-semibold">{post.author}</span></span>
            <span>·</span>
            <time dateTime={post.date}>
              Published {new Date(post.date).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
            {post.lastUpdated !== post.date && (
              <>
                <span>·</span>
                <time dateTime={post.lastUpdated}>
                  Updated {new Date(post.lastUpdated).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                </time>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Table of Contents + Article */}
      <section className="max-w-[800px] mx-auto px-6 pb-16">
        {/* Table of Contents */}
        {post.toc.length > 2 && (
          <nav aria-label="Table of Contents" className="glass-panel rounded-2xl border border-white/[0.08] p-6 mb-8">
            <h2 className="font-headline text-sm uppercase tracking-widest text-primary mb-4">In This Article</h2>
            <ol className="space-y-2">
              {post.toc.filter((item) => item.level === 2).map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="flex items-start gap-3 text-sm text-on-surface-variant hover:text-primary transition-colors group"
                  >
                    <span className="font-mono text-xs text-primary/50 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="group-hover:underline">{item.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Article body */}
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-6 md:p-10 lg:p-14">
          <article
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-headline prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-on-surface
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-white/[0.06]
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-primary
              prose-p:text-on-surface-variant prose-p:leading-[1.8] prose-p:mb-5 prose-p:font-body
              prose-strong:text-on-surface prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-semibold
              prose-li:text-on-surface-variant prose-li:leading-[1.8] prose-li:mb-1
              prose-ul:my-4 prose-ol:my-4
              prose-blockquote:border-l-primary prose-blockquote:bg-white/[0.02] prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:px-4
              prose-table:border-collapse
              prose-th:font-headline prose-th:uppercase prose-th:tracking-wide prose-th:text-xs prose-th:text-primary prose-th:bg-white/[0.04] prose-th:px-4 prose-th:py-2.5 prose-th:border prose-th:border-white/[0.08] prose-th:text-left
              prose-td:px-4 prose-td:py-2.5 prose-td:border prose-td:border-white/[0.06] prose-td:text-sm prose-td:text-on-surface-variant
              prose-hr:border-white/[0.08] prose-hr:my-10
              prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </div>

        {/* Keywords / Tags */}
        {post.keywords.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.keywords.map((kw) => (
              <span key={kw} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-on-surface-variant">
                {kw}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Related posts */}
      {allPosts.length > 0 && (
        <section className="max-w-[800px] mx-auto px-6 pb-20">
          <h2 className="font-headline text-2xl uppercase tracking-wide mb-6">Keep Reading</h2>
          <div className="space-y-4">
            {allPosts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="block glass-panel rounded-xl border border-white/[0.06] p-5 hover:border-white/15 hover:bg-white/[0.02] transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="primary" size="sm">{p.category}</Badge>
                  <span className="text-xs text-on-surface-variant">{p.readingTime} min</span>
                </div>
                <h3 className="font-headline text-lg uppercase tracking-wide">{p.title}</h3>
                <p className="text-on-surface-variant text-sm mt-1 line-clamp-2">{p.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="text-center pb-20">
        <Link
          href="/blog"
          className="inline-block border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
        >
          All Articles
        </Link>
      </div>

      <ArticleSubscribeBar />
    </>
  )
}
