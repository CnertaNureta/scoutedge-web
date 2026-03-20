import type { Player } from '@/lib/types'
import GlassCard from '@/components/ui/GlassCard'

interface PlayerStatsProps {
  player: Player
}

export default function PlayerStats({ player }: PlayerStatsProps) {
  const stats = [
    { label: 'Age', value: String(player.age), icon: '🎂' },
    { label: 'Caps', value: String(player.caps), icon: '🏟️' },
    { label: 'Goals', value: String(player.goals), icon: '⚽' },
    { label: 'Assists', value: String(player.assists), icon: '🅰️' },
    { label: 'Rating', value: player.rating.toFixed(1), icon: '⭐' },
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-6 -mt-8 relative z-30 mb-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5 text-center">
            <span className="text-2xl mb-2 block">{stat.icon}</span>
            <span className="font-headline text-3xl md:text-4xl font-black text-primary block">{stat.value}</span>
            <span className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
