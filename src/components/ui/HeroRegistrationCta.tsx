import Link from 'next/link'

interface HeroRegistrationCtaProps {
  headline?: string
  cta?: string
  href?: string
  className?: string
}

export default function HeroRegistrationCta({
  headline = 'Free AI predictions — updated daily.',
  cta = 'Create Free Account',
  href = '/auth/register',
  className = '',
}: HeroRegistrationCtaProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3 ${className}`}>
      <p className="font-label text-sm text-on-surface-variant">{headline}</p>
      <Link
        href={href}
        className="shrink-0 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all min-h-[44px] flex items-center"
      >
        {cta}
      </Link>
    </div>
  )
}
