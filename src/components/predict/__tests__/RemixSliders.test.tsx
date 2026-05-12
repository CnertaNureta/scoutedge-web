import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RemixSliders } from '../RemixSliders'
import type { FullPrediction } from '@/lib/prediction-bridge'
import * as bridge from '@/lib/prediction-bridge'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_PREDICTION: FullPrediction = {
  match_id: 'match-001',
  final_probs: { home_win: 0.55, draw: 0.25, away_win: 0.2 },
  ml_probs: { home_win: 0.5, draw: 0.3, away_win: 0.2 },
  sb_probs: { home_win: 0.6, draw: 0.2, away_win: 0.2 },
  poly_probs: { home_win: 0.52, draw: 0.27, away_win: 0.21 },
  weights: { ml: 0.4, sb: 0.45, poly: 0.15 },
  diagnosis: null,
  synthesizer_raw: {},
  confidence: 'high',
  expected_margin: 1.2,
  risk_factor: null,
  rationale: 'Strong home form',
  flags: [],
  feature_generator_output: null,
  divergence_features: {},
  explanation_text: null,
}

const REMIX_RESPONSE = {
  final_probs: { home_win: 0.6, draw: 0.22, away_win: 0.18 },
  weights_used: { ml: 0.45, sb: 0.4, poly: 0.15 },
  overrides_applied: { altitude_modifier: 1.2 },
  delta_from_base: { home_win: 0.05, draw: -0.03, away_win: -0.02 },
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

vi.mock('@/lib/prediction-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof bridge>()
  return {
    ...actual,
    postRemix: vi.fn(),
  }
})

const mockPostRemix = vi.mocked(bridge.postRemix)

beforeEach(() => {
  vi.useFakeTimers()
  mockPostRemix.mockResolvedValue(REMIX_RESPONSE)
})

