import type { Player } from '@/lib/types'
import Link from 'next/link'
import { positionOrder, positionLabel } from '@/lib/utils'
import { getPlayerActionImage } from '@/lib/unsplash'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'

interface SquadRosterProps {
  players: Player[]
  teamSlug: string
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
      {sortedGroups.map(([position, posPlayers]) => (
        <div key={position} className="mb-10">
          <h3 className="font-label text-sm font-bold text-primary uppercase tracking-widest mb-4">
            {positionLabel(position)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posPlayers.map((player) => (
              <Link
                key={player.slug}
                href={`/teams/${teamSlug}/players/${player.slug}`}
                className="group relative overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container hover:bg-surface-container-high transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={getPlayerActionImage(player.name)}
                    alt={player.name}
                    className="w-full h-full object-cover brightness-50 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                  <span className="absolute bottom-2 left-4 font-headline text-5xl font-black text-white/10">
                    #{player.number}
                  </span>
                  {/* Player headshot overlay */}
                  {(player.cutoutUrl || player.imageUrl) && (
                    <div className="absolute -bottom-2 right-2 z-10">
                      <img
                        src={player.cutoutUrl || player.imageUrl}
                        alt={player.name}
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
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
