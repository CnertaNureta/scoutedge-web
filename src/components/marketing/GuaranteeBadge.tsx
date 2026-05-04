import { useTranslations } from 'next-intl'

export default function GuaranteeBadge({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('pricingPage.guarantee')

  return (
    <div
      className={`inline-flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary/[0.06] backdrop-blur-sm ${
        compact ? 'px-4 py-3' : 'px-6 py-4'
      }`}
      role="note"
    >
      <svg
        width={compact ? '20' : '28'}
        height={compact ? '20' : '28'}
        viewBox="0 0 24 24"
        fill="none"
        className="text-secondary shrink-0 mt-0.5"
        aria-label={t('ariaIcon')}
      >
        <path
          d="M12 2L4 6V12C4 16.5 7 20.5 12 22C17 20.5 20 16.5 20 12V6L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9 12L11 14L15 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="text-left">
        <p className={`font-headline font-bold text-on-surface uppercase tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
          {t('title')}
        </p>
        <p className={`text-on-surface-variant leading-relaxed ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
          {t('body')}
        </p>
      </div>
    </div>
  )
}
