interface SectionHeaderProps {
  children: React.ReactNode
  accentColor?: string
  withRule?: boolean
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

export default function SectionHeader({
  children,
  accentColor,
  withRule = false,
  as: Tag = 'h2',
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`w-1 h-8 rounded-full shrink-0 ${accentColor ? '' : 'bg-primary'}`}
        style={accentColor ? { background: accentColor } : undefined}
      />
      <Tag className="font-headline text-4xl md:text-5xl tracking-wide uppercase">{children}</Tag>
      {withRule && <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />}
    </div>
  )
}
