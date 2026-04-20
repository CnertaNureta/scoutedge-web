import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTeams } from '@/lib/data-service'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'World Cup 2026 Jerseys — All 48 Team Kits',
  description: 'Browse jerseys for all 48 World Cup 2026 teams. Home, away, and third kits with links to buy from official retailers.',
  alternates: { canonical: 'https://kickoracle.com/gear/jerseys' },
}

export default function JerseysPage() {
  const teams = getAllTeams()

  return (
    <>
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">Gear</Badge>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mt-4 mb-4">
            Team <span className="gradient-text">Jerseys</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            All 48 team kits for the 2026 World Cup.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-20">
        <SectionHeader className="mb-10">All Teams</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {teams.map((team) => (
            <Link key={team.slug} href={`/gear/jerseys/${team.slug}`} className="group">
              <GlassCard className="p-4 text-center hover:bg-surface-bright transition-all" hover>
                <span className="text-3xl block mb-2">{team.flag}</span>
                <span className="font-label text-xs uppercase tracking-widest group-hover:text-primary transition-colors">
                  {team.name}
                </span>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
