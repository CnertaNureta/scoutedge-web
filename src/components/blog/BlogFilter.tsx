'use client'

import { useState } from 'react'
import type { BlogPost } from '@/lib/blog-service'
import BlogCard from './BlogCard'

const POSTS_PER_PAGE = 12

interface BlogFilterProps {
  posts: BlogPost[]
}

export default function BlogFilter({ posts }: BlogFilterProps) {
  const categories = Array.from(new Set(posts.map((p) => p.category))).sort()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = activeCategory ? posts.filter((p) => p.category === activeCategory) : posts
  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE)
  const paginated = filtered.slice(0, page * POSTS_PER_PAGE)

  function selectCategory(cat: string | null) {
    setActiveCategory(cat)
    setPage(1)
  }

  return (
    <>
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
        <button
          onClick={() => selectCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-label uppercase tracking-widest transition-colors border ${
            activeCategory === null
              ? 'bg-primary/20 border-primary text-primary'
              : 'border-white/[0.08] text-on-surface-variant hover:border-white/20'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => selectCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-label uppercase tracking-widest transition-colors border ${
              activeCategory === cat
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-white/[0.08] text-on-surface-variant hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {paginated.length === 0 && (
        <p className="text-center text-on-surface-variant py-12">No articles in this category yet.</p>
      )}

      {/* Load more */}
      {page < totalPages && (
        <div className="text-center mt-10">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="inline-block border border-white/20 text-on-surface px-8 py-3 rounded-2xl font-label font-semibold uppercase tracking-widest hover:bg-white/[0.06] transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </>
  )
}
