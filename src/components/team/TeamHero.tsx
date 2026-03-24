import type { Team } from '@/lib/types'
import { getTeamHeroImage } from '@/lib/unsplash'
import { getTeamColors } from '@/lib/team-colors'
import Badge from '@/components/ui/Badge'

interface TeamHeroProps {
  team: Team
}

const WC_PEDIGREE: Record<string, { bestFinish: string; titles: number }> = {
  brazil:        { bestFinish: 'Winner', titles: 5 },
  germany:       { bestFinish: 'Winner', titles: 4 },
  italy:         { bestFinish: 'Winner', titles: 4 },
  argentina:     { bestFinish: 'Winner', titles: 3 },
  france:        { bestFinish: 'Winner', titles: 2 },
  uruguay:       { bestFinish: 'Winner', titles: 2 },
  england:       { bestFinish: 'Winner', titles: 1 },
  spain:         { bestFinish: 'Winner', titles: 1 },
  netherlands:   { bestFinish: 'Runner-up', titles: 0 },
  croatia:       { bestFinish: 'Runner-up', titles: 0 },
  hungary:       { bestFinish: 'Runner-up', titles: 0 },
  sweden:        { bestFinish: 'Runner-up', titles: 0 },
  portugal:      { bestFinish: 'Third', titles: 0 },
  poland:        { bestFinish: 'Third', titles: 0 },
  morocco:       { bestFinish: 'Fourth', titles: 0 },
  'south-korea': { bestFinish: 'Fourth', titles: 0 },
  belgium:       { bestFinish: 'Third', titles: 0 },
  colombia:      { bestFinish: 'QF', titles: 0 },
  mexico:        { bestFinish: 'QF', titles: 0 },
  japan:         { bestFinish: 'QF', titles: 0 },
  usa:           { bestFinish: 'Third', titles: 0 },
  switzerland:   { bestFinish: 'QF', titles: 0 },
  denmark:       { bestFinish: 'QF', titles: 0 },
  senegal:       { bestFinish: 'QF', titles: 0 },
  australia:     { bestFinish: 'R16', titles: 0 },
  canada:        { bestFinish: 'Group', titles: 0 },
  cameroon:      { bestFinish: 'QF', titles: 0 },
  nigeria:       { bestFinish: 'R16', titles: 0 },
  ghana:         { bestFinish: 'QF', titles: 0 },
  serbia:        { bestFinish: 'Fourth', titles: 0 },
  ecuador:       { bestFinish: 'R16', titles: 0 },
  iran:          { bestFinish: 'Group', titles: 0 },
  'saudi-arabia':{ bestFinish: 'R16', titles: 0 },
  qatar:         { bestFinish: 'Group', titles: 0 },
  'costa-rica':  { bestFinish: 'QF', titles: 0 },
  tunisia:       { bestFinish: 'Group', titles: 0 },
  wales:         { bestFinish: 'QF', titles: 0 },
  egypt:         { bestFinish: 'Group', titles: 0 },
  chile:         { bestFinish: 'Third', titles: 0 },
  paraguay:      { bestFinish: 'QF', titles: 0 },
  peru:          { bestFinish: 'QF', titles: 0 },
  'new-zealand': { bestFinish: 'Group', titles: 0 },
  ukraine:       { bestFinish: 'QF', titles: 0 },
  romania:       { bestFinish: 'QF', titles: 0 },
  norway:        { bestFinish: 'Group', titles: 0 },
  scotland:      { bestFinish: 'Group', titles: 0 },
  austria:       { bestFinish: 'Third', titles: 0 },
  'czech-republic': { bestFinish: 'Runner-up', titles: 0 },
  turkey:        { bestFinish: 'Third', titles: 0 },
  russia:        { bestFinish: 'Fourth', titles: 0 },
  jamaica:       { bestFinish: 'Group', titles: 0 },
  'trinidad-and-tobago': { bestFinish: 'Group', titles: 0 },
  honduras:      { bestFinish: 'Group', titles: 0 },
  'el-salvador': { bestFinish: 'Group', titles: 0 },
  panama:        { bestFinish: 'Group', titles: 0 },
  'ivory-coast': { bestFinish: 'Group', titles: 0 },
  'south-africa':{ bestFinish: 'Group', titles: 0 },
  algeria:       { bestFinish: 'R16', titles: 0 },
  bolivia:       { bestFinish: 'Group', titles: 0 },
  venezuela:     { bestFinish: 'Debut', titles: 0 },
}

function getPedigreeBadge(slug: string): string | null {
  const info = WC_PEDIGREE[slug]
  if (!info) return null
  if (info.titles > 0) return `${'🏆'.repeat(Math.min(info.titles, 5))} Winner ×${info.titles}`
  if (info.bestFinish === 'Debut') return '⭐ World Cup Debut'
  return `Best: ${info.bestFinish}`
}

export default function TeamHero({ team }: TeamHeroProps) {
  const heroImage = getTeamHeroImage(team.slug)
  const colors = getTeamColors(team.slug)
  const pedigreeBadge = getPedigreeBadge(team.slug)

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden flex items-end">
      <div className="absolute inset-0 hero-gradient z-10" />
      <div className="absolute inset-0 hero-gradient-left z-10" />
      <img
        src={heroImage}
        alt={`${team.name} football atmosphere`}
        className="absolute inset-0 w-full h-full object-cover grayscale-[20%] brightness-75 scale-105"
      />
      {/* Team-color gradient accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
        style={{
          background: `linear-gradient(to right, transparent, ${colors.glow}33, transparent)`,
        }}
        aria-hidden="true"
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
          {pedigreeBadge && (
            <div className="inline-block font-label text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 bg-surface-container/60 text-on-surface-variant">
              {pedigreeBadge}
            </div>
          )}
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
          <p className="text-on-surface-variant italic max-w-xl mt-4 text-lg leading-relaxed">
            &ldquo;{team.keyInsight}&rdquo;
          </p>
        </div>
      </div>
    </section>
  )
}
