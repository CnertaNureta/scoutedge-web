import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | KickOracle Cities',
    default: 'Host Cities — World Cup 2026 | KickOracle',
  },
}

export default function CitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
