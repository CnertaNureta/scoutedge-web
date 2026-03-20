interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'primary', size = 'sm' }: BadgeProps) {
  const base = 'inline-flex items-center font-label font-bold uppercase tracking-widest rounded-full'
  const sizeClass = size === 'sm' ? 'px-3 py-0.5 text-[10px]' : 'px-4 py-1 text-xs'

  const variantClass = {
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary-container text-on-tertiary-container',
    outline: 'border border-outline-variant text-on-surface-variant',
  }[variant]

  return <span className={`${base} ${sizeClass} ${variantClass}`}>{children}</span>
}
