import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/build-alternates'
import ApiDocsClient from './ApiDocsClient'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'API Documentation',
    description:
      'Interactive API reference for the KickOracle B2B Data API — World Cup 2026 matches, predictions, signals, odds, and more.',
    alternates: buildAlternates(locale, '/docs/api'),
  }
}

export default function ApiDocsPage() {
  return <ApiDocsClient />
}
