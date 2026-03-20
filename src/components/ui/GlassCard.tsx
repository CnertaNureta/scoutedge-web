interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function GlassCard({ children, className = '', hover = true }: GlassCardProps) {
  return (
    <div
      className={`glass-panel rounded-xl border border-white/10 shadow-2xl ${
        hover ? 'hover:bg-surface-bright hover:scale-[1.02] transition-all duration-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
