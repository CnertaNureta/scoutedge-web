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
    <section className="relative h-[75vh] min-h-[520px] w-full overflow-hidden flex items-end">
      {/* Background image */}
      <img
        src={heroImage}
        alt={`${team.name} football atmosphere`}
        className="absolute inset-0 w-full h-full object-cover brightness-[0.35] saturate-[1.2] scale-105"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 hero-gradient z-10" />
      <div className="absolute inset-0 hero-gradient-left z-10" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20 z-10" />

      {/* Vignette */}
      <div className="absolute inset-0 vignette pointer-events-none z-10" />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 pb-16 md:pb-24">
        <div className="space-y-4">
          {team.isPlayoff && (
            <Badge variant="tertiary" size="md">Subject to UEFA Playoff Results (March 26-31, 2026)</Badge>
          )}
          <div className="text-7xl md:text-8xl mb-2">{team.flag}</div>
          <h1 className="font-headline text-6xl md:text-8xl tracking-wide text-on-surface uppercase leading-none">
            {team.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-4">
            {[
              { label: 'FIFA Ranking', value: `#${team.fifaRanking}` },
              { label: 'Group', value: team.group },
              { label: 'Coach', value: team.coachName },
              { label: 'Confederation', value: team.confederation },
            ].map((item) => (
              <div key={item.label} className="flex flex-col">
                <span className="font-label text-xs text-primary font-semibold tracking-widest uppercase">{item.label}</span>
                <span className="font-headline text-2xl">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="max-w-md mt-6">
            <ChemistryBar value={team.chemistry} label="Chemistry Index" />
          </div>
          <p className="text-on-surface-variant italic max-w-xl mt-4 text-lg leading-relaxed">
            &ldquo;{team.keyInsight}&rdquo;
          </p>
        </div>
      </div>

      {/* Bottom neon line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-30 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </section>
  )
}
