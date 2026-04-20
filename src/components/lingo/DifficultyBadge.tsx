import { getLingoDifficultyLabel } from '@/data/lingo-data'

interface DifficultyBadgeProps {
  rating: number
}

export function DifficultyBadge({ rating }: DifficultyBadgeProps) {
  const label = getLingoDifficultyLabel(rating)
  const dots = Array.from({ length: 5 }, (_, i) => i < rating)

  const colorClass =
    rating <= 2
      ? 'text-lingo-difficulty-easy'
      : rating <= 3
        ? 'text-lingo-difficulty-medium'
        : 'text-lingo-difficulty-hard'

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-label={`Difficulty: ${rating} out of 5`}>
        {dots.map((filled, i) => (
          <span
            key={i}
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              filled ? `bg-current ${colorClass}` : 'bg-lingo-border'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
    </div>
  )
}
