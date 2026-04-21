'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { TEAMS } from '@/data/teams-meta'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = query.trim().length === 0
    ? TEAMS.slice(0, 8)
    : TEAMS.filter((t) => {
        const q = query.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.group.toLowerCase() === q ||
          t.confederation.toLowerCase().includes(q)
        )
      }).slice(0, 12)

  const navigate = useCallback(
    (slug: string) => {
      onClose()
      setQuery('')
      router.push(`/teams/${slug}`)
    },
    [onClose, router],
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Small delay so the modal renders before focus
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].slug)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search teams"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <svg className="w-5 h-5 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search teams by name, group, or confederation..."
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 text-base outline-none font-body"
            aria-label="Search teams"
          />
          <kbd className="hidden sm:inline-flex text-[11px] font-mono text-on-surface-variant/50 border border-outline-variant rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-[50vh] overflow-y-auto py-2" role="listbox" aria-label="Search results">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-on-surface-variant/60 text-sm font-body">
              No teams found for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((team, i) => (
              <li
                key={team.slug}
                role="option"
                aria-selected={i === selectedIndex}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  i === selectedIndex
                    ? 'bg-primary/15 text-primary'
                    : 'text-on-surface hover:bg-surface-container-highest'
                }`}
                onClick={() => navigate(team.slug)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="text-xl leading-none">{team.flag}</span>
                <span className="font-headline font-bold text-sm tracking-tight flex-1">
                  {team.name}
                </span>
                <span className="text-[11px] font-label text-on-surface-variant/60 uppercase tracking-wider">
                  Group {team.group}
                </span>
                <span className="text-[11px] font-label text-on-surface-variant/40 uppercase tracking-wider">
                  {team.confederation}
                </span>
              </li>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-outline-variant text-[11px] font-label text-on-surface-variant/40">
          <span className="flex items-center gap-1">
            <kbd className="font-mono border border-outline-variant rounded px-1 py-0.5">&uarr;</kbd>
            <kbd className="font-mono border border-outline-variant rounded px-1 py-0.5">&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono border border-outline-variant rounded px-1 py-0.5">&crarr;</kbd>
            select
          </span>
        </div>
      </div>
    </div>
  )
}
