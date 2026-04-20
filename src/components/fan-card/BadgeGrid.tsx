'use client'

import { FAN_BADGES, type BadgeCategory, type FanBadge } from '@/lib/fan-card-types'

const RARITY_RING: Record<FanBadge['rarity'], string> = {
  common: 'border-white/20',
  rare: 'border-blue-400/50',
  epic: 'border-purple-400/50',
  legendary: 'border-tertiary/50',
}

const RARITY_GLOW: Record<FanBadge['rarity'], string> = {
  common: '',
  rare: 'shadow-[0_0_8px_rgba(96,165,250,0.2)]',
  epic: 'shadow-[0_0_12px_rgba(192,132,252,0.25)]',
  legendary: 'shadow-[0_0_16px_rgba(233,196,0,0.3)]',
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  supporter: 'Supporter',
  analyst: 'Analyst',
  social: 'Social',
  special: 'Special',
}

interface BadgeGridProps {
  earnedIds: string[]
  onToggle: (badgeId: string) => void
  selectedIds: string[]
}

export default function BadgeGrid({ earnedIds, onToggle, selectedIds }: BadgeGridProps) {
  const categories = ['supporter', 'analyst', 'social', 'special'] as const

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const badges = FAN_BADGES.filter((b) => b.category === cat)
        return (
          <div key={cat}>
            <h4 className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {badges.map((badge) => {
                const earned = earnedIds.includes(badge.id)
                const featured = selectedIds.includes(badge.id)
                return (
                  <button
                    key={badge.id}
                    onClick={() => earned && onToggle(badge.id)}
                    disabled={!earned}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-h-[44px]
                      ${earned
                        ? `glass-panel ${RARITY_RING[badge.rarity]} ${RARITY_GLOW[badge.rarity]} hover:scale-105 cursor-pointer`
                        : 'bg-white/[0.02] border-white/[0.04] opacity-40 cursor-not-allowed'
                      }
                      ${featured ? 'ring-2 ring-primary/40 bg-primary/10' : ''}
                    `}
                    aria-label={`${badge.name}${earned ? ' (earned)' : ' (locked)'}`}
                  >
                    {featured && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[7px] text-on-primary font-bold">✓</span>
                      </div>
                    )}
                    <span className={`text-2xl ${earned ? '' : 'grayscale'}`}>{badge.icon}</span>
                    <span className="font-label text-[9px] font-semibold uppercase tracking-wide text-center leading-tight text-on-surface">
                      {badge.name}
                    </span>
                    {!earned && (
                      <span className="font-mono text-[8px] text-on-surface-variant">🔒</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
