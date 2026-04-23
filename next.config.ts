import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
})

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'r2.thesportsdb.com',
      },
      {
        protocol: 'https',
        hostname: 'www.thesportsdb.com',
      },
    ],
  },
}

export default withSerwist(withNextIntl(nextConfig))
