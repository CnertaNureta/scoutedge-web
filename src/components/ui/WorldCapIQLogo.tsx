import Link from 'next/link'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

interface KickOracleLogoProps {
  href?: string
  variant?: 'horizontal' | 'stacked'
}

function IQIconMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill={BRAND.primary} />
      {/* Decorative diagonal accent line */}
      <line
        x1="20"
        y1="28"
        x2="30"
        y2="18"
        stroke={SURFACE.surfaceContainerLowest}
        strokeWidth="2.5"
        strokeOpacity="0.15"
        strokeLinecap="round"
      />
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fill={SURFACE.surfaceContainerLowest}
        fontFamily="var(--font-display), 'Bebas Neue', Impact, sans-serif"
        fontSize="22"
        fontWeight="400"
        letterSpacing="-0.5"
      >
        IQ
      </text>
    </svg>
  )
}

function Wordmark() {
  return (
    <span
      className="font-display text-[1.375rem] leading-none tracking-[-0.02em] select-none hidden sm:inline"
      aria-label="KickOracle"
    >
      <span className="text-on-surface">WORLDCAP</span>
      <span className="text-primary">IQ</span>
    </span>
  )
}

function StackedWordmark() {
  return (
    <span
      className="font-display text-sm leading-none tracking-[0.08em] select-none"
      aria-label="KickOracle"
    >
      <span className="text-on-surface">WORLDCAP</span>
      <span className="text-primary">IQ</span>
    </span>
  )
}

export default function KickOracleLogo({
  href = '/',
  variant = 'horizontal',
}: KickOracleLogoProps) {
  if (variant === 'stacked') {
    const content = (
      <div className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
        <IQIconMark size={40} />
        <StackedWordmark />
      </div>
    )

    if (href) {
      return (
        <Link href={href} className="group" aria-label="KickOracle home">
          {content}
        </Link>
      )
    }
    return content
  }

  // Horizontal (default) — header lockup
  const content = (
    <div className="flex items-center gap-2 group-hover:[text-shadow:0_0_12px_rgba(160,212,148,0.3)] transition-all">
      <IQIconMark size={32} />
      <Wordmark />
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group" aria-label="KickOracle home">
        {content}
      </Link>
    )
  }

  return content
}
