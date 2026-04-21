import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Lingo — World Cup Pronunciation Guide | KickOracle',
    template: '%s | KickOracle Lingo',
  },
  description:
    'Pronunciation guides for all World Cup 2026 countries, players, and football terms. IPA transcriptions, phonetic breakdowns, and cultural context.',
}

export default function LingoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lingo-bg">
      {children}
    </div>
  )
}
