import Link from 'next/link'
import type { BlogPost } from '@/lib/blog-service'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { BRAND } from '@/lib/brand-tokens'

interface BlogCardProps {
  post: BlogPost
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <GlassCard hover className="p-6 relative overflow-hidden h-full">
        <NeonAccentBar color={BRAND.primary} />
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="primary" size="sm">{post.category}</Badge>
          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
            {post.readingTime} min read
          </span>
        </div>
        <h3 className="font-headline text-xl uppercase tracking-wide mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3 mb-4">
          {post.description}
        </p>
        <div className="flex items-center justify-between text-xs text-on-surface-variant mt-auto">
          <span>{post.author}</span>
          <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </GlassCard>
    </Link>
  )
}
