import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BracketFork } from '../BracketFork'
import type { BaseBracketResponse, BracketForkResponse } from '@/lib/prediction-bridge'

// ---------------------------------------------------------------------------
// Mock prediction-bridge
// ---------------------------------------------------------------------------

const mockGetBaseBracket = vi.fn()
const mockPostBracketFork = vi.fn()

vi.mock('@/lib/prediction-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/prediction-bridge')>()
  return {
    ...actual,
    getBaseBracket: (...args: Parameters<typeof actual.getBaseBracket>) =>
      mockGetBaseBracket(...args),
    postBracketFork: (...args: Parameters<typeof actual.postBracketFork>) =>
      mockPostBracketFork(...args),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBaseBracket(): BaseBracketResponse {
  return {
    version: 'base-001',
    stages: {
      group: [
        { group: 'A', teams: ['USA', 'Mexico', 'Canada', 'Honduras'], predicted_top2: ['USA', 'Mexico'] },
        { group: 'B', teams: ['Brazil', 'Argentina', 'Chile', 'Bolivia'], predicted_top2: ['Brazil', 'Argentina'] },
        { group: 'C', teams: ['France', 'England', 'Netherlands', 'Wales'], predicted_top2: ['France', 'England'] },
        { group: 'D', teams: ['Germany', 'Spain', 'Portugal', 'Switzerland'], predicted_top2: ['Germany', 'Spain'] },
        { group: 'E', teams: ['Japan', 'South Korea', 'Australia', 'Iran'], predicted_top2: ['Japan', 'South Korea'] },
        { group: 'F', teams: ['Morocco', 'Senegal', 'Nigeria', 'Egypt'], predicted_top2: ['Morocco', 'Senegal'] },
        { group: 'G', teams: ['Colombia', 'Uruguay', 'Ecuador', 'Peru'], predicted_top2: ['Colombia', 'Uruguay'] },
        { group: 'H', teams: ['Belgium', 'Croatia', 'Poland', 'Serbia'], predicted_top2: ['Belgium', 'Croatia'] },
      ],
      r16: [
        { slot: 'R16-1', predicted_winner: 'USA', p_win: 0.6 },
        { slot: 'R16-2', predicted_winner: 'Brazil', p_win: 0.6 },
        { slot: 'R16-3', predicted_winner: 'France', p_win: 0.6 },
        { slot: 'R16-4', predicted_winner: 'Germany', p_win: 0.6 },
        { slot: 'R16-5', predicted_winner: 'Japan', p_win: 0.6 },
        { slot: 'R16-6', predicted_winner: 'Morocco', p_win: 0.6 },
        { slot: 'R16-7', predicted_winner: 'Colombia', p_win: 0.6 },
        { slot: 'R16-8', predicted_winner: 'Belgium', p_win: 0.6 },
      ],
      qf: [],
      sf: [],
      final: { predicted_winner: 'USA', p_win: 0.5 },
    },
  }
}

function makeFork(overrideHome: string = 'Argentina'): BracketForkResponse {
  return {
    id: 'fork-abc',
    user_id: 'user-1',
    share_url: '/bracket/fork-abc',
    created_at: '2026-01-02T00:00:00Z',
    bracket_data: {
      overrides: { 'r16:0': overrideHome },
    },
  }
}

const BASE = makeBaseBracket()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // Default: getBaseBracket resolves successfully
  mockGetBaseBracket.mockResolvedValue(BASE)
  mockPostBracketFork.mockResolvedValue({
    id: 'fork-xyz',
    user_id: 'user-1',
    share_url: '/bracket/fork-xyz',
    created_at: '2026-01-03T00:00:00Z',
  } satisfies BracketForkResponse)
})

// ---------------------------------------------------------------------------
// 1. Renders 8 groups + 8 R16 + 4 QF + 2 SF + 1 Final
// ---------------------------------------------------------------------------

