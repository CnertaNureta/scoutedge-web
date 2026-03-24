import type { Player } from '@/lib/types'
import Link from 'next/link'
import { positionOrder, positionLabel, getPlayerPhoto } from '@/lib/utils'
import { getPlayerActionImage } from '@/lib/unsplash'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'

interface SquadRosterProps {
  players: Player[]
  teamSlug: string
}

const POSITION_DOT_COLOR: Record<string, string> = {
  GK:  'bg-tertiary',
  DEF: 'bg-secondary',
  MID: 'bg-primary',
  FWD: 'bg-[#a0c4ff]',
}

export default function SquadRoster({ players, teamSlug }: SquadRosterProps) {
  const grouped = players.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.position
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => positionOrder(a) - positionOrder(b)
  )

  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-16">
      <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 tracking-tight uppercase">Squad</h2>
      {sortedGroups.map(([position, posPlayers]) => {
        const avgAge = posPlayers.length > 0
          ? Math.round((posPlayers.reduce((s, p) => s + p.age, 0) / posPlayers.length) * 10) / 10
          : 0
        const avgRating = posPlayers.length > 0
          ? Math.round((posPlayers.reduce((s, p) => s + p.rating, 0) / posPlayers.length) * 10) / 10
          : 0
        const dotColor = POSITION_DOT_COLOR[position] ?? 'bg-primary'

        return (
          <div key={position} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} aria-hidden="true" />
              <h3 className="font-label text-sm font-bold text-primary uppercase tracking-widest">
                {positionLabel(position)}
              </h3>
              <span className="font-label text-xs text-on-surface-variant">
                · {posPlayers.length} players · Avg Age {avgAge} · ★ {avgRating} avg
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {posPlayers.map((player) => {
                const photo = getPlayerPhoto(player)
                return (
                <Link
                  key={player.slug}
                  href={`/teams/${teamSlug}/players/${player.slug}`}
                  className="group relative overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container hover:bg-surface-container-high transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={getPlayerActionImage(player.name)}
                      alt={player.name}
                      loading="lazy"
                      className="w-full h-full object-cover brightness-50 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                    <span className="absolute bottom-2 left-4 font-headline text-5xl font-black text-white/10">
                      #{player.number}
                    </span>
                    {photo && (
                      <div className="absolute -bottom-2 right-2 z-10">
                        <img
                          src={photo}
                          alt={player.name}
                          loading="lazy"
                          className="h-28 w-auto object-contain drop-shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-headline text-lg font-bold group-hover:text-primary transition-colors truncate">
                        {player.name}
                      </h4>
                      <FitnessIndicator status={player.fitnessStatus} />
                    </div>
                    <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
                      {player.position} &middot; {player.club}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant mt-1">
                      {player.caps} caps &middot; {player.goals} goals
                    </p>
                    <div className="mt-3">
                      <ChemistryBar value={player.rating * 10} showValue={false} size="sm" />
                    </div>
                  </div>
                </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
