import type { Player } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { positionOrder, positionLabel, getPlayerPhoto } from '@/lib/utils'
import { getPlayerActionImage } from '@/lib/unsplash'
import ChemistryBar from '@/components/ui/ChemistryBar'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import SectionHeader from '@/components/ui/SectionHeader'

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
    <section className="page-container mb-16">
      <SectionHeader className="mb-10">Squad</SectionHeader>
      {sortedGroups.map(([position, posPlayers]) => (
        <div key={position} className="mb-10">
          <h3 className="font-label text-sm font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-3">
            {positionLabel(position)}
            <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
          </h3>
	          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
	            {posPlayers.map((player) => {
	              const photo = getPlayerPhoto(player)
	              return (
	                <Link
	                  key={player.slug}
	                  href={`/teams/${teamSlug}/players/${player.slug}`}
	                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-container hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,255,135,0.08)]"
	                >
	                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20" />

	                  <div className="relative h-32 overflow-hidden">
	                    <Image
	                      src={getPlayerActionImage(player.name)}
	                      alt={player.name}
	                      fill
	                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
	                      className="object-cover brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.45] transition-all duration-500"
	                    />
	                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
	                    <span className="absolute bottom-2 left-4 font-headline text-5xl text-white/[0.06]">
	                      #{player.number}
	                    </span>
	                    {photo && (
	                      <div className="absolute -bottom-2 right-2 z-10">
	                        <Image
	                          src={photo}
	                          alt={player.name}
	                          width={112}
	                          height={112}
	                          sizes="112px"
	                          className="h-28 w-auto object-contain drop-shadow-lg"
	                        />
	                      </div>
	                    )}
	                  </div>
	                  <div className="p-4">
	                    <div className="flex items-center justify-between mb-1">
	                      <h4 className="font-headline text-xl tracking-wide group-hover:text-primary transition-colors truncate">
	                        {player.name}
	                      </h4>
	                      <FitnessIndicator status={player.fitnessStatus} />
	                    </div>
	                    <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">
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
      ))}
    </section>
  )
}
