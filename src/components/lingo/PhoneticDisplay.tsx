interface PhoneticDisplayProps {
  phonetic: string
  ipa: string
  size?: 'sm' | 'lg'
}

export function PhoneticDisplay({ phonetic, ipa, size = 'sm' }: PhoneticDisplayProps) {
  const phoneticClass =
    size === 'lg' ? 'text-2xl sm:text-3xl font-semibold' : 'text-base font-medium'
  const ipaClass = size === 'lg' ? 'text-base sm:text-lg' : 'text-sm'

  return (
    <div className="space-y-1">
      <p className={`${phoneticClass} text-lingo-phonetic`}>{phonetic}</p>
      <p className={`${ipaClass} font-mono text-lingo-ipa`}>{ipa}</p>
    </div>
  )
}
