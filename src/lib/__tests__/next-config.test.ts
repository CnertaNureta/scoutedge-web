import { describe, expect, it } from 'vitest'
import nextConfig from '../../../next.config'

describe('next image config', () => {
  it('allows the remote image hosts used across team and player pages', () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? []

    expect(remotePatterns).toEqual(expect.arrayContaining([
      expect.objectContaining({ hostname: 'images.unsplash.com' }),
      expect.objectContaining({ hostname: 'upload.wikimedia.org' }),
      expect.objectContaining({ hostname: 'r2.thesportsdb.com' }),
      expect.objectContaining({ hostname: 'www.thesportsdb.com' }),
    ]))
  })
})
