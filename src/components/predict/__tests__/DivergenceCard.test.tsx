import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DivergenceCard } from '../DivergenceCard'
import type { FullPrediction } from '@/lib/prediction-bridge'

// ---------------------------------------------------------------------------
// Mock the bridge module
// ---------------------------------------------------------------------------

vi.mock('@/lib/prediction-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/prediction-bridge')>()
  return {
    ...actual,
    postDivergenceFeedback: vi.fn().mockResolvedValue({ accepted: true, feedback_id: 'test-123' }),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePrediction(overrides: Partial<FullPrediction> = {}): FullPrediction {
  return {
    match_id: 'match-001',
    final_probs: { home_win: 0.5, draw: 0.25, away_win: 0.25 },
    ml_probs: { home_win: 0.52, draw: 0.24, away_win: 0.24 },
    sb_probs: { home_win: 0.48, draw: 0.28, away_win: 0.24 },
    poly_probs: { home_win: 0.45, draw: 0.3, away_win: 0.25 },
    weights: { ml: 0.5, sb: 0.4, poly: 0.1 },
    diagnosis: null,
    synthesizer_raw: {},
    confidence: 'medium',
    expected_margin: 0.05,
    risk_factor: null,
    rationale: 'Test rationale',
    flags: [],
    feature_generator_output: null,
    divergence_features: {
      consensus_flag: false,
      max_pairwise_kl: 0.03,
      ml_sb_kl: 0.02,
      ml_poly_kl: 0.04,
    },
    explanation_text: null,
    ...overrides,
  }
}

const defaultProps = {
  matchId: 'match-001',
  userId: 'user-abc',
  prediction: makePrediction(),
}

// ---------------------------------------------------------------------------
// 1. Renders collapsed state with headline
// ---------------------------------------------------------------------------

describe('DivergenceCard — collapsed state', () => {
  it('renders collapsed with a headline derived from divergence features', () => {
    render(<DivergenceCard {...defaultProps} />)

    // Headline visible
    expect(screen.getByText('Mild divergence')).toBeInTheDocument()

    // The expanded body should not be visible (max-height: 0)
    const body = document.querySelector('.dc-body')
    expect(body).toBeInTheDocument()
    expect(body).not.toHaveClass('dc-body--open')
  })

  it('shows "Three sources agree" when consensus_flag is true', () => {
    const prediction = makePrediction({
      divergence_features: { consensus_flag: true, max_pairwise_kl: 0.01 },
    })
    render(<DivergenceCard {...defaultProps} prediction={prediction} />)
    expect(screen.getByText('Three sources agree')).toBeInTheDocument()
  })

  it('shows "Strong divergence" when max_pairwise_kl > 0.06', () => {
    const prediction = makePrediction({
      divergence_features: { consensus_flag: false, max_pairwise_kl: 0.09 },
    })
    render(<DivergenceCard {...defaultProps} prediction={prediction} />)
    expect(screen.getByText('Strong divergence')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 2. Click expands card → aria-expanded="true" and region visible
// ---------------------------------------------------------------------------

describe('DivergenceCard — expand / collapse', () => {
  it('toggles expanded state on header click', async () => {
    render(<DivergenceCard {...defaultProps} />)

    const toggleBtn = screen.getByRole('button', { name: /source divergence|divergence/i })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggleBtn)

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')

    // Body region should now have dc-body--open class
    const body = document.querySelector('.dc-body')
    expect(body).toHaveClass('dc-body--open')
  })

  it('renders already-expanded when initialExpanded=true', () => {
    render(<DivergenceCard {...defaultProps} initialExpanded={true} />)

    const body = document.querySelector('.dc-body')
    expect(body).toHaveClass('dc-body--open')

    const toggleBtn = screen.getByRole('button', { name: /source divergence/i })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('probability bar region is accessible when expanded', async () => {
    render(<DivergenceCard {...defaultProps} initialExpanded={true} />)

    // Should have groups labeled for each source
    expect(screen.getByLabelText(/ML probabilities/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/SB probabilities/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Poly probabilities/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. "Agree with AI" calls onAction and postDivergenceFeedback
// ---------------------------------------------------------------------------

describe('DivergenceCard — Agree CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onAction("agreed") and postDivergenceFeedback on click', async () => {
    const { postDivergenceFeedback } = await import('@/lib/prediction-bridge')
    const onAction = vi.fn()

    render(<DivergenceCard {...defaultProps} initialExpanded={true} onAction={onAction} />)

    const agreeBtn = screen.getByRole('button', { name: /agree with ai/i })
    await userEvent.click(agreeBtn)

    await waitFor(() => {
      expect(postDivergenceFeedback).toHaveBeenCalledWith({
        match_id: 'match-001',
        user_id: 'user-abc',
        agreed: true,
      })
      expect(onAction).toHaveBeenCalledWith('agreed')
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Challenge panel: invalid sum → submit disabled
// ---------------------------------------------------------------------------

describe('DivergenceCard — Challenge panel validation', () => {
  it('disables submit when probabilities do not sum to 1', async () => {
    render(<DivergenceCard {...defaultProps} initialExpanded={true} />)

    // Open challenge panel
    const challengeBtn = screen.getByRole('button', { name: /challenge this prediction/i })
    await userEvent.click(challengeBtn)

    // Scope inputs to the challenge panel region
    const panel = screen.getByRole('region', { name: /submit challenge/i })
    const homeInput = within(panel).getByLabelText(/home win/i)
    const drawInput = within(panel).getByLabelText(/^draw$/i)
    const awayInput = within(panel).getByLabelText(/away win/i)

    await userEvent.type(homeInput, '0.5')
    await userEvent.type(drawInput, '0.4')
    await userEvent.type(awayInput, '0.4') // sum = 1.3 → invalid

    const submitBtn = screen.getByRole('button', { name: /submit challenge/i })
    expect(submitBtn).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// 5. Challenge panel: valid sum → POST sent with challenge fields
// ---------------------------------------------------------------------------

describe('DivergenceCard — Challenge panel submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls postDivergenceFeedback with challenge_alternative_probs when sum is valid', async () => {
    const { postDivergenceFeedback } = await import('@/lib/prediction-bridge')
    const onAction = vi.fn()

    render(<DivergenceCard {...defaultProps} initialExpanded={true} onAction={onAction} />)

    const challengeBtn = screen.getByRole('button', { name: /challenge this prediction/i })
    await userEvent.click(challengeBtn)

    const panel = screen.getByRole('region', { name: /submit challenge/i })
    const homeInput = within(panel).getByLabelText(/home win/i)
    const drawInput = within(panel).getByLabelText(/^draw$/i)
    const awayInput = within(panel).getByLabelText(/away win/i)

    await userEvent.type(homeInput, '0.5')
    await userEvent.type(drawInput, '0.3')
    await userEvent.type(awayInput, '0.2')

    const submitBtn = screen.getByRole('button', { name: /submit challenge/i })
    expect(submitBtn).not.toBeDisabled()

    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(postDivergenceFeedback).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(postDivergenceFeedback).mock.calls[0][0]
      expect(callArg.agreed).toBe(false)
      expect(callArg.match_id).toBe('match-001')

      const comment = JSON.parse(callArg.comment ?? '{}')
      expect(comment.challenge_alternative_probs).toMatchObject({
        home_win: 0.5,
        draw: 0.3,
        away_win: 0.2,
      })
      expect(comment.challenge_reason).toBe('late_intel')
      expect(onAction).toHaveBeenCalledWith('challenged')
    })
  })
})

// ---------------------------------------------------------------------------
// 6. Share: navigator.share=undefined → clipboard.writeText fallback
// ---------------------------------------------------------------------------

describe('DivergenceCard — Share CTA', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to clipboard.writeText when navigator.share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })
    // Ensure navigator.share is not set
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const onAction = vi.fn()
    render(<DivergenceCard {...defaultProps} initialExpanded={true} onAction={onAction} />)

    const shareBtn = screen.getByRole('button', { name: /share this prediction/i })
    await userEvent.click(shareBtn)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
      expect(onAction).toHaveBeenCalledWith('shared')
    })
  })

  it('uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    })

    const onAction = vi.fn()
    render(<DivergenceCard {...defaultProps} initialExpanded={true} onAction={onAction} />)

    const shareBtn = screen.getByRole('button', { name: /share this prediction/i })
    await userEvent.click(shareBtn)

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled()
      expect(onAction).toHaveBeenCalledWith('shared')
    })
  })
})

// ---------------------------------------------------------------------------
// 7. Diagnosis paragraph renders when present
// ---------------------------------------------------------------------------

describe('DivergenceCard — Diagnosis text', () => {
  it('renders a diagnosis summary note when provided', () => {
    const prediction = makePrediction({
      diagnosis: { summary: 'Model and sportsbook agree on a slight home advantage.' },
    })
    render(<DivergenceCard {...defaultProps} prediction={prediction} initialExpanded={true} />)
    expect(
      screen.getByText('Model and sportsbook agree on a slight home advantage.'),
    ).toBeInTheDocument()
  })

  it('does not render a note when diagnosis is null', () => {
    const prediction = makePrediction({ diagnosis: null })
    render(<DivergenceCard {...defaultProps} prediction={prediction} initialExpanded={true} />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 8. Poly bars omitted when poly_probs is null
// ---------------------------------------------------------------------------

describe('DivergenceCard — Polymarket source', () => {
  it('does not render Poly bar when poly_probs is null', () => {
    const prediction = makePrediction({ poly_probs: null })
    render(<DivergenceCard {...defaultProps} prediction={prediction} initialExpanded={true} />)
    expect(screen.queryByLabelText(/Poly probabilities/i)).not.toBeInTheDocument()
  })
})
