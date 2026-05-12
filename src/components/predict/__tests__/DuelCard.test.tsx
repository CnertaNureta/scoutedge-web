import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DuelCard } from '../DuelCard'
import type { FullPrediction } from '@/lib/prediction-bridge'
import type { ExistingDuelSubmission, DuelCardProps } from '../DuelCard'

// ---------------------------------------------------------------------------
// Mock the bridge module
// ---------------------------------------------------------------------------

vi.mock('@/lib/prediction-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/prediction-bridge')>()
  return {
    ...actual,
    postDuelSubmit: vi.fn().mockResolvedValue({
      ok: true,
      user_prediction_id: 'duel-001',
      ai_snapshot: { home_win: 0.55, draw: 0.25, away_win: 0.20 },
    }),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAiPrediction(overrides: Partial<FullPrediction> = {}): FullPrediction {
  return {
    match_id: 'match-wc26-001',
    final_probs: { home_win: 0.55, draw: 0.25, away_win: 0.2 },
    ml_probs: { home_win: 0.53, draw: 0.27, away_win: 0.2 },
    sb_probs: { home_win: 0.57, draw: 0.23, away_win: 0.2 },
    poly_probs: null,
    weights: { ml: 0.5, sb: 0.5, poly: 0 },
    diagnosis: null,
    synthesizer_raw: {},
    confidence: 'medium',
    expected_margin: 0.1,
    risk_factor: null,
    rationale: 'Strong home form',
    flags: [],
    feature_generator_output: null,
    divergence_features: {},
    explanation_text: null,
    ...overrides,
  }
}

function makeExisting(overrides: Partial<ExistingDuelSubmission> = {}): ExistingDuelSubmission {
  return {
    user_prediction_id: 'upred-001',
    home_score: 1,
    away_score: 1,
    prob_home: 0.45,
    prob_draw: 0.35,
    prob_away: 0.2,
    confidence_level: 'medium',
    ai_snapshot: {},
    locked_until: new Date(Date.now() + 3_600_000).toISOString(), // 1h from now
    ...overrides,
  }
}

// Future kickoff (30 min from now)
const FUTURE_KICKOFF = new Date(Date.now() + 30 * 60 * 1000).toISOString()
// Past kickoff (already happened)
const PAST_KICKOFF = new Date(Date.now() - 60 * 1000).toISOString()

const defaultProps: DuelCardProps = {
  matchId: 'match-wc26-001',
  userId: 'user-xyz',
  aiPrediction: makeAiPrediction(),
  kickoffUtc: FUTURE_KICKOFF,
}

// ---------------------------------------------------------------------------
// 1. Renders submit form when no existing and kickoff in future
// ---------------------------------------------------------------------------

describe('DuelCard — submit form', () => {
  it('renders submit form when no existing submission and kickoff is in the future', () => {
    render(<DuelCard {...defaultProps} />)

    // Form is present
    expect(screen.getByRole('form', { name: /submit your duel prediction/i })).toBeInTheDocument()

    // AI snapshot visible
    expect(screen.getByLabelText(/AI prediction snapshot/i)).toBeInTheDocument()

    // Score inputs present
    expect(screen.getByLabelText(/home team score/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/away team score/i)).toBeInTheDocument()

    // Submit button present and enabled (default form is valid)
    const submitBtn = screen.getByRole('button', { name: /submit prediction/i })
    expect(submitBtn).toBeInTheDocument()
    expect(submitBtn).not.toBeDisabled()

    // No locked badge visible
    expect(screen.queryByText(/locked until kickoff/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 2. Renders locked scoreboard when existing is provided
// ---------------------------------------------------------------------------

describe('DuelCard — locked scoreboard (existing)', () => {
  it('renders locked scoreboard when existing submission is provided', () => {
    const existing = makeExisting()
    render(<DuelCard {...defaultProps} existing={existing} />)

    // No submit form
    expect(screen.queryByRole('form')).not.toBeInTheDocument()

    // 🤖 vs 👤 header
    expect(screen.getByText('🤖 vs 👤')).toBeInTheDocument()

    // Locked badge
    expect(screen.getByText(/locked until kickoff/i)).toBeInTheDocument()

    // User call line (score 1-1)
    expect(screen.getByText(/your call:/i)).toBeInTheDocument()
    expect(screen.getByText(/1–1/)).toBeInTheDocument()

    // Locked announcement region
    const announcement = screen.getByTestId('duel-locked-announcement')
    expect(announcement).toBeInTheDocument()
    expect(announcement).toHaveAttribute('role', 'status')
    expect(announcement).toHaveAttribute('aria-live', 'polite')
  })

  it('shows AI and user side labels in scoreboard', () => {
    const existing = makeExisting()
    render(<DuelCard {...defaultProps} existing={existing} />)

    expect(screen.getByText(/🤖 AI/i)).toBeInTheDocument()
    expect(screen.getByText(/👤 You/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Renders locked scoreboard when kickoff <= now
// ---------------------------------------------------------------------------

describe('DuelCard — locked when kickoff has passed', () => {
  it('renders locked state (no form) when kickoff time is in the past', () => {
    render(<DuelCard {...defaultProps} kickoffUtc={PAST_KICKOFF} />)

    // No submit form
    expect(screen.queryByRole('form')).not.toBeInTheDocument()

    // Locked badge present
    expect(screen.getByText(/locked until kickoff/i)).toBeInTheDocument()

    // No-submission notice
    const announcement = screen.getByTestId('duel-locked-announcement')
    expect(announcement).toHaveTextContent(/no prediction was submitted/i)
  })

  it('uses mocked Date.now for time check', () => {
    // Set Date.now to exactly at kickoff time — should be locked
    const kickoff = new Date('2026-06-10T15:00:00.000Z')
    vi.spyOn(Date, 'now').mockReturnValue(kickoff.getTime())

    render(<DuelCard {...defaultProps} kickoffUtc={kickoff.toISOString()} />)

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByText(/locked until kickoff/i)).toBeInTheDocument()

    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// 4. Probability auto-renorm
// ---------------------------------------------------------------------------

describe('DuelCard — probability auto-renorm', () => {
  it('renormalizes other sliders when one is changed so sum stays at 1.0', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(<DuelCard {...defaultProps} />)

    const homeSlider = screen.getByLabelText(/home win/i)

    // Use fireEvent for range slider — userEvent.clear/type do not work on range inputs
    fireEvent.change(homeSlider, { target: { value: '0.6' } })

    await waitFor(() => {
      const drawSlider = screen.getByLabelText(/draw/i)
      const awaySlider = screen.getByLabelText(/away win/i)

      const homeVal = parseFloat((homeSlider as HTMLInputElement).value)
      const drawVal = parseFloat((drawSlider as HTMLInputElement).value)
      const awayVal = parseFloat((awaySlider as HTMLInputElement).value)

      const sum = homeVal + drawVal + awayVal
      expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(0.01)
      expect(homeVal).toBeCloseTo(0.6, 2)
    })
  })

  it('auto-renorm clamps other probs to >= 0 and keeps sum = 1', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(<DuelCard {...defaultProps} />)

    const homeSlider = screen.getByLabelText(/home win/i)
    // Move home to 1.0 — others should be clamped to 0
    fireEvent.change(homeSlider, { target: { value: '1' } })

    await waitFor(() => {
      const drawSlider = screen.getByLabelText(/draw/i)
      const awaySlider = screen.getByLabelText(/away win/i)

      const homeVal = parseFloat((homeSlider as HTMLInputElement).value)
      const drawVal = parseFloat((drawSlider as HTMLInputElement).value)
      const awayVal = parseFloat((awaySlider as HTMLInputElement).value)

      expect(homeVal).toBeCloseTo(1.0, 3)
      expect(drawVal).toBeGreaterThanOrEqual(0)
      expect(awayVal).toBeGreaterThanOrEqual(0)
      expect(Math.abs(homeVal + drawVal + awayVal - 1.0)).toBeLessThanOrEqual(0.01)
    })
  })
})

// ---------------------------------------------------------------------------
// 5. Submit calls postDuelSubmit and on success calls onSubmitted
// ---------------------------------------------------------------------------

describe('DuelCard — submit success', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls postDuelSubmit and onSubmitted with the resulting submission on success', async () => {
    const { postDuelSubmit } = await import('@/lib/prediction-bridge')
    const onSubmitted = vi.fn()
    const user = userEvent.setup()

    render(<DuelCard {...defaultProps} onSubmitted={onSubmitted} />)

    const submitBtn = screen.getByRole('button', { name: /submit prediction/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(postDuelSubmit).toHaveBeenCalledOnce()
      expect(postDuelSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          match_id: 'match-wc26-001',
          user_id: 'user-xyz',
          home_score: 1,
          away_score: 1,
          prob_home: expect.any(Number),
          prob_draw: expect.any(Number),
          prob_away: expect.any(Number),
          confidence_level: expect.stringMatching(/^(low|medium|high)$/),
        }),
      )

      expect(onSubmitted).toHaveBeenCalledOnce()
      const sub: ExistingDuelSubmission = onSubmitted.mock.calls[0][0]
      expect(sub.home_score).toBe(1)
      expect(sub.away_score).toBe(1)
      expect(typeof sub.prob_home).toBe('number')
      expect(typeof sub.prob_draw).toBe('number')
      expect(typeof sub.prob_away).toBe('number')
      expect(['low', 'medium', 'high']).toContain(sub.confidence_level)
    })

    // After success, should be in locked scoreboard view (form gone)
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByText(/locked until kickoff/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 6. Submit failure shows error and stays in form view
// ---------------------------------------------------------------------------

describe('DuelCard — submit failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error message on POST failure and keeps form visible for retry', async () => {
    const { postDuelSubmit } = await import('@/lib/prediction-bridge')
    vi.mocked(postDuelSubmit).mockRejectedValueOnce(new Error('Server error 503 — retry later.'))

    const user = userEvent.setup()
    render(<DuelCard {...defaultProps} />)

    const submitBtn = screen.getByRole('button', { name: /submit prediction/i })
    await user.click(submitBtn)

    await waitFor(() => {
      // Error alert rendered
      const errorEl = screen.getByRole('alert')
      expect(errorEl).toBeInTheDocument()
      expect(errorEl).toHaveTextContent(/server error 503/i)
    })

    // Form still present — user can retry
    expect(screen.getByRole('form', { name: /submit your duel prediction/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit prediction/i })).toBeInTheDocument()
  })

  it('clears previous error on a successful retry', async () => {
    const { postDuelSubmit } = await import('@/lib/prediction-bridge')

    // First call fails, second succeeds
    vi.mocked(postDuelSubmit)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        user_prediction_id: 'duel-002',
        ai_snapshot: { home_win: 0.55, draw: 0.25, away_win: 0.20 },
      })

    const user = userEvent.setup()
    render(<DuelCard {...defaultProps} />)

    const submitBtn = screen.getByRole('button', { name: /submit prediction/i })

    // First attempt — fails
    await user.click(submitBtn)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Second attempt — succeeds
    await user.click(submitBtn)
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// 7. Accessibility: form has accessible names, locked has role announcement
// ---------------------------------------------------------------------------

describe('DuelCard — accessibility', () => {
  it('form has role="form" with accessible name', () => {
    render(<DuelCard {...defaultProps} />)

    const form = screen.getByRole('form', { name: /submit your duel prediction/i })
    expect(form).toBeInTheDocument()
  })

  it('form fields have accessible labels', () => {
    render(<DuelCard {...defaultProps} />)

    expect(screen.getByLabelText(/home team score/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/away team score/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/home win/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/draw/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/away win/i)).toBeInTheDocument()
  })

  it('locked state has aria-live="polite" region for announcement', () => {
    const existing = makeExisting()
    render(<DuelCard {...defaultProps} existing={existing} />)

    const announcement = screen.getByTestId('duel-locked-announcement')
    expect(announcement).toHaveAttribute('role', 'status')
    expect(announcement).toHaveAttribute('aria-live', 'polite')
    expect(announcement).toHaveAttribute('aria-atomic', 'true')
  })

  it('confidence radio group has accessible radiogroup role', () => {
    render(<DuelCard {...defaultProps} />)

    const radioGroup = screen.getByRole('radiogroup', { name: /confidence level/i })
    expect(radioGroup).toBeInTheDocument()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })
})
