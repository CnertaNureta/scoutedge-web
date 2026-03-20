import type { Team } from '@/lib/types'
import { getTeamHeroImage } from '@/lib/unsplash'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Badge from '@/components/ui/Badge'

interface TeamHeroProps {
  team: Team
}

export default function TeamHero({ team }: TeamHeroProps) {
  const heroImage = getTeamHeroImage(team.slug)

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden flex items-end">
      <div className="absolute inset-0 hero-gradient z-10" />
      <div className="absolute inset-0 hero-gradient-left z-10" />
      <img
        src={heroImage}
        alt={`${team.name} football atmosphere`}
        className="absolute inset-0 w-full h-full object-cover grayscale-[20%] brightness-75 scale-105"
      />
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 pb-16 md:pb-24">
        <div className="space-y-4">
          {team.isPlayoff && (
            <Badge variant="tertiary" size="md">Subject to UEFA Playoff Results (March 26-31, 2026)</Badge>
          )}
          <div className="text-7xl md:text-8xl mb-2">{team.flag}</div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-on-surface uppercase leading-none">
            {team.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-4">
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">FIFA Ranking</span>
              <span className="font-headline text-2xl font-bold">#{team.fifaRanking}</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30 hidden md:block" />
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Group</span>
              <span className="font-headline text-2xl font-bold">{team.group}</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30 hidden md:block" />
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Coach</span>
              <span className="font-headline text-2xl font-bold">{team.coachName}</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30 hidden md:block" />
            <div className="flex flex-col">
              <span className="font-label text-xs text-primary font-bold tracking-widest uppercase">Confederation</span>
              <span className="font-headline text-2xl font-bold">{team.confederation}</span>
            </div>
          </div>
          <div className="max-w-md mt-6">
            <ChemistryBar value={team.chemistry} label="Chemistry Index" />
          </div>
          <p className="text-on-surface-variant italic max-w-xl mt-4 text-lg leading-relaxed">
            &ldquo;{team.keyInsight}&rdquo;
          </p>
        </div>
      </div>
    </section>
  )
}
