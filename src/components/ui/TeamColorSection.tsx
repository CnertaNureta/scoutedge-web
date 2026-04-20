import { SURFACE } from '@/lib/brand-tokens'

interface TeamColorSectionProps {
  children: React.ReactNode
  teamColor: string
  opacity?: number
  borderOpacity?: number
  className?: string
}

export default function TeamColorSection({
  children,
  teamColor,
  opacity = 0.12,
  borderOpacity = 0.3,
  className = '',
}: TeamColorSectionProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${teamColor} ${Math.round(opacity * 100)}%, ${SURFACE.background})`,
      }}
    >
      {/* Top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ backgroundColor: `color-mix(in srgb, ${teamColor} ${Math.round(borderOpacity * 100)}%, transparent)` }}
      />
      {/* Bottom border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ backgroundColor: `color-mix(in srgb, ${teamColor} ${Math.round(borderOpacity * 100)}%, transparent)` }}
      />
      {children}
    </section>
  )
}
