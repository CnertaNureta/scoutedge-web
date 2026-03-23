interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function GlassCard({ children, className = '', hover = true }: GlassCardProps) {
  return (
    <div
      className={`glass-panel rounded-2xl border border-white/[0.08] shadow-2xl relative overflow-hidden ${
        hover
          ? 'hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,255,135,0.08)] transition-all duration-300'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
