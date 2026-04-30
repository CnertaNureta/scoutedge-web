import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../messages/en.json'

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: vi.fn(() => ({ tier: 'free', hasAccess: () => false, suggestUpgrade: () => 'match_pass', loading: false, error: null })),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: () => ({ select: () => ({ eq: () => ({ gt: () => Promise.resolve({ data: [] }) }) }) }),
  })),
}))

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { useEntitlements } from '@/hooks/useEntitlements'
import PKBattleApp from '../PKBattleApp'

const mockUseEntitlements = vi.mocked(useEntitlements)

function renderApp() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <PKBattleApp />
    </NextIntlClientProvider>,
  )
}

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  mockUseEntitlements.mockReturnValue({ entitlements: [], tier: 'free', hasAccess: () => false, suggestUpgrade: () => 'match_pass' as const, loading: false, error: null })
  global.fetch = vi.fn((url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
    if (u.includes('/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ totalBattles: 0, uniqueSessions: 0, totalDraws: 0, uniquePlayersUsed: 0 }) })
    }
    if (u.includes('/leaderboard')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ leaderboard: [] }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }) as unknown as typeof fetch
})

describe('PKBattleApp', () => {
  it('renders the PK BATTLE header', () => {
    renderApp()
    expect(screen.getByText('PK BATTLE')).toBeInTheDocument()
  })

  it('renders Player vs Player headline', () => {
    renderApp()
    expect(screen.getByText('vs Player')).toBeInTheDocument()
  })

  it('renders FreemiumBanner for free users', () => {
    renderApp()
    expect(screen.getByText(/free battle.*left today/i)).toBeInTheDocument()
  })

  it('hides FreemiumBanner for premium users', () => {
    mockUseEntitlements.mockReturnValue({ entitlements: [], tier: 'tournament_pass', hasAccess: () => true, suggestUpgrade: () => 'scout_pass' as const, loading: false, error: null })
    renderApp()
    expect(screen.queryByText(/free battle.*left today/i)).not.toBeInTheDocument()
  })

  it('renders Quick Modes buttons', () => {
    renderApp()
    expect(screen.getByText('Quick Modes')).toBeInTheDocument()
    expect(screen.getByText('FWD vs GK')).toBeInTheDocument()
    expect(screen.getByText('FWD vs DEF')).toBeInTheDocument()
    expect(screen.getByText('MID vs MID')).toBeInTheDocument()
    expect(screen.getByText('FWD vs FWD')).toBeInTheDocument()
  })

  it('renders Fight button as disabled when no players selected', () => {
    renderApp()
    const fightBtn = screen.getByText('Fight!')
    expect(fightBtn).toBeDisabled()
  })

  it('renders Best of 5 button disabled for free users', () => {
    renderApp()
    const bo5Btn = screen.getByText('Best of 5')
    expect(bo5Btn).toBeDisabled()
  })

  it('renders Random Matchup button', () => {
    renderApp()
    expect(screen.getByText('Random Matchup')).toBeInTheDocument()
  })

  it('selects random players when Random Matchup is clicked', async () => {
    renderApp()
    const randomBtn = screen.getByText('Random Matchup')
    fireEvent.click(randomBtn)

    await waitFor(() => {
      const changeButtons = screen.getAllByText('Change')
      expect(changeButtons.length).toBe(2)
    })
  })

  it('enables Fight button after Random Matchup', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))

    await waitFor(() => {
      const fightBtn = screen.getByText('Fight!')
      expect(fightBtn).not.toBeDisabled()
    })
  })

  it('renders Featured Duels section', () => {
    renderApp()
    expect(screen.getByText('Featured Duels')).toBeInTheDocument()
  })

  it('transitions to result screen after Fight', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))

    await waitFor(() => {
      expect(screen.getByText('Fight!')).not.toBeDisabled()
    })

    fireEvent.click(screen.getByText('Fight!'))

    await waitFor(() => {
      expect(screen.getByText('Battle Breakdown')).toBeInTheDocument()
    })
  })

  it('shows Rematch and New Battle buttons on result screen', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))
    await waitFor(() => expect(screen.getByText('Fight!')).not.toBeDisabled())
    fireEvent.click(screen.getByText('Fight!'))

    await waitFor(() => {
      expect(screen.getByText('Rematch')).toBeInTheDocument()
      expect(screen.getByText('New Battle')).toBeInTheDocument()
    })
  })

  it('returns to select screen on New Battle', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))
    await waitFor(() => expect(screen.getByText('Fight!')).not.toBeDisabled())
    fireEvent.click(screen.getByText('Fight!'))
    await waitFor(() => expect(screen.getByText('New Battle')).toBeInTheDocument())

    fireEvent.click(screen.getByText('New Battle'))

    await waitFor(() => {
      expect(screen.getByText('PK BATTLE')).toBeInTheDocument()
      expect(screen.getByText('Quick Modes')).toBeInTheDocument()
    })
  })

  it('shows share buttons on result screen', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))
    await waitFor(() => expect(screen.getByText('Fight!')).not.toBeDisabled())
    fireEvent.click(screen.getByText('Fight!'))

    await waitFor(() => {
      expect(screen.getByLabelText('Share on X/Twitter')).toBeInTheDocument()
      expect(screen.getByLabelText('Share on WhatsApp')).toBeInTheDocument()
      expect(screen.getByLabelText('Copy result text')).toBeInTheDocument()
    })
  })

  it('shows "Go Unlimited" link when remaining <= 2', async () => {
    localStorageMock.setItem('pk-battle-daily', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 3 }))
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('Go Unlimited')).toBeInTheDocument()
    })
  })

  it('displays "Limit Reached" when free battles exhausted', async () => {
    localStorageMock.setItem('pk-battle-daily', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 5 }))
    renderApp()
    await waitFor(() => {
      expect(screen.getByText('Limit Reached')).toBeInTheDocument()
      expect(screen.getByText('Daily limit reached')).toBeInTheDocument()
    })
  })

  it('shows factor breakdown with all 6 factors on result screen', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))
    await waitFor(() => expect(screen.getByText('Fight!')).not.toBeDisabled())
    fireEvent.click(screen.getByText('Fight!'))

    await waitFor(() => {
      expect(screen.getByText('Battle Breakdown')).toBeInTheDocument()
      expect(screen.getByText('Rating')).toBeInTheDocument()
      expect(screen.getByText('Experience')).toBeInTheDocument()
      expect(screen.getByText('Output')).toBeInTheDocument()
      expect(screen.getByText('Fitness')).toBeInTheDocument()
      expect(screen.getByText('Morale')).toBeInTheDocument()
      expect(screen.getByText('Matchup Edge')).toBeInTheDocument()
    })
  })

  it('increments battle count after each fight', async () => {
    renderApp()
    fireEvent.click(screen.getByText('Random Matchup'))
    await waitFor(() => expect(screen.getByText('Fight!')).not.toBeDisabled())
    fireEvent.click(screen.getByText('Fight!'))
    await waitFor(() => expect(screen.getByText('New Battle')).toBeInTheDocument())

    fireEvent.click(screen.getByText('New Battle'))
    await waitFor(() => {
      expect(screen.getByText('1 battle this session')).toBeInTheDocument()
    })
  })
})
