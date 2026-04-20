import { BRAND } from '@/lib/brand-tokens'

interface PullQuoteProps {
  children: React.ReactNode
  accentColor?: string
  source?: string
  className?: string
}

export default function PullQuote({
  children,
  accentColor = BRAND.primary,
  source,
  className = '',
}: PullQuoteProps) {
  return (
    <blockquote
      className={`relative pl-6 md:pl-8 py-4 ${className}`}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <p className="font-body text-lg md:text-xl text-on-surface leading-relaxed italic">
        &ldquo;{children}&rdquo;
      </p>
      {source && (
        <footer className="mt-3 font-label text-xs text-on-surface-variant uppercase tracking-widest">
          {source}
        </footer>
      )}
    </blockquote>
  )
}