describe('BracketFork — structure rendering', () => {
  it('renders all 8 group boxes', () => {
    render(<BracketFork userId="user-1" base={BASE} />)

    const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    for (const g of groupLabels) {
      expect(screen.getByLabelText(`Group ${g}`)).toBeInTheDocument()
    }
  })

  it('renders 8 R16 slots', () => {
    render(<BracketFork userId="user-1" base={BASE} />)

    // Each R16 slot has aria-label "Match: X vs Y"
    const r16Group = screen.getByLabelText('Round of 16')
    const r16Items = within(r16Group).getAllByRole('treeitem')
    expect(r16Items).toHaveLength(8)
  })

  it('renders 4 QF slots', () => {
    render(<BracketFork userId="user-1" base={BASE} />)

    const qfGroup = screen.getByLabelText('Quarter-finals')
    const qfItems = within(qfGroup).getAllByRole('treeitem')
    expect(qfItems).toHaveLength(4)
  })

  it('renders 2 SF slots', () => {
    render(<BracketFork userId="user-1" base={BASE} />)

    const sfGroup = screen.getByLabelText('Semi-finals')
    const sfItems = within(sfGroup).getAllByRole('treeitem')
    expect(sfItems).toHaveLength(2)
  })

  it('renders 1 Final slot', () => {
    render(<BracketFork userId="user-1" base={BASE} />)

    const finalGroup = screen.getByLabelText('Final match')
    const finalItems = within(finalGroup).getAllByRole('treeitem')
    expect(finalItems).toHaveLength(1)
  })

  it('renders the tournament bracket heading', () => {
    render(<BracketFork userId="user-1" base={BASE} />)
    expect(screen.getByRole('heading', { name: /WC 2026 Bracket/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 2. "Fork from here" on R16 slot opens a picker with the 2 teams
// ---------------------------------------------------------------------------

describe('BracketFork — fork picker opens', () => {
  it('opens a picker showing both teams when "Fork from here" is clicked on a R16 slot', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    // First R16 match: USA vs Argentina
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Argentina')
    await user.click(forkBtn)

    // Picker group should be visible with both team options
    const picker = screen.getByLabelText('Pick winner for USA vs Argentina')
    expect(picker).toBeInTheDocument()
    expect(within(picker).getByText('USA')).toBeInTheDocument()
    expect(within(picker).getByText('Argentina')).toBeInTheDocument()
  })

  it('closes picker when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    const forkBtn = screen.getByLabelText('Fork from here: USA vs Argentina')
    await user.click(forkBtn)

    expect(screen.getByLabelText('Pick winner for USA vs Argentina')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(screen.queryByLabelText('Pick winner for USA vs Argentina')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Selecting alternate team updates the slot label
// ---------------------------------------------------------------------------

describe('BracketFork — selecting alternate team updates the winner label', () => {
  it('shows the chosen team as winner after selecting from picker', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    // Open picker on first R16 slot (USA vs Argentina; base winner = USA)
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Argentina')
    await user.click(forkBtn)

    // Click on Argentina (the away team)
    const argentinaOption = screen.getByTestId('pick-r16:0-away')
    await user.click(argentinaOption)

    // The R16 slot should now show Argentina as predicted winner
    // (there may be multiple "Argentina" winners propagated downstream, so check >=1)
    await waitFor(() => {
      const argentinaWinners = screen.getAllByLabelText('Predicted winner: Argentina')
      expect(argentinaWinners.length).toBeGreaterThanOrEqual(1)
      // The first match (r16:0) slot shows Argentina with override class
      expect(argentinaWinners[0]).toHaveClass('bf-slot-winner--override')
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Override on R16 propagates into QF (local re-render)
// ---------------------------------------------------------------------------

describe('BracketFork — override propagates downstream', () => {
  it('updates QF slot teams when R16 winner is overridden', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    // Default: r16:0 winner = USA, so QF slot 0 home = USA
    // We override r16:0 to Argentina
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Argentina')
    await user.click(forkBtn)

    const argentinaOption = screen.getByTestId('pick-r16:0-away')
    await user.click(argentinaOption)

    // QF slot 0 should now show Argentina as a participant (home team)
    await waitFor(() => {
      // QF 0: winner[0] vs winner[1]
      // After override, winner[0] = Argentina; winner[1] = Brazil (r16:1 default)
      const qfGroup = screen.getByLabelText('Quarter-finals')
      const qfSlot0 = within(qfGroup).getByLabelText(/Match: Argentina vs Brazil/i)
      expect(qfSlot0).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 5. "Save fork" calls postBracketFork with non-empty overrides → receives id
// ---------------------------------------------------------------------------

describe('BracketFork — Save fork', () => {
  it('calls postBracketFork with overrides and displays the fork id area', async () => {
    const user = userEvent.setup()
    const onForkCreated = vi.fn()
    render(<BracketFork userId="user-1" base={BASE} onForkCreated={onForkCreated} />)

    // Make an override first (Save is disabled without overrides)
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Argentina')
    await user.click(forkBtn)
    await user.click(screen.getByTestId('pick-r16:0-away'))

    // Save fork
    const saveBtn = screen.getByRole('button', { name: /save your bracket fork/i })
    expect(saveBtn).not.toBeDisabled()
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockPostBracketFork).toHaveBeenCalledTimes(1)
      const callArg = mockPostBracketFork.mock.calls[0][0]
      expect(callArg.user_id).toBe('user-1')
      expect(callArg.bracket_data.overrides).toMatchObject({ 'r16:0': 'Argentina' })
      expect(callArg.bracket_data.base_version).toBe('base-001')
    })

    // Share button appears after save
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share your bracket fork/i })).toBeInTheDocument()
    })

    expect(onForkCreated).toHaveBeenCalledTimes(1)
    expect(onForkCreated.mock.calls[0][0].id).toBe('fork-xyz')
  })

  it('Save fork button is disabled when there are no overrides', () => {
    render(<BracketFork userId="user-1" base={BASE} />)
    const saveBtn = screen.getByRole('button', { name: /save your bracket fork/i })
    expect(saveBtn).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// 6. Failure on Save shows inline error
// ---------------------------------------------------------------------------

describe('BracketFork — Save error handling', () => {
  it('shows an inline error message when postBracketFork rejects', async () => {
    mockPostBracketFork.mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    // Make override
    await user.click(screen.getByLabelText('Fork from here: USA vs Argentina'))
    await user.click(screen.getByTestId('pick-r16:0-away'))

    // Attempt save
    await user.click(screen.getByRole('button', { name: /save your bracket fork/i }))

    await waitFor(() => {
      const errorEl = screen.getByRole('alert')
      expect(errorEl).toBeInTheDocument()
      expect(errorEl).toHaveTextContent(/Network error/i)
    })
  })
})

// ---------------------------------------------------------------------------
// 7. When initialFork is provided, tree hydrates from fork overrides
// ---------------------------------------------------------------------------

describe('BracketFork — initialFork hydration', () => {
  it('shows Argentina as R16 winner when initialFork overrides r16:0 to Argentina', async () => {
    const fork = makeFork('Argentina')
    render(<BracketFork userId="user-1" base={BASE} initialFork={fork} />)

    await waitFor(() => {
      // At least one slot shows Argentina as the winner (may propagate downstream)
      const winners = screen.getAllByLabelText('Predicted winner: Argentina')
      expect(winners.length).toBeGreaterThanOrEqual(1)
      // The overridden r16:0 slot should have the override styling
      const overriddenWinner = winners.find((el) =>
        el.classList.contains('bf-slot-winner--override'),
      )
      expect(overriddenWinner).toBeDefined()
    })
  })

  it('renders the Share button when initialFork is provided', () => {
    const fork = makeFork('Argentina')
    render(<BracketFork userId="user-1" base={BASE} initialFork={fork} />)

    expect(
      screen.getByRole('button', { name: /share your bracket fork/i }),
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 8. Loading state (no base prop, fetch in flight)
// ---------------------------------------------------------------------------

describe('BracketFork — loading state', () => {
  it('shows a loading indicator while fetching the base bracket', async () => {
    // Never resolve during this test
    mockGetBaseBracket.mockImplementation(() => new Promise(() => {}))

    render(<BracketFork userId="user-1" />)

    expect(screen.getByRole('status', { name: /loading bracket/i })).toBeInTheDocument()
  })

  it('renders the tree after the fetch resolves', async () => {
    render(<BracketFork userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Group A')).toBeInTheDocument()
    })
  })
})
