'use client'

import type { Player } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'

interface SquadDepthProps {
  players: Player[]
}

const POSITION_CONFIG: Record<string, { label: string; colorClass: string; order: number }> = {
  GK:  { label: 'Goalkeepers', colorClass: 'text-tertiary', order: 0 },
  DEF: { label: 'Defenders',   colorClass: 'text-secondary', order: 1 },
  MID: { label: 'Midfielders', colorClass: 'text-primary', order: 2 },
  FWD: { label: 'Forwards',    colorClass: 'text-[#a0c4ff]', order: 3 },
}

const AGE_BUCKETS = [
  { label: '≤22', test: (age: number) => age <= 22 },
  { label: '23-26', test: (age: number) => age >= 23 && age <= 26 },
  { label: '27-30', test: (age: number) => age >= 27 && age <= 30 },
  { label: '31+', test: (age: number) => age >= 31 },
]

export default function SquadDepth({ players }: SquadDepthProps) {
  if (players.length === 0) return null

  const positionGroups = Object.entries(POSITION_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([pos, config]) => {
      const group = players.filter((p) => p.position === pos)
      const avgAge = group.length > 0
        ? Math.round((group.reduce((s, p) => s + p.age, 0) / group.length) * 10) / 10
        : 0
      const avgRating = group.length > 0
        ? Math.round((group.reduce((s, p) => s + p.rating, 0) / group.length) * 10) / 10
        : 0
      const ages = group.map((p) => p.age)
      const minAge = ages.length > 0 ? Math.min(...ages) : 0
      const maxAge = ages.length > 0 ? Math.max(...ages) : 0
      return { pos, ...config, players: group, avgAge, avgRating, minAge, maxAge }
    })

  const ageBuckets = AGE_BUCKETS.map((bucket) => {
    const bucketPlayers = players.filter((p) => bucket.test(p.age))
    const pct = Math.round((bucketPlayers.length / players.length) * 100)
    return { ...bucket, count: bucketPlayers.length, pct }
  })
  const maxBucketCount = Math.max(...ageBuckets.map((b) => b.count))

  const squadMinAge = Math.min(...players.map((p) => p.age))
  const squadMaxAge = Math.max(...players.map((p) => p.age))
  const ageRange = squadMaxAge - squadMinAge || 1

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
        Squad Depth
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {positionGroups.map((group) => (
          <GlassCard key={group.pos} className="p-5">
            <span className={`font-label text-xs font-bold uppercase tracking-widest ${group.colorClass}`}>
              {group.label}
            </span>
            <div className="font-headline text-3xl font-black text-on-surface mt-2">
              {group.players.length}
              <span className="font-label text-xs text-on-surface-variant font-normal ml-1">players</span>
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="font-label text-xs text-on-surface-variant">
                Avg Age: {group.avgAge}
              </p>
              <p className="font-label text-xs text-on-surface-variant">
                Avg Rating: ★ {group.avgRating}
              </p>
            </div>
            {group.players.length > 0 && (
              <div
                className="mt-3 h-1.5 bg-primary/20 rounded-full overflow-hidden relative"
                aria-label={`Age range: ${group.minAge} to ${group.maxAge}`}
              >
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{
                    left: `${((group.minAge - squadMinAge) / ageRange) * 100}%`,
                    width: `${Math.max(10, ((group.maxAge - group.minAge) / ageRange) * 100)}%`,
                  }}
                />
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-6 p-5">
        <h3 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          Age Distribution
        </h3>
        <div className="space-y-3">
          {ageBuckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="font-label text-xs font-bold text-on-surface-variant w-12 shrink-0">
                {bucket.label}
              </span>
              <div className="flex-1 h-6 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    bucket.count === maxBucketCount ? 'bg-primary' : 'bg-primary/60'
                  }`}
                  style={{ width: `${bucket.pct}%` }}
                  role="progressbar"
                  aria-valuenow={bucket.count}
                  aria-valuemin={0}
                  aria-valuemax={players.length}
                  aria-label={`${bucket.label}: ${bucket.count} players, ${bucket.pct}%`}
                />
              </div>
              <span className="font-mono text-xs text-on-surface-variant w-24 shrink-0 text-right">
                {bucket.count} ({bucket.pct}%)
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  )
}
