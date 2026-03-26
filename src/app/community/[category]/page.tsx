import type { Metadata } from 'next'
import Link from 'next/link'
import { FORUM_CATEGORIES } from '@/data/community-data'
import { breadcrumbJsonLd } from '@/lib/og-utils'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Badge from '@/components/ui/Badge'

export function generateStaticParams() {
  return FORUM_CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)
  if (!cat) return { title: 'Forum Category Not Found' }
  return {
    title: `${cat.title} — World Cup 2026 Fan Forum`,
    description: cat.description,
    alternates: { canonical: `https://scoutedge.ai/community/${category}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = FORUM_CATEGORIES.find((c) => c.slug === category)

  if (!cat) {
    return (
      <div className="page-container py-20 text-center">
        <h1 className="font-headline text-4xl uppercase mb-4">Category Not Found</h1>
        <Link href="/community" className="text-primary hover:underline">Back to Community</Link>
      </div>
    )
  }

  const otherCategories = FORUM_CATEGORIES.filter((c) => c.slug !== category)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://scoutedge.ai' },
        { name: 'Community', url: 'https://scoutedge.ai/community' },
        { name: cat.title, url: `https://scoutedge.ai/community/${category}` },
      ])) }} />

      {/* Hero */}
      <section className="relative py-16 md:py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[160px] animate-float" />
        <div className="absolute inset-0 pitch-lines opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto">
          <Link href="/community" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-label uppercase tracking-widest mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Community
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{cat.icon}</span>
            <div>
              <h1 className="font-headline text-4xl md:text-6xl uppercase tracking-wide" style={{ color: cat.accent }}>
                {cat.title}
              </h1>
              <p className="text-on-surface-variant text-lg mt-1">{cat.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <Badge variant="primary" size="md">{cat.topicCount} Topics</Badge>
            <Badge variant="outline" size="md">{cat.topics.reduce((sum, t) => sum + t.replies, 0)} Replies</Badge>
          </div>
        </div>
      </section>

      {/* Topics List */}
      <section className="page-container pb-12">
        <SectionHeader className="mb-6">All Topics</SectionHeader>

        <GlassCard>
          {cat.topics.map((topic, i) => (
            <div
              key={topic.id}
              className="flex items-center gap-4 px-5 py-5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
            >
              {/* Icon */}
              <div className="shrink-0">
                {topic.pinned ? (
                  <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                ) : topic.hot ? (
                  <div className="w-11 h-11 rounded-xl bg-[#ffb4aa]/20 flex items-center justify-center">
                    <span className="text-xl">🔥</span>
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <span className="text-on-surface-variant font-mono text-sm">#{i + 1}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-label font-semibold text-on-surface text-base group-hover:text-primary transition-colors mb-1.5">
                  {topic.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                  <span>
                    {topic.authorFlag && <span className="mr-1">{topic.authorFlag}</span>}
                    {topic.author}
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{topic.lastActivity}</span>
                  {topic.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: tag === 'Official' ? 'rgba(160,212,148,0.15)' : tag === 'Hot' ? 'rgba(255,180,170,0.15)' : 'rgba(255,255,255,0.05)',
                        color: tag === 'Official' ? '#a0d494' : tag === 'Hot' ? '#ffb4aa' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-8 shrink-0 text-center">
                <div>
                  <div className="font-mono text-base font-bold" style={{ color: cat.accent }}>{topic.replies}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Replies</div>
                </div>
                <div>
                  <div className="font-mono text-base font-bold text-on-surface-variant">{topic.views.toLocaleString()}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Views</div>
                </div>
              </div>
            </div>
          ))}
        </GlassCard>
      </section>

      {/* Giscus Discussion for this category */}
      <section className="page-container pb-12">
        <SectionHeader className="mb-6">Join the Discussion</SectionHeader>
        <GlassCard className="p-8">
          <NeonAccentBar color={cat.accent} />
          <p className="text-on-surface-variant text-sm mb-6 text-center max-w-lg mx-auto">
            Share your thoughts on {cat.title.toLowerCase()}. Sign in with GitHub to post — no separate registration needed.
          </p>
          <div className="max-w-3xl mx-auto" id="giscus-container">
            <script
              src="https://giscus.app/client.js"
              data-repo="CnertaNureta/scoutedge-web"
              data-repo-id=""
              data-category={cat.title}
              data-category-id=""
              data-mapping="pathname"
              data-strict="0"
              data-reactions-enabled="1"
              data-emit-metadata="0"
              data-input-position="top"
              data-theme="dark_dimmed"
              data-lang="en"
              data-loading="lazy"
              crossOrigin="anonymous"
              async
            />
          </div>
          <p className="text-on-surface-variant/50 text-xs mt-6 text-center">
            Powered by <a href="https://giscus.app" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Giscus</a> &amp; GitHub Discussions — no separate registration required
          </p>
        </GlassCard>
      </section>

      {/* Other Categories */}
      <section className="page-container pb-24">
        <SectionHeader className="mb-6">Other Forums</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {otherCategories.map((other) => (
            <Link key={other.slug} href={`/community/${other.slug}`}>
              <GlassCard hover className="p-5 relative overflow-hidden">
                <NeonAccentBar color={other.accent} />
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{other.icon}</span>
                  <div>
                    <h3 className="font-headline text-base uppercase tracking-wide" style={{ color: other.accent }}>
                      {other.title}
                    </h3>
                    <span className="text-xs text-on-surface-variant">{other.topicCount} topics</span>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
