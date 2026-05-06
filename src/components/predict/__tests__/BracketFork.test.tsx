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
    bracket_id: 'base-001',
    generated_at: '2026-01-01T00:00:00Z',
    rounds: [
      {
        round: 1,
        matches: [
          { match_id: 'm1', home: 'USA', away: 'Mexico' },
          { match_id: 'm2', home: 'Brazil', away: 'Argentina' },
          { match_id: 'm3', home: 'France', away: 'England' },
          { match_id: 'm4', home: 'Germany', away: 'Spain' },
          { match_id: 'm5', home: 'Japan', away: 'South Korea' },
          { match_id: 'm6', home: 'Morocco', away: 'Senegal' },
          { match_id: 'm7', home: 'Colombia', away: 'Uruguay' },
          { match_id: 'm8', home: 'Belgium', away: 'Croatia' },
        ],
      },
    ],
  }
}

function makeFork(overrideHome: string = 'Mexico'): BracketForkResponse {
  return {
    fork_id: 'fork-abc',
    user_id: 'user-1',
    base_bracket_id: 'base-001',
    created_at: '2026-01-02T00:00:00Z',
    rounds: [
      {
        round: 1,
        matches: [
          { match_id: 'm1', home: overrideHome, away: 'USA' },
          { match_id: 'm2', home: 'Brazil', away: 'Argentina' },
          { match_id: 'm3', home: 'France', away: 'England' },
          { match_id: 'm4', home: 'Germany', away: 'Spain' },
          { match_id: 'm5', home: 'Japan', away: 'South Korea' },
          { match_id: 'm6', home: 'Morocco', away: 'Senegal' },
          { match_id: 'm7', home: 'Colombia', away: 'Uruguay' },
          { match_id: 'm8', home: 'Belgium', away: 'Croatia' },
        ],
      },
    ],
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
    fork_id: 'fork-xyz',
    user_id: 'user-1',
    base_bracket_id: 'base-001',
    created_at: '2026-01-03T00:00:00Z',
    rounds: BASE.rounds,
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

    // First R16 match: USA vs Mexico
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Mexico')
    await user.click(forkBtn)

    // Picker group should be visible with both team options
    const picker = screen.getByLabelText('Pick winner for USA vs Mexico')
    expect(picker).toBeInTheDocument()
    expect(within(picker).getByText('USA')).toBeInTheDocument()
    expect(within(picker).getByText('Mexico')).toBeInTheDocument()
  })

  it('closes picker when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    const forkBtn = screen.getByLabelText('Fork from here: USA vs Mexico')
    await user.click(forkBtn)

    expect(screen.getByLabelText('Pick winner for USA vs Mexico')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(screen.queryByLabelText('Pick winner for USA vs Mexico')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Selecting alternate team updates the slot label
// ---------------------------------------------------------------------------

describe('BracketFork — selecting alternate team updates the winner label', () => {
  it('shows the chosen team as winner after selecting from picker', async () => {
    const user = userEvent.setup()
    render(<BracketFork userId="user-1" base={BASE} />)

    // Open picker on first R16 slot (USA vs Mexico; base winner = USA)
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Mexico')
    await user.click(forkBtn)

    // Click on Mexico (the away team)
    const mexicoOption = screen.getByTestId('pick-r16:0-away')
    await user.click(mexicoOption)

    // The R16 slot should now show Mexico as predicted winner
    // (there may be multiple "Mexico" winners propagated downstream, so check ≥1)
    await waitFor(() => {
      const mexicoWinners = screen.getAllByLabelText('Predicted winner: Mexico')
      expect(mexicoWinners.length).toBeGreaterThanOrEqual(1)
      // The first match (r16:0) slot shows Mexico with override class
      expect(mexicoWinners[0]).toHaveClass('bf-slot-winner--override')
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
    // We override r16:0 to Mexico
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Mexico')
    await user.click(forkBtn)

    const mexicoOption = screen.getByTestId('pick-r16:0-away')
    await user.click(mexicoOption)

    // QF slot 0 should now show Mexico as a participant (home team)
    await waitFor(() => {
      // QF 0: winner[0] vs winner[1]
      // After override, winner[0] = Mexico; winner[1] = Brazil (r16:1 default)
      const qfGroup = screen.getByLabelText('Quarter-finals')
      const qfSlot0 = within(qfGroup).getByLabelText(/Match: Mexico vs Brazil/i)
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
    const forkBtn = screen.getByLabelText('Fork from here: USA vs Mexico')
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
      expect(callArg.base_bracket_id).toBe('base-001')
      expect(callArg.overrides).toMatchObject({ 'r16:0': 'Mexico' })
    })

    // Share button appears after save
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share your bracket fork/i })).toBeInTheDocument()
    })

    expect(onForkCreated).toHaveBeenCalledTimes(1)
    expect(onForkCreated.mock.calls[0][0].fork_id).toBe('fork-xyz')
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
    await user.click(screen.getByLabelText('Fork from here: USA vs Mexico'))
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
  it('shows Mexico as R16 winner when initialFork overrides r16:0 to Mexico', async () => {
    const fork = makeFork('Mexico')
    render(<BracketFork userId="user-1" base={BASE} initialFork={fork} />)

    await waitFor(() => {
      // At least one slot shows Mexico as the winner (may propagate downstream)
      const winners = screen.getAllByLabelText('Predicted winner: Mexico')
      expect(winners.length).toBeGreaterThanOrEqual(1)
      // The overridden r16:0 slot should have the override styling
      const overriddenWinner = winners.find((el) =>
        el.classList.contains('bf-slot-winner--override'),
      )
      expect(overriddenWinner).toBeDefined()
    })
  })

  it('renders the Share button when initialFork is provided', () => {
    const fork = makeFork('Mexico')
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
