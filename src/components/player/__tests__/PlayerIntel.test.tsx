import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerIntel from '../PlayerIntel'
import { PLAYERS } from '@/data/players-data'

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => 'en-US'),
  getTranslations: vi.fn(async () => {
    const interpolate = (template: string, values?: Record<string, string | number>) =>
      values
        ? template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))
        : template
    const t = (key: string, values?: Record<string, string | number>) => {
      const templates: Record<string, string> = {
        intelligenceReport: 'Intelligence Report',
        fitnessStatus: 'Fitness',
        sentimentAnalysis: 'Sentiment',
        sentimentDescription: 'Sentiment description',
        selectionRisk: 'Selection risk',
        tacticalRead: 'Tactical: {note}',
        recentSignals: 'Recent signals',
        noSignals: 'No signals yet.',
        signalsRefresh: 'Signals refresh continuously.',
        panelExpands: 'Panel expands as signals arrive.',
        updated: 'Updated {date} UTC',
      }
      return interpolate(templates[key] ?? key, values)
    }
    return t
  }),
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
  it('formats intel last updated using a fixed UTC timezone in the active locale', async () => {
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
