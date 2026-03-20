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
      className="group block bg-surface-container hover:bg-surface-container-high rounded-xl p-6 border border-outline-variant/10 hover:border-outline-variant/30 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{team.flag}</span>
          <div>
            <h3 className="font-headline text-xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
              {team.name}
            </h3>
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
              Group {team.group} &middot; #{team.fifaRanking}
            </p>
          </div>
        </div>
        {team.isPlayoff && <Badge variant="tertiary" size="sm">Playoff</Badge>}
      </div>
      <div className="flex items-center gap-4 mb-3">
        <span className="font-label text-xs text-on-surface-variant">{team.confederation}</span>
        <span className="font-label text-xs text-on-surface-variant">&middot;</span>
        <span className="font-label text-xs text-on-surface-variant">{team.coachName}</span>
      </div>
      <ChemistryBar value={team.chemistry} label="Chemistry" size="sm" />
    </Link>
  )
}