afterEach(() => {
  vi.runAllTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RemixSliders', () => {
  it('renders 5 sliders with correct default values', () => {
    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
      />,
    )

    // Verify all 5 sliders are present
    expect(screen.getByLabelText('ML Weight')).toBeInTheDocument()
    expect(screen.getByLabelText('SB Weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Poly Weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Altitude')).toBeInTheDocument()
    expect(screen.getByLabelText('Heat')).toBeInTheDocument()

    // Verify defaults
    expect(screen.getByLabelText('ML Weight')).toHaveValue('0.4')
    expect(screen.getByLabelText('SB Weight')).toHaveValue('0.45')
    expect(screen.getByLabelText('Poly Weight')).toHaveValue('0.15')
    expect(screen.getByLabelText('Altitude')).toHaveValue('1')
    expect(screen.getByLabelText('Heat')).toHaveValue('1')
  })

  it('poly slider is disabled when basePrediction.poly_probs is null', () => {
    const noPoly: FullPrediction = {
      ...BASE_PREDICTION,
      poly_probs: null,
    }

    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={noPoly}
      />,
    )

    const polySlider = screen.getByLabelText('Poly Weight')
    expect(polySlider).toBeDisabled()
    expect(polySlider).toHaveAttribute('aria-valuetext', 'Poly model unavailable')
  })

  it('debounces postRemix: called once after debounceMs, not before', async () => {
    const debounceMs = 350

    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
        debounceMs={debounceMs}
      />,
    )

    const mlSlider = screen.getByLabelText('ML Weight')

    // Change the slider value
    fireEvent.change(mlSlider, { target: { value: '0.7' } })

    // Not yet called — debounce hasn't elapsed
    expect(mockPostRemix).not.toHaveBeenCalled()

    // Advance just under the threshold
    act(() => {
      vi.advanceTimersByTime(debounceMs - 10)
    })
    expect(mockPostRemix).not.toHaveBeenCalled()

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(20)
    })

    expect(mockPostRemix).toHaveBeenCalledTimes(1)
  })

  it('reset button restores defaults and calls onReset', () => {
    const onReset = vi.fn()

    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
        onReset={onReset}
      />,
    )

    // Change a slider
    const mlSlider = screen.getByLabelText('ML Weight')
    fireEvent.change(mlSlider, { target: { value: '0.8' } })
    expect(mlSlider).toHaveValue('0.8')

    // Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(mlSlider).toHaveValue('0.4')
    expect(screen.getByLabelText('SB Weight')).toHaveValue('0.45')
    expect(screen.getByLabelText('Altitude')).toHaveValue('1')
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('reciprocal rebalance: setting ml_weight=0.7 makes others sum to 0.3', () => {
    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
      />,
    )

    const mlSlider = screen.getByLabelText('ML Weight')
    const sbSlider = screen.getByLabelText('SB Weight')
    const polySlider = screen.getByLabelText('Poly Weight')

    fireEvent.change(mlSlider, { target: { value: '0.7' } })

    const sbVal = parseFloat(sbSlider.getAttribute('value') ?? '0')
    const polyVal = parseFloat(polySlider.getAttribute('value') ?? '0')
    const sum = parseFloat((sbVal + polyVal).toFixed(10))

    expect(sum).toBeCloseTo(0.3, 5)
    expect(parseFloat(mlSlider.getAttribute('value') ?? '0')).toBeCloseTo(0.7, 5)
  })

  it('displays delta_from_base when remix response arrives', async () => {
    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
        debounceMs={100}
      />,
    )

    fireEvent.change(screen.getByLabelText('ML Weight'), { target: { value: '0.6' } })

    await act(async () => {
      vi.advanceTimersByTime(100)
      // Flush promises
      await Promise.resolve()
    })

    // +5% delta for home_win
    expect(screen.getByText('+5%')).toBeInTheDocument()
    // -3% delta for draw
    expect(screen.getByText('-3%')).toBeInTheDocument()
    // -2% for away_win
    expect(screen.getByText('-2%')).toBeInTheDocument()
  })

  it('shows inline error when postRemix rejects; component still renders sliders', async () => {
    mockPostRemix.mockRejectedValue(new Error('API timeout'))

    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
        debounceMs={100}
      />,
    )

    fireEvent.change(screen.getByLabelText('Heat'), { target: { value: '1.3' } })

    await act(async () => {
      vi.advanceTimersByTime(100)
      await Promise.resolve()
    })

    // Error displayed
    expect(screen.getByRole('alert')).toHaveTextContent('API timeout')

    // Sliders still rendered — component didn't crash
    expect(screen.getByLabelText('ML Weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Heat')).toBeInTheDocument()
  })

  it('calls onRemix callback with correct shape when remix succeeds', async () => {
    const onRemix = vi.fn()

    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
        onRemix={onRemix}
        debounceMs={100}
      />,
    )

    fireEvent.change(screen.getByLabelText('Altitude'), { target: { value: '1.2' } })

    await act(async () => {
      vi.advanceTimersByTime(100)
      await Promise.resolve()
    })

    expect(onRemix).toHaveBeenCalledTimes(1)
    const arg = onRemix.mock.calls[0][0] as {
      final_probs: Record<string, number>
      weights: Record<string, number>
      overrides: Record<string, number>
    }
    expect(arg.final_probs).toEqual(REMIX_RESPONSE.final_probs)
    expect(arg.weights).toEqual(REMIX_RESPONSE.weights_used)
    expect(arg.overrides).toHaveProperty('altitude_modifier', 1.2)
  })

  it('shows Auto-rebalanced hint when a weight slider is adjusted', () => {
    render(
      <RemixSliders
        matchId="match-001"
        basePrediction={BASE_PREDICTION}
      />,
    )

    fireEvent.change(screen.getByLabelText('SB Weight'), { target: { value: '0.8' } })

    expect(screen.getByText('Auto-rebalanced')).toBeInTheDocument()
  })
})
