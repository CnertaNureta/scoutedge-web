'use client'

import { useState, useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { LingoCountry, LingoPlayer } from '@/types/lingo'

interface LingoSearchBarProps {
  countries: LingoCountry[]
  players: LingoPlayer[]
}

interface SearchResult {
  type: 'country' | 'player'
  name: string
  phonetic: string
  href: string
  flag?: string
  subtitle?: string
}

export function LingoSearchBar({ countries, players }: LingoSearchBarProps) {
  const t = useTranslations('lingoSearch')
  const [query, setQuery] = useState('')

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()

    const countryResults: SearchResult[] = countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.localName.toLowerCase().includes(q) ||
          c.id.includes(q),
      )
      .slice(0, 5)
      .map((c) => ({
        type: 'country',
        name: c.name,
        phonetic: c.phonetic,
        href: `/lingo/countries/${c.id}`,
        flag: c.flag,
        subtitle: c.region,
      }))

    const playerResults: SearchResult[] = players
      .filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))
      .slice(0, 5)
      .map((p) => ({
        type: 'player',
        name: p.name,
        phonetic: p.phonetic,
        href: `/lingo/players/${p.id}`,
        subtitle: `${p.position} · ${p.club}`,
      }))

    return [...countryResults, ...playerResults].slice(0, 8)
  }, [query, countries, players])

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lingo-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full rounded-xl border border-lingo-border/50 bg-lingo-surface py-3 pl-11 pr-4 text-sm text-lingo-text placeholder:text-lingo-text-muted focus:border-lingo-accent/50 focus:outline-none focus:ring-1 focus:ring-lingo-accent/30"
          aria-label={t('ariaLabel')}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-lingo-border/50 bg-lingo-surface shadow-2xl shadow-black/30">
          {results.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              onClick={() => setQuery('')}
              className="flex items-center gap-3 border-b border-lingo-border/30 px-4 py-3 last:border-0 hover:bg-lingo-surface-hover"
            >
              {r.flag ? (
                <span className="text-lg" aria-hidden="true">
                  {r.flag}
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lingo-accent/10 text-xs font-medium text-lingo-accent">
                  {r.name.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-lingo-text">{r.name}</p>
                <p className="truncate font-mono text-xs text-lingo-phonetic">{r.phonetic}</p>
              </div>
              <span className="shrink-0 rounded-md bg-lingo-bg px-2 py-0.5 text-xs text-lingo-text-muted">
                {r.type}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
