import Link from 'next/link'

export type AffiliateSlotId = 'hotel' | 'esim' | 'insurance' | 'tickets' | 'visa' | 'flights'

interface AffiliateSlotProps {
  id: AffiliateSlotId
  placement?: string
  context?: string
  className?: string
  compact?: boolean
}

interface SlotConfig {
  icon: string
  title: string
  pitch: string
  cta: string
  href: string
}

const SLOT_CONFIG: Record<AffiliateSlotId, SlotConfig> = {
  hotel: {
    icon: '🏨',
    title: 'Book Your Stay',
    pitch: 'Hotels near World Cup venues fill up fast. Lock in rates before prices spike.',
    cta: 'Search Hotels',
    href: '#affiliate-hotel',
  },
  esim: {
    icon: '📱',
    title: 'Stay Connected',
    pitch: 'One eSIM covers USA, Canada, and Mexico. Skip roaming charges.',
    cta: 'Compare eSIM Deals',
    href: '#affiliate-esim',
  },
  insurance: {
    icon: '🛡️',
    title: 'Travel Insurance',
    pitch: 'Cover cancellations, medical, and lost baggage for the whole trip.',
    cta: 'Get a Quote',
    href: '#affiliate-insurance',
  },
  tickets: {
    icon: '🎟️',
    title: 'Match Tickets',
    pitch: 'Verified resale and hospitality packages when FIFA ballots close.',
    cta: 'Browse Tickets',
    href: '#affiliate-tickets',
  },
  visa: {
    icon: '🛂',
    title: 'Visa & ESTA Service',
    pitch: 'Expedited ESTA / eTA / visa applications handled by partner agencies.',
    cta: 'Start Application',
    href: '#affiliate-visa',
  },
  flights: {
    icon: '✈️',
    title: 'Find Flights',
    pitch: 'Compare airline prices for every host-country gateway.',
    cta: 'Search Flights',
    href: '#affiliate-flights',
  },
}

export default function AffiliateSlot({ id, placement, context, className = '', compact = false }: AffiliateSlotProps) {
  const slot = SLOT_CONFIG[id]

  if (compact) {
    return (
      <Link
        href={slot.href}
        data-affiliate={id}
        data-placement={placement ?? 'default'}
        data-context={context ?? ''}
        className={`inline-flex items-center gap-2 bg-primary/15 text-primary px-4 py-2 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors ${className}`}
      >
        <span>{slot.icon}</span>
        <span>{slot.cta}</span>
      </Link>
    )
  }

  return (
    <div
      data-affiliate={id}
      data-placement={placement ?? 'default'}
      data-context={context ?? ''}
      className={`glass-panel rounded-2xl border border-white/[0.08] p-6 md:p-7 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{slot.icon}</span>
        <div className="flex-1">
          <h3 className="font-headline text-lg uppercase tracking-tight">{slot.title}</h3>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
            Sponsored placement
          </p>
        </div>
      </div>
      <p className="text-on-surface-variant text-sm leading-relaxed mb-5">{slot.pitch}</p>
      <Link
        href={slot.href}
        className="inline-flex items-center gap-2 bg-primary/15 text-primary px-5 py-2.5 rounded-xl font-label text-xs font-semibold uppercase tracking-widest hover:bg-primary/25 transition-colors"
      >
        {slot.cta} &rarr;
      </Link>
    </div>
  )
}
