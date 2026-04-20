'use client'

import { CARD_THEMES, type CardThemeId } from '@/lib/fan-card-types'

const THEME_PREVIEWS: Record<CardThemeId, { gradient: string; label: string }> = {
  classic: {
    gradient: 'bg-gradient-to-br from-[#1e201e] to-[#121412]',
    label: 'FREE',
  },
  neon: {
    gradient: 'bg-gradient-to-br from-[#0a0a1a] to-[#121412] ring-1 ring-primary/30',
    label: 'FREE',
  },
  gold: {
    gradient: 'bg-gradient-to-br from-[#2a2008] via-[#1a150a] to-[#2a2008]',
    label: '$1.99',
  },
  holographic: {
    gradient: 'bg-gradient-to-br from-[#1a0a2e] via-[#0a1a1a] to-[#1a0a2e]',
    label: '$2.99',
  },
  stadium: {
    gradient: 'bg-gradient-to-br from-[#0d1a0d] to-[#0a120a]',
    label: '$4.99',
  },
}

interface CardThemePickerProps {
  selected: CardThemeId
  onChange: (theme: CardThemeId) => void
}

export default function CardThemePicker({ selected, onChange }: CardThemePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {CARD_THEMES.map((theme) => {
        const preview = THEME_PREVIEWS[theme.id]
        const isSelected = selected === theme.id
        return (
          <button
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all min-h-[44px]
              ${isSelected
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-white/[0.06] hover:border-white/15'
              }
            `}
          >
            <div className={`w-full h-16 rounded-lg ${preview.gradient} border border-white/[0.06]`} />
            <span className="font-label text-[10px] font-semibold uppercase tracking-wide text-on-surface">
              {theme.name}
            </span>
            <span
              className={`font-mono text-[9px] px-2 py-0.5 rounded-full
                ${theme.premium
                  ? 'bg-tertiary/15 text-tertiary border border-tertiary/20'
                  : 'bg-primary/15 text-primary border border-primary/20'
                }
              `}
            >
              {preview.label}
            </span>
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[9px] text-on-primary font-bold">✓</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
