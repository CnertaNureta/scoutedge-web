import type { Metadata } from 'next'
import ConverterClient from './ConverterClient'

export const metadata: Metadata = {
  title: 'World Cup 2026 Schedule in Your Time Zone: Match Time Converter',
  description:
    'Convert all 72 World Cup 2026 group-stage match kick-off times to your local time zone. Filter by group, browse by date, and never miss a game. Supports all major time zones worldwide.',
  keywords:
    'World Cup 2026 schedule, World Cup 2026 time zone, World Cup 2026 kick off time, World Cup 2026 match time converter, World Cup 2026 local time',
  alternates: { canonical: 'https://kickoracle.com/schedule/converter' },
}

export default function ConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'World Cup 2026 Match Time Converter',
    description: 'Convert World Cup 2026 match times to any time zone worldwide.',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'All',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConverterClient />
    </>
  )
}
