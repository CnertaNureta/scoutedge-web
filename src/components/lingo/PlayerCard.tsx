import { Link } from '@/i18n/navigation'
import type { LingoPlayer } from '@/types/lingo'
import { DifficultyBadge } from './DifficultyBadge'

interface PlayerCardProps {
  player: LingoPlayer
  showCountry?: boolean
}

export function PlayerCard({ player, showCountry = true }: PlayerCardProps) {
  return (
    <Link
      href={`/lingo/players/${player.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-lingo-border/50 bg-lingo-surface p-5 transition-all duration-200 hover:border-lingo-accent/30 hover:bg-lingo-surface-hover hover:shadow-[0_0_30px_-10px] hover:shadow-lingo-accent/10"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs text-lingo-text-muted">
          <span>{player.position}</span>
          <span className="text-lingo-border">·</span>
          <span>{player.club}</span>
        </div>
        <DifficultyBadge rating={player.difficulty} />
      </div>
      <h3 className="text-base font-semibold text-lingo-text group-hover:text-lingo-accent">
        {player.name}
      </h3>
      <p className="font-mono text-sm text-lingo-phonetic">{player.phonetic}</p>
      {showCountry && (
        <p className="text-xs capitalize text-lingo-text-muted">
          {player.country.replace(/-/g, ' ')}
        </p>
      )}
    </Link>
  )
}
