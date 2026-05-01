'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'

interface League {
  id: string
  name: string
  description: string | null
  league_type: 'public' | 'private'
  tier: string
  max_members: number
  season: string
  is_active: boolean
  created_at: string
  role?: string
  joined_at?: string
}

export default function LeaguesPage() {
  const t = useTranslations('leaguesPage')
  const { user, loading: authLoading } = useAuth()
  const { apiFetch, isAuthenticated } = useApi()
  const [myLeagues, setMyLeagues] = useState<League[]>([])
  const [publicLeagues, setPublicLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    apiFetch('/api/leagues')
      .then(data => {
        setMyLeagues(data.my_leagues ?? [])
        setPublicLeagues(data.public_leagues ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authLoading, isAuthenticated, apiFetch])

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-primary">
            {t('heading')}
          </h1>
          <p className="text-on-surface-variant mt-2">
            {t('description')}
          </p>
        </div>
        {user && (
          <Link
            href="/leagues/create"
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-tight hover:brightness-110 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            {t('createLeague')}
          </Link>
        )}
      </div>

      {!user && !authLoading && (
        <GlassCard className="p-8 text-center mb-10">
          <h2 className="font-display text-2xl text-primary mb-3">{t('joinCompetition')}</h2>
          <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
            {t('joinDescription')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/auth/register"
              className="px-6 py-3 rounded-xl border border-white/[0.08] text-on-surface font-bold hover:bg-white/[0.04] transition-all"
            >
              {t('createAccount')}
            </Link>
          </div>
        </GlassCard>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/[0.08] p-6 animate-pulse">
              <div className="h-6 bg-white/[0.06] rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/[0.06] rounded w-1/2 mb-6" />
              <div className="h-10 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && myLeagues.length > 0 && (
        <section className="mb-12">
          <h2 className="font-headline text-xl uppercase tracking-widest text-on-surface-variant mb-6">
            {t('myLeagues')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLeagues.map(league => (
              <LeagueCard key={league.id} league={league} isMember />
            ))}
          </div>
        </section>
      )}

      {!loading && publicLeagues.length > 0 && (
        <section>
          <h2 className="font-headline text-xl uppercase tracking-widest text-on-surface-variant mb-6">
            {t('publicLeagues')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicLeagues.map(league => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        </section>
      )}

      {!loading && !myLeagues.length && !publicLeagues.length && user && (
        <GlassCard className="p-12 text-center">
          <p className="text-on-surface-variant text-lg mb-4">{t('noLeagues')}</p>
          <Link
            href="/leagues/create"
            className="inline-block px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all"
          >
            {t('createFirstLeague')}
          </Link>
        </GlassCard>
      )}
    </div>
  )
}

function LeagueCard({ league, isMember }: { league: League; isMember?: boolean }) {
  const t = useTranslations('leaguesPage')
  const tierColors: Record<string, string> = {
    free: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  return (
    <Link href={`/leagues/${league.id}`}>
      <GlassCard hover className="p-6 h-full">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-headline text-lg text-on-surface tracking-tight line-clamp-1">
            {league.name}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${tierColors[league.tier] ?? tierColors.free}`}>
            {league.tier}
          </span>
        </div>

        {league.description && (
          <p className="text-on-surface-variant text-sm line-clamp-2 mb-4">{league.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-auto pt-4 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${league.league_type === 'public' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {t(league.league_type)}
          </span>
          <span>{league.season}</span>
          {isMember && league.role && (
            <span className="ml-auto px-2 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase tracking-wider">
              {league.role}
            </span>
          )}
        </div>
      </GlassCard>
    </Link>
  )
}
