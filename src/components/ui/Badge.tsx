interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'primary', size = 'sm' }: BadgeProps) {
  const base = 'inline-flex items-center font-label font-semibold uppercase tracking-widest rounded-full'
  const sizeClass = size === 'sm' ? 'px-3 py-0.5 text-[10px]' : 'px-4 py-1 text-xs'

  const variantClass = {
    primary: 'bg-primary/15 text-primary border border-primary/20',
    secondary: 'bg-secondary/15 text-secondary border border-secondary/20',
    tertiary: 'bg-tertiary/15 text-tertiary border border-tertiary/20',
    outline: 'border border-white/20 text-on-surface-variant',
  }[variant]

  return <span className={`${base} ${sizeClass} ${variantClass}`}>{children}</span>
}
