interface NeonAccentBarProps {
  color: string
  className?: string
}

export default function NeonAccentBar({ color, className = '' }: NeonAccentBarProps) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity ${className}`}
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    />
  )
}
