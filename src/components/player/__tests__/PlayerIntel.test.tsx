import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import PlayerIntel from '../PlayerIntel'
import { PLAYERS } from '@/data/players-data'
import messages from '../../../../messages/en.json'

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('en-US'),
  getTranslations: vi.fn().mockResolvedValue(
    (key: string, values?: Record<string, string | number>) => {
      if (key === 'updated' && values?.date) return `Updated ${values.date} UTC`
      return key
    }
  ),
}))

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
  it('formats intel last updated using a fixed UTC timezone', async () => {
    const toLocaleDateString = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Apr 3, 2026')

    const ui = await PlayerIntel({
      player: {
        ...basePlayer,
        intelLastUpdated: '2026-04-03T00:00:00.000Z',
        recentSignals: [],
      },
    })

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
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
    expect(screen.getByText(/Apr 3, 2026/)).toBeInTheDocument()
  })
})
