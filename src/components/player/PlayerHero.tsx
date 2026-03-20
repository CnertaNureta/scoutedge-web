import type { Player, Team } from '@/lib/types'
import { getPlayerActionImage } from '@/lib/unsplash'
import FitnessIndicator from '@/components/ui/FitnessIndicator'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

interface PlayerHeroProps {
  player: Player
  team: Team
}

export default function PlayerHero({ player, team }: PlayerHeroProps) {
  const heroImage = getPlayerActionImage(player.name)
  const playerPhoto = player.cutoutUrl || player.imageUrl

  return (
    <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden flex items-end">
      <div className="absolute inset-0 hero-gradient z-10" />
      <div className="absolute inset-0 hero-gradient-left z-10" />
      <img
        src={heroImage}
        alt={`${player.name} in action`}
        className="absolute inset-0 w-full h-full object-cover grayscale-[20%] brightness-75 scale-105"
      />
      {/* Player cutout photo */}
      {playerPhoto && (
        <div className="absolute right-4 md:right-24 bottom-0 z-20 hidden md:block">
          <img
            src={playerPhoto}
            alt={player.name}
            className="h-[400px] lg:h-[500px] object-contain drop-shadow-[0_0_40px_rgba(160,212,148,0.3)]"
          />
        </div>
      )}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 pb-16 md:pb-24">
        <div className="space-y-3">
          <Link
            href={`/teams/${team.slug}`}
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-label text-sm font-bold uppercase tracking-widest">{team.name} &middot; #{player.number}</span>
          </Link>

          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter text-on-surface uppercase leading-[0.85]">
            <span className="text-stroke block">{player.name.split(' ')[0]}</span>
            <span className="ml-4 md:ml-12 block">{player.name.split(' ').slice(1).join(' ')}</span>
          </h1>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4">
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Position</span>
              <span className="font-headline text-xl font-bold uppercase">{player.position}</span>
            </div>
            <div className="w-px h-8 bg-outline-variant/30" />
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Club</span>
              <span className="font-headline text-xl font-bold">{player.club}</span>
            </div>
            <div className="w-px h-8 bg-outline-variant/30" />
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Age</span>
              <span className="font-headline text-xl font-bold">{player.age}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <FitnessIndicator status={player.fitnessStatus} showLabel size="md" />
            {player.fitnessStatus !== 'green' && (
              <Badge variant={player.fitnessStatus === 'amber' ? 'tertiary' : 'secondary'} size="md">
                {player.fitnessNote}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
