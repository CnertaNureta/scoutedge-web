import GlassCard from './GlassCard'
import { BRAND, SURFACE } from '@/lib/brand-tokens'
import { useLocale, useTranslations } from 'next-intl'

const DEFAULT_SIGNATURE = 'Kick Oracle Desk'

export interface IntelligenceModuleProps {
  title: string
  subtitle?: string
  dossierId: string
  scoutVerdict?: string
  signalCount?: number
  sourceCount?: number
  lastUpdatedAt?: string | Date
  accentColor?: string
  className?: string
  children: React.ReactNode
}

function toRelativeTime(
  input: string | Date,
  locale: string,
  now: Date = new Date(),
): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const diffMs = date.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (absSeconds < 60) {
    return rtf.format(Math.round(diffSeconds), 'second')
  }
  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffSeconds / 3600)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffSeconds / 86400)
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffDays / 365)
  return rtf.format(diffYears, 'year')
}

function buildConfidenceLine(opts: {
  signalCount?: number
  sourceCount?: number
  refreshed?: string
  t: (key: string, values?: Record<string, string | number>) => string
}): string | null {
  const parts: string[] = []
  if (typeof opts.signalCount === 'number') {
    parts.push(opts.t('computedFromSignals', { count: opts.signalCount }))
  }
  if (typeof opts.sourceCount === 'number') {
    parts.push(opts.t('sourceCount', { count: opts.sourceCount }))
  }
  if (opts.refreshed) {
    parts.push(opts.t('refreshed', { time: opts.refreshed }))
  }
  if (parts.length === 0) {
    return null
  }
  return parts.join(' · ')
}

function formatSignature(signature: string): string {
  const trimmed = signature.trim() || DEFAULT_SIGNATURE
  return trimmed.startsWith('—') ? trimmed : `— ${trimmed}`
}

function appendSignature(verdict: string, signature: string): string {
  const trimmed = verdict.trim()
  if (trimmed.endsWith(signature)) {
    return trimmed
  }
  return `${trimmed} ${signature}`
}

export default function IntelligenceModule({
  title,
  subtitle,
  dossierId,
  scoutVerdict,
  signalCount,
  sourceCount,
  lastUpdatedAt,
  accentColor = BRAND.primary,
  className = '',
  children,
}: IntelligenceModuleProps) {
  const t = useTranslations('intelligenceModule')
  const locale = useLocale()
  const signature = formatSignature(t('signature'))
  const refreshed = lastUpdatedAt ? toRelativeTime(lastUpdatedAt, locale) : undefined
  const confidenceLine = buildConfidenceLine({
    signalCount,
    sourceCount,
    refreshed,
    t,
  })

  return (
    <GlassCard className={className}>
      {/* Top accent gradient bar — sibling of IntelligenceReport archetype card */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, ${accentColor}99, transparent)`,
        }}
      />

      {/* Dossier stamp — top-right corner */}
      <div
        className="absolute top-4 right-5 font-mono text-[10px] uppercase tracking-widest"
        style={{ color: BRAND.tertiary }}
      >
        {dossierId}
      </div>

      <div className="p-6 md:p-8">
        {/* Header block */}
        <header className="mb-5 pr-32">
          {subtitle && (
            <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-widest mb-2">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div
              className="w-px h-7 shrink-0"
              style={{ background: accentColor }}
            />
            <h3 className="font-headline text-2xl md:text-3xl tracking-wide uppercase">
              {title}
            </h3>
          </div>
        </header>

        {/* Scout verdict */}
        {scoutVerdict && (
          <p
            className="font-body italic text-base md:text-lg leading-relaxed mb-6"
            style={{ color: accentColor }}
          >
            {appendSignature(scoutVerdict, signature)}
          </p>
        )}

        {/* Children — content slot */}
        <div className="font-body text-on-surface">{children}</div>

        {/* Hairline divider */}
        <div
          className="h-px my-6"
          style={{ background: `${SURFACE.outlineVariant}66` }}
        />

        {/* Confidence footer */}
        <footer className="flex flex-col gap-2">
          {confidenceLine && (
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
              {confidenceLine}
            </p>
          )}
          <p className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-[0.2em]">
            {signature.toUpperCase()}
          </p>
        </footer>
      </div>
    </GlassCard>
  )
}
