import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | KickOracle Gear',
    default: 'Gear & Merchandise — World Cup 2026 | KickOracle',
  },
}

export default function GearLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
