interface SyllableBreakdownProps {
  syllables: string[]
  stressIndex: number
}

export function SyllableBreakdown({ syllables, stressIndex }: SyllableBreakdownProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {syllables.map((syllable, i) => {
        const isStressed = i === stressIndex
        return (
          <span
            key={i}
            className={`inline-flex items-center rounded-md px-3 py-1.5 font-mono text-sm transition-transform ${
              isStressed
                ? 'scale-110 bg-lingo-accent/20 font-bold text-lingo-accent ring-1 ring-lingo-accent/40'
                : 'bg-lingo-surface text-lingo-text-muted'
            }`}
          >
            {syllable}
            {i < syllables.length - 1 && (
              <span className="ml-1.5 text-lingo-border" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
