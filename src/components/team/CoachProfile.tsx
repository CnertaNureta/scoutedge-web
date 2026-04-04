import type { CoachProfile as CoachData } from '@/data/coaches-data'
import Image from 'next/image'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import ChemistryBar from '@/components/ui/ChemistryBar'
import NeonAccentBar from '@/components/ui/NeonAccentBar'

interface CoachProfileProps {
  coach: CoachData
}

export default function CoachProfile({ coach }: CoachProfileProps) {
  return (
    <section className="max-w-[1440px] mx-auto px-6 mb-12">
      <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
        Head Coach
      </h2>
      <p className="text-on-surface-variant text-sm mb-6">The man in charge of tactics, squad selection, and matchday decisions.</p>

      <GlassCard className="p-6 md:p-8 relative overflow-hidden">
        <NeonAccentBar color="#a0d494" />

        {/* Coach header */}
        <div className="flex flex-col sm:flex-row gap-5 mb-6">
          {/* Coach photo */}
          <div className="shrink-0">
            {coach.photo ? (
              <Image
                src={coach.photo}
                alt={`${coach.name} portrait`}
                width={144}
                height={144}
                sizes="(min-width: 768px) 144px, 112px"
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border border-white/[0.08]"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-surface-container flex items-center justify-center border border-white/[0.08]">
                <span className="font-headline text-3xl text-on-surface-variant">
                  {coach.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-headline text-3xl md:text-4xl uppercase tracking-wide">{coach.name}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="primary" size="sm">{coach.nationality}</Badge>
                <Badge variant="outline" size="sm">Age {coach.age}</Badge>
                <Badge variant="tertiary" size="sm">{coach.formation}</Badge>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Win Rate</span>
              <span className="font-headline text-3xl text-primary">{coach.winRate}%</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-on-surface leading-relaxed mb-6">{coach.bio}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* Tactical Style */}
            <div>
              <span className="font-label text-xs font-semibold text-primary uppercase tracking-widest block mb-2">
                Tactical Style
              </span>
              <p className="text-on-surface-variant leading-relaxed">{coach.tacticalStyle}</p>
            </div>

            {/* Philosophy */}
            <div>
              <span className="font-label text-xs font-semibold text-tertiary uppercase tracking-widest block mb-2">
                Coaching Philosophy
              </span>
              <p className="text-on-surface-variant leading-relaxed">{coach.philosophy}</p>
            </div>

            {/* Appointment info */}
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block">Appointed</span>
                <span className="font-body text-sm text-on-surface font-semibold">{coach.appointedDate}</span>
              </div>
              <div>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block">Contract Until</span>
                <span className="font-body text-sm text-on-surface font-semibold">{coach.contractUntil}</span>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Career Highlights */}
            <div>
              <span className="font-label text-xs font-semibold text-primary uppercase tracking-widest block mb-2">
                Career Highlights
              </span>
              <ul className="space-y-2">
                {coach.careerHighlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Previous Clubs */}
            <div>
              <span className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest block mb-2">
                Managerial Career
              </span>
              <div className="flex flex-wrap gap-2">
                {coach.previousClubs.map((club, i) => (
                  <span
                    key={i}
                    className="inline-block px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-on-surface-variant"
                  >
                    {club}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  )
}
