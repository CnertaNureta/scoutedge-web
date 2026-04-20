import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | KickOracle Travel',
    default: 'Travel Guide — World Cup 2026 | KickOracle',
  },
}

export default function TravelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
