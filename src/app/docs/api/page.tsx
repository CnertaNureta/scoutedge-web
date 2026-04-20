import type { Metadata } from 'next'
import ApiDocsClient from './ApiDocsClient'

export const metadata: Metadata = {
  title: 'API Documentation',
  description:
    'Interactive API reference for the KickOracle B2B Data API — World Cup 2026 matches, predictions, signals, odds, and more.',
}

export default function ApiDocsPage() {
  return <ApiDocsClient />
}
