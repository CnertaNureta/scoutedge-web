import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/lib/brand-tokens'

interface EditorialCardProps {
  href: string
  imageSrc: string
  imageAlt: string
  title: string
  subtitle?: string
  accent?: string
  overlayContent?: React.ReactNode
  size?: 'large' | 'medium'
  className?: string
  children?: React.ReactNode
}

export default function EditorialCard({
  href,
  imageSrc,
  imageAlt,
  title,
  subtitle,
  accent,
  overlayContent,
  size = 'medium',
  className = '',
  children,
}: EditorialCardProps) {
  const height = size === 'large' ? 'h-[400px] md:h-[480px]' : 'h-[240px] md:h-[280px]'

  return (
    <Link
      href={href}
      className={`group relative block ${height} rounded-2xl overflow-hidden ${className}`}
    >
      {/* Background image */}
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover brightness-[0.4] saturate-[1.1] group-hover:scale-105 transition-transform duration-700 ease-out"
        sizes={size === 'large' ? '(max-width: 768px) 100vw, 100vw' : '(max-width: 768px) 100vw, 50vw'}
      />

      {/* Team color overlay gradient */}
      {accent && (
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
        {overlayContent}
        <h3 className="font-headline text-2xl md:text-3xl tracking-wide uppercase text-white leading-tight group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        {subtitle && (
          <p className="text-on-surface-variant text-sm mt-2 line-clamp-2 max-w-lg">{subtitle}</p>
        )}
        {children}
      </div>

      {/* Hover accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent || BRAND.primary }}
      />
    </Link>
  )
}
