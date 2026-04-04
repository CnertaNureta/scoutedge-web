import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerIntel from '../PlayerIntel'
import { PLAYERS } from '@/data/players-data'

const basePlayer = PLAYERS.find(
  (player) => player.teamSlug === 'france' && player.slug === 'kylian-mbappe'
)

if (!basePlayer) {
  throw new Error('Expected sample player for PlayerIntel tests')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PlayerIntel', () => {
  it('formats intel last updated using a fixed UTC timezone', () => {
    const toLocaleDateString = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Apr 3, 2026')

    render(
      <PlayerIntel
        player={{
          ...basePlayer,
          intelLastUpdated: '2026-04-03T00:00:00.000Z',
          recentSignals: [],
        }}
      />
    )

    expect(toLocaleDateString).toHaveBeenCalledWith(
      'en-US',
      expect.objectContaining({
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    )
    expect(screen.getByText('Updated Apr 3, 2026 UTC')).toBeInTheDocument()
  })
})
