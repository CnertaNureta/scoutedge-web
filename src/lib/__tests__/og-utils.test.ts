import { describe, expect, it } from 'vitest'
import { sportsEventJsonLd } from '@/lib/og-utils'

describe('sportsEventJsonLd', () => {
  it('does not emit a generic nested SportsEvent that Google validates as an incomplete event', () => {
    const event = sportsEventJsonLd({
      homeName: 'Brazil',
      awayName: 'Morocco',
      homeSlug: 'brazil',
      awaySlug: 'morocco',
      venue: 'MetLife Stadium',
      city: 'New York',
      countryCode: 'US',
      kickoffUtc: '2026-06-13T22:00:00Z',
    })

    expect(event).not.toHaveProperty('superEvent')
    expect(event).toMatchObject({
      '@type': 'SportsEvent',
      location: {
        '@type': 'Place',
        name: 'MetLife Stadium',
      },
    })
  })
})
