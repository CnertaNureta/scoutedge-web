import { useTranslations } from 'next-intl'

interface Pillar {
  titleKey: 'independent' | 'aiPowered' | 'transparency' | 'i18n'
  descKey: 'independentDesc' | 'aiPoweredDesc' | 'transparencyDesc' | 'i18nDesc'
  icon: string
}

const PILLARS: Pillar[] = [
  { titleKey: 'independent', descKey: 'independentDesc', icon: '⚖️' },
  { titleKey: 'aiPowered', descKey: 'aiPoweredDesc', icon: '\u{1F916}' },
  { titleKey: 'transparency', descKey: 'transparencyDesc', icon: '\u{1F50D}' },
  { titleKey: 'i18n', descKey: 'i18nDesc', icon: '\u{1F310}' },
]

export default function TrustStrip({ className = '' }: { className?: string }) {
  const t = useTranslations('trustStrip')
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {PILLARS.map((p) => (
        <div
          key={p.titleKey}
          className="flex flex-col items-center text-center px-3 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
        >
          <span className="text-xl mb-2" aria-hidden="true">
            {p.icon}
          </span>
          <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface mb-1">
            {t(p.titleKey)}
          </p>
          <p className="text-on-surface-variant text-xs leading-relaxed">{t(p.descKey)}</p>
        </div>
      ))}
    </div>
  )
}
