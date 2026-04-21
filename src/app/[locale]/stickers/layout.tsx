import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | KickOracle Stickers',
    default: 'Sticker Album — World Cup 2026 | KickOracle',
  },
}

export default function StickersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
