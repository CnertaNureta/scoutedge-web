'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface TeamOption {
  slug: string
  name: string
  flag: string
  group: string
  fifaRanking: number
}

export default function CompareSelector({ teams }: { teams: TeamOption[] }) {
  const t = useTranslations('compareSelector')
  const tTeams = useTranslations('teamsPage')
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [openA, setOpenA] = useState(false)
  const [openB, setOpenB] = useState(false)

  const selectedA = teams.find((t) => t.slug === teamA)
  const selectedB = teams.find((t) => t.slug === teamB)

  const filteredA = useMemo(() => {
    const q = searchA.toLowerCase()
    return teams
      .filter((t) => t.slug !== teamB)
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.group.toLowerCase() === q)
  }, [teams, teamB, searchA])

  const filteredB = useMemo(() => {
    const q = searchB.toLowerCase()
    return teams
      .filter((t) => t.slug !== teamA)
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.group.toLowerCase() === q)
  }, [teams, teamA, searchB])

  const compareUrl = useMemo(() => {
    if (!teamA || !teamB) return null
    const [a, b] = [teamA, teamB].sort()
    return `/compare/${a}-vs-${b}`
  }, [teamA, teamB])

  function TeamDropdown({
    label,
    selected,
    search,
    setSearch,
    open,
    setOpen,
    filtered,
    onSelect,
  }: {
    label: string
    selected: TeamOption | undefined
    search: string
    setSearch: (s: string) => void
    open: boolean
    setOpen: (o: boolean) => void
    filtered: TeamOption[]
    onSelect: (slug: string) => void
  }) {
    return (
      <div className="relative flex-1">
        <label className="block font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
        <button
          onClick={() => { setOpen(!open); setSearch('') }}
          className="w-full bg-surface-container rounded-xl px-4 py-3 text-left border border-white/[0.08] hover:border-primary/30 transition-colors flex items-center justify-between"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="text-xl">{selected.flag}</span>
              <span className="font-headline text-sm uppercase tracking-tight">{selected.name}</span>
              <span className="text-xs text-on-surface-variant">({tTeams('group', { group: selected.group })})</span>
            </span>
          ) : (
            <span className="text-on-surface-variant/50 text-sm">{t('selectTeam')}</span>
          )}
          <svg className={`w-4 h-4 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-50 glass-panel rounded-xl border border-white/[0.08] shadow-2xl max-h-[360px] overflow-hidden flex flex-col">
              <div className="p-2 border-b border-white/[0.06]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('selectTeam')}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-white/[0.04] focus:border-primary/30 focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-on-surface-variant/50">{t('noTeamsFound')}</div>
                ) : (
                  filtered.map((tm) => (
                    <button
                      key={tm.slug}
                      onClick={() => { onSelect(tm.slug); setOpen(false) }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <span className="text-lg">{tm.flag}</span>
                      <span className="flex-1">
                        <span className="font-headline text-sm uppercase tracking-tight">{tm.name}</span>
                        <span className="text-xs text-on-surface-variant ml-2">{tTeams('group', { group: tm.group })}</span>
                      </span>
                      <span className="text-xs text-on-surface-variant/60">#{tm.fifaRanking}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.08] p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-end">
        <TeamDropdown
          label={t('teamA')}
          selected={selectedA}
          search={searchA}
          setSearch={setSearchA}
          open={openA}
          setOpen={(o) => { setOpenA(o); if (o) setOpenB(false) }}
          filtered={filteredA}
          onSelect={setTeamA}
        />

        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high border border-white/[0.08] shrink-0 mb-0.5">
          <span className="font-headline text-sm text-on-surface-variant">{t('vs')}</span>
        </div>

        <TeamDropdown
          label={t('teamB')}
          selected={selectedB}
          search={searchB}
          setSearch={setSearchB}
          open={openB}
          setOpen={(o) => { setOpenB(o); if (o) setOpenA(false) }}
          filtered={filteredB}
          onSelect={setTeamB}
        />

        {compareUrl ? (
          <Link
            href={compareUrl}
            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all shrink-0 text-center"
          >
            {t('compare')}
          </Link>
        ) : (
          <button
            disabled
            className="bg-surface-container-high text-on-surface-variant/40 px-8 py-3 rounded-xl font-label font-bold uppercase tracking-widest text-sm cursor-not-allowed shrink-0"
          >
            {t('compare')}
          </button>
        )}
      </div>

      {selectedA && selectedB && (
        <div className="mt-6 pt-6 border-t border-white/[0.06]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">{selectedA.flag}</div>
              <div className="font-headline text-sm uppercase tracking-tight">{selectedA.name}</div>
              <div className="text-xs text-on-surface-variant">FIFA #{selectedA.fifaRanking}</div>
            </div>
            <div className="flex items-center justify-center">
              <span className="font-headline text-2xl text-on-surface-variant/30">{t('vs')}</span>
            </div>
            <div>
              <div className="text-2xl mb-1">{selectedB.flag}</div>
              <div className="font-headline text-sm uppercase tracking-tight">{selectedB.name}</div>
              <div className="text-xs text-on-surface-variant">FIFA #{selectedB.fifaRanking}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
