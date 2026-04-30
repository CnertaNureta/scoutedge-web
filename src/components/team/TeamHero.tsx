import type { Team } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { getTeamHeroImage } from '@/lib/unsplash'
import { getLiveTeamDetails } from '@/lib/live-data-service'
import { getTeamColors } from '@/lib/team-colors'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Badge from '@/components/ui/Badge'

interface TeamHeroProps {
  team: Team
}

export default function TeamHero({ team }: TeamHeroProps) {
  const heroImage = getTeamHeroImage(team.slug)
  const liveDetails = getLiveTeamDetails(team.name)
  const colors = getTeamColors(team.slug)

  return (
    <section className="relative h-[85vh] min-h-[580px] w-full overflow-hidden flex items-end">
      {/* Background image -- LCP element */}
      <Image
        src={heroImage}
        alt={`${team.name} football atmosphere`}
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 object-cover brightness-[0.3] saturate-[1.2] scale-105"
      />

      {/* Team color overlay gradient — left to right */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: `linear-gradient(to right, ${colors.primary}40 0%, transparent 60%)`,
        }}
      />

      {/* Bottom gradient for readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-background/30 to-background" />

      {/* Left gradient for text area */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-background/70 via-background/30 to-transparent" />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 pb-16 md:pb-24">
        <div className="space-y-4 max-w-3xl">
          {team.isPlayoff && (
            <Badge variant="tertiary" size="md">Subject to UEFA Playoff Results (March 26-31, 2026)</Badge>
          )}

          {/* Flag + Badge */}
          <div className="flex items-center gap-4 mb-2">
            <span className="text-6xl md:text-7xl">{team.flag}</span>
            {liveDetails?.badge && (
              <Image
                src={liveDetails.badge}
                alt={`${team.name} official badge`}
                width={72}
                height={72}
                sizes="(max-width: 768px) 56px, 72px"
                className="object-contain drop-shadow-lg"
              />
            )}
          </div>

          {/* Team Name */}
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-wide text-on-surface uppercase leading-[0.9]">
            {team.name}
            <span className="block text-xl md:text-2xl lg:text-3xl tracking-wider text-on-surface-variant mt-2 normal-case">
              World Cup 2026 Analysis
            </span>
          </h1>

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge variant="primary" size="md">#{team.fifaRanking} FIFA</Badge>
            <Badge variant="outline" size="md">Group {team.group}</Badge>
            <Badge variant="outline" size="md">{team.confederation}</Badge>
            <span className="font-label text-sm text-on-surface-variant">{team.coachName}</span>
          </div>

          {/* Chemistry — prominent */}
          <div className="flex items-center gap-6 mt-6">
            <span
              className="font-headline text-5xl md:text-6xl tracking-tight"
              style={{ color: colors.glow }}
            >
              {team.chemistry}
            </span>
            <div className="flex-1 max-w-sm">
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium mb-1 block">
                Chemistry Index
              </span>
              <ChemistryBar value={team.chemistry} showValue={false} size="md" />
            </div>
          </div>

          {/* Key Insight — pull quote style */}
          <p
            className="text-on-surface-variant italic max-w-xl mt-4 text-base md:text-lg leading-relaxed pl-4 border-l-2"
            style={{ borderColor: `${colors.primary}60` }}
          >
            &ldquo;{team.keyInsight}&rdquo;
          </p>

          {/* Registration CTA — above fold */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="font-label text-sm text-on-surface-variant">Free daily AI predictions for all 48 teams.</p>
            <Link
              href="/auth/register"
              className="shrink-0 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all min-h-[44px] flex items-center"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom accent line in team color */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] z-30"
        style={{
          background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}80, transparent)`,
        }}
      />
    </section>
  )
}
