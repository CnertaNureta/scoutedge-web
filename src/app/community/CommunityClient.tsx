'use client'

import { useState } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import type { ForumCategory, ForumTopic } from '@/data/community-data'

function TopicRow({ topic, accent }: { topic: ForumTopic; accent: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors group">
      {/* Icon */}
      <div className="shrink-0">
        {topic.pinned ? (
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        ) : topic.hot ? (
          <div className="w-10 h-10 rounded-xl bg-[#ffb4aa]/20 flex items-center justify-center">
            <span className="text-lg">🔥</span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-label font-semibold text-on-surface truncate group-hover:text-primary transition-colors cursor-pointer">
            {topic.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <span>
            {topic.authorFlag && <span className="mr-1">{topic.authorFlag}</span>}
            {topic.author}
          </span>
          <span className="opacity-40">·</span>
          <span>{topic.lastActivity}</span>
          {topic.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
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
      <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
        <div>
          <div className="font-mono text-sm font-bold" style={{ color: accent }}>{topic.replies}</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Replies</div>
        </div>
        <div>
          <div className="font-mono text-sm font-bold text-on-surface-variant">{topic.views.toLocaleString()}</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Views</div>
        </div>
      </div>
    </div>
  )
}

function CategorySection({ category }: { category: ForumCategory }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <GlassCard className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-3xl">{category.icon}</div>
        <div className="flex-1">
          <h2 className="font-headline text-xl uppercase tracking-wide" style={{ color: category.accent }}>
            {category.title}
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{category.description}</p>
        </div>
        <div className="hidden sm:block text-right mr-4">
          <div className="font-mono text-lg font-bold" style={{ color: category.accent }}>{category.topicCount}</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Topics</div>
        </div>
        <svg
          className={`w-5 h-5 text-on-surface-variant transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05]">
          {category.topics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} accent={category.accent} />
          ))}
          <div className="px-5 py-3 border-t border-white/[0.05] text-center">
            <span className="text-xs text-primary font-label font-semibold uppercase tracking-wider cursor-pointer hover:underline">
              View All {category.topicCount} Topics →
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

interface CommunityClientProps {
  categories: ForumCategory[]
  stats: { totalMembers: string; totalTopics: number; totalReplies: string; onlineNow: number }
}

export default function CommunityClient({ categories, stats }: CommunityClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'new'>('all')

  const filteredCategories = categories.map((cat) => {
    if (activeTab === 'hot') {
      return { ...cat, topics: cat.topics.filter((t) => t.hot || t.pinned) }
    }
    return cat
  }).filter((cat) => cat.topics.length > 0)

  return (
    <>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Members', value: stats.totalMembers, accent: '#a0d494' },
          { label: 'Topics', value: stats.totalTopics.toString(), accent: '#bcf0ae' },
          { label: 'Replies', value: stats.totalReplies, accent: '#e9c400' },
          { label: 'Online Now', value: stats.onlineNow.toString(), accent: '#ffb4aa' },
        ].map((stat) => (
          <div key={stat.label} className="relative glass-panel p-4 rounded-2xl border border-white/[0.08] text-center overflow-hidden group">
            <NeonAccentBar color={stat.accent} />
            <div className="font-headline text-2xl md:text-3xl tracking-wide" style={{ color: stat.accent }}>
              {stat.value}
            </div>
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">{stat.label}</span>
            {stat.label === 'Online Now' && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'hot', 'new'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-primary text-on-primary'
                : 'bg-white/[0.05] text-on-surface-variant hover:bg-white/[0.08]'
            }`}
          >
            {tab === 'hot' && '🔥 '}
            {tab === 'new' && '✨ '}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <Link
          href="/teams"
          className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary font-label text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Team Forums
        </Link>
      </div>

      {/* Categories */}
      {filteredCategories.map((category) => (
        <CategorySection key={category.slug} category={category} />
      ))}

      {/* Giscus Discussion Embed */}
      <GlassCard className="p-8 text-center mt-8">
        <NeonAccentBar color="#a0d494" />
        <h3 className="font-headline text-2xl uppercase tracking-wide text-primary mb-3">Join the Conversation</h3>
        <p className="text-on-surface-variant text-sm mb-6 max-w-lg mx-auto">
          Sign in with your GitHub account to post comments, reply to discussions, and react to predictions.
          All discussions are powered by GitHub Discussions.
        </p>
        <div id="giscus-container" className="max-w-3xl mx-auto">
          <script
            // eslint-disable-next-line @next/next/no-sync-scripts
            src="https://giscus.app/client.js"
            data-repo="CnertaNureta/scoutedge-web"
            data-repo-id=""
            data-category="General"
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
        <p className="text-on-surface-variant/50 text-xs mt-6">
          Powered by <a href="https://giscus.app" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Giscus</a> &amp; GitHub Discussions
        </p>
      </GlassCard>
    </>
  )
}
