import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import CoachPressureProfile from '../CoachPressureProfile'
import type { CoachProfile } from '@/data/coaches-data'
import enMessages from '../../../../messages/en.json'

vi.mock('next-intl/server', () => {
  const interpolate = (template: string, params?: Record<string, unknown>) =>
    params
      ? template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
      : template

  return {
    getLocale: vi.fn(async () => 'en-US'),
    getTranslations: vi.fn(async (namespace: string) => {
      const ns =
        ((enMessages as unknown) as Record<string, Record<string, string>>)[namespace] ?? {}
      return (key: string, params?: Record<string, unknown>) =>
        interpolate(ns[key] ?? key, params)
    }),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeCoach(overrides: Partial<CoachProfile> = {}): CoachProfile {
  return {
    teamSlug: 'brazil',
    name: 'Test Coach',
    nationality: 'Testlandian',
    age: 55,
    tacticalStyle: '',
    formation: '4-3-3',
    philosophy: '',
    careerHighlights: [],
    previousClubs: [],
    appointedDate: '2024',
    contractUntil: '2026',
    winRate: 50,
    bio: '',
    ...overrides,
  }
}

describe('CoachPressureProfile', () => {
  it('renders the archive stamp with team slug prefix', async () => {
    const ui = await CoachPressureProfile({
      coach: makeCoach({ teamSlug: 'brazil' }),
      teamSlug: 'brazil',
      teamName: 'Brazil',
    })
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {ui}
      </NextIntlClientProvider>,
    )
    expect(
      screen.getByText('SCT-BRA-T7-COACH-PRESSURE-2026'),
    ).toBeInTheDocument()
  })

  it('renders pending state when coach has no pressure profile', async () => {
    const ui = await CoachPressureProfile({
      coach: makeCoach({ name: 'Anonymous Coach' }),
      teamSlug: 'testland',
      teamName: 'Testland',
    })
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {ui}
      </NextIntlClientProvider>,
    )
    expect(screen.getByText(/Anonymous Coach/)).toBeInTheDocument()
    expect(screen.getByText(/still being assembled/i)).toBeInTheDocument()
  })

  it('renders W-D-L badges when big-game record is present', async () => {
    const ui = await CoachPressureProfile({
      coach: makeCoach({
        teamSlug: 'france',
        pressureProfile: {
          bigGameRecord: { played: 20, won: 12, drawn: 5, lost: 3 },
          inGameTells: ['Hooks attacking sub past 70 when trailing'],
          formationTweaks: ['Shifts to 5-4-1 chasing a draw'],
          setPieceBias: 'attacking',
        },
      }),
      teamSlug: 'france',
      teamName: 'France',
    })
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {ui}
      </NextIntlClientProvider>,
    )
    expect(screen.getByText('12W')).toBeInTheDocument()
    expect(screen.getByText('5D')).toBeInTheDocument()
    expect(screen.getByText('3L')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('renders in-game tells as a numbered list', async () => {
    const ui = await CoachPressureProfile({
      coach: makeCoach({
        teamSlug: 'germany',
        pressureProfile: {
          inGameTells: ['First tell observation', 'Second tell observation'],
          formationTweaks: [],
          setPieceBias: 'neutral',
        },
      }),
      teamSlug: 'germany',
      teamName: 'Germany',
    })
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {ui}
      </NextIntlClientProvider>,
    )
    expect(screen.getByText('First tell observation')).toBeInTheDocument()
    expect(screen.getByText('Second tell observation')).toBeInTheDocument()
  })
})
