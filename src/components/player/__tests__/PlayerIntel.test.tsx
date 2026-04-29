import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerIntel from '../PlayerIntel'
import { PLAYERS } from '@/data/players-data'
import enMessages from '../../../../messages/en.json'

const basePlayer = PLAYERS.find(
  (player) => player.teamSlug === 'france' && player.slug === 'kylian-mbappe'
)

if (!basePlayer) {
  throw new Error('Expected sample player for PlayerIntel tests')
}

vi.mock('next-intl/server', () => {
  const interpolate = (template: string, params?: Record<string, unknown>) =>
    params
      ? template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
      : template

  return {
    getLocale: vi.fn(async () => 'en-US'),
    getTranslations: vi.fn(async (namespace: string) => {
      const ns = ((enMessages as unknown) as Record<string, Record<string, string>>)[namespace] ?? {}
      return (key: string, params?: Record<string, unknown>) =>
        interpolate(ns[key] ?? key, params)
    }),
  }
})

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
    render(ui)

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
