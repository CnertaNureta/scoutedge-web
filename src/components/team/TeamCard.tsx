import type { Team } from '@/lib/types'
import Link from 'next/link'
import ChemistryBar from '@/components/ui/ChemistryBar'
import Badge from '@/components/ui/Badge'

interface TeamCardProps {
  team: Team
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group relative block bg-surface-container rounded-2xl p-6 border border-white/[0.06] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(160,212,148,0.1)] overflow-hidden"
    >
      {/* Neon top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Subtle glow on hover */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{team.flag}</span>
            <div>
              <h3 className="font-headline text-2xl tracking-wide uppercase group-hover:text-primary transition-colors">
                {team.name}
              </h3>
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">
                Group {team.group} &middot; #{team.fifaRanking}
              </p>
            </div>
          </div>
          {team.isPlayoff && <Badge variant="tertiary" size="sm">Playoff</Badge>}
        </div>
        <div className="flex items-center gap-4 mb-3">
          <span className="font-body text-xs text-on-surface-variant">{team.confederation}</span>
          <span className="text-on-surface-variant/30">&middot;</span>
          <span className="font-body text-xs text-on-surface-variant">{team.coachName}</span>
        </div>
        <ChemistryBar value={team.chemistry} label="Chemistry" size="sm" />
      </div>
    </Link>
  )
}
