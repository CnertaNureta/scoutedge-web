"""Unit tests for scoutedge_intelligence.synthesis.weights (task P3.2).

Coverage targets:
- All adaptation branches (poly absent, low volume, few books, low ML confidence)
- Weight sum invariant
- ProbDict validation
- Input validation
- Synthesize correctness
"""

from __future__ import annotations

import pytest

from scoutedge_intelligence.synthesis.weights import (
    BASE_WEIGHTS,
    POLYMARKET_HARD_CAP,
    WeightedSynthesis,
    WeightInputs,
    compute_weights,
    synthesize,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_UNIFORM: dict[str, float] = {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}
_CONFIDENT: dict[str, float] = {"home_win": 0.70, "draw": 0.20, "away_win": 0.10}
_BALANCED: dict[str, float] = {"home_win": 0.45, "draw": 0.30, "away_win": 0.25}


def _full_quality_inputs(
    *,
    ml_max_prob: float = 0.95,
    sb_books_used: int = 5,
    poly_volume_24h: float = 500_000.0,
    poly_bid_ask_spread: float = 0.01,
    poly_present: bool = True,
) -> WeightInputs:
    return WeightInputs(
        ml_max_prob=ml_max_prob,
        sb_books_used=sb_books_used,
        poly_volume_24h=poly_volume_24h,
        poly_bid_ask_spread=poly_bid_ask_spread,
        poly_present=poly_present,
    )


# ---------------------------------------------------------------------------
# 1. All-base-quality inputs: weights ≈ BASE_WEIGHTS within 0.05
# ---------------------------------------------------------------------------


def test_full_quality_weights_close_to_base() -> None:
    """When all signals are high quality the weights stay near BASE_WEIGHTS."""
    inputs = _full_quality_inputs()
    weights, _notes = compute_weights(inputs)

    assert abs(weights["ml"] - BASE_WEIGHTS["ml"]) < 0.05
    assert abs(weights["sb"] - BASE_WEIGHTS["sb"]) < 0.05
    assert abs(weights["poly"] - BASE_WEIGHTS["poly"]) < 0.05


# ---------------------------------------------------------------------------
# 2. poly_present=False: w_poly == 0; ml + sb == 1.0
# ---------------------------------------------------------------------------


def test_poly_absent_weight_is_zero() -> None:
    """poly_present=False must zero out poly weight and keep ml+sb summing to 1."""
    inputs = _full_quality_inputs(poly_present=False)
    weights, notes = compute_weights(inputs)

    assert weights["poly"] == pytest.approx(0.0, abs=1e-9)
    assert weights["ml"] + weights["sb"] == pytest.approx(1.0, abs=1e-9)
    assert "poly_disabled_no_data" in notes


def test_poly_absent_distributes_budget_proportionally() -> None:
    """With poly absent, ml/(ml+sb) ratio should equal the base ratio."""
    inputs = _full_quality_inputs(poly_present=False)
    weights, _ = compute_weights(inputs)

    expected_ml_share = BASE_WEIGHTS["ml"] / (BASE_WEIGHTS["ml"] + BASE_WEIGHTS["sb"])
    assert weights["ml"] / (weights["ml"] + weights["sb"]) == pytest.approx(
        expected_ml_share, abs=0.02
    )


# ---------------------------------------------------------------------------
# 3. poly_volume_24h < threshold: w_poly ≤ 0.01; correct note
# ---------------------------------------------------------------------------


def test_low_poly_volume_caps_weight() -> None:
    """Volume below threshold must cap poly weight at ≤ 0.01."""
    inputs = _full_quality_inputs(poly_volume_24h=5_000.0)
    weights, notes = compute_weights(inputs)

    assert weights["poly"] <= 0.01
    assert "poly_capped_low_liquidity" in notes


def test_zero_poly_volume_gives_zero_poly_weight() -> None:
    """Zero volume must collapse the poly weight to 0."""
    inputs = _full_quality_inputs(poly_volume_24h=0.0)
    weights, notes = compute_weights(inputs)

    assert weights["poly"] == pytest.approx(0.0, abs=1e-9)
    assert "poly_capped_low_liquidity" in notes


# ---------------------------------------------------------------------------
# 4. sb_books_used=1: w_sb < base * 0.21; "sb_few_books" note
# ---------------------------------------------------------------------------


def test_single_book_reduces_sb_weight() -> None:
    """One sportsbook must substantially reduce the sportsbook weight."""
    inputs_many = _full_quality_inputs(sb_books_used=5)
    inputs_one = _full_quality_inputs(sb_books_used=1)
    weights_many, _ = compute_weights(inputs_many)
    weights_one, notes_one = compute_weights(inputs_one)

    # With sb_factor=1/5=0.2, w_sb must drop to less than half of the 5-book value
    assert weights_one["sb"] < weights_many["sb"] * 0.50
    assert "sb_few_books" in notes_one


# ---------------------------------------------------------------------------
# 5. ml_max_prob=0.34 (uniform / zero-confidence): "ml_low_confidence" note
# ---------------------------------------------------------------------------


def test_uniform_ml_confidence_note() -> None:
    """ml_max_prob at 0.34 (uniform) must trigger the ml_low_confidence note."""
    inputs = _full_quality_inputs(ml_max_prob=0.34)
    _weights, notes = compute_weights(inputs)

    assert "ml_low_confidence" in notes


def test_low_ml_confidence_down_weights_ml() -> None:
    """Very low ML confidence must reduce w_ml compared to full-confidence baseline."""
    inputs_high = _full_quality_inputs(ml_max_prob=0.99)
    inputs_low = _full_quality_inputs(ml_max_prob=0.34)

    weights_high, _ = compute_weights(inputs_high)
    weights_low, _ = compute_weights(inputs_low)

    assert weights_low["ml"] < weights_high["ml"]


# ---------------------------------------------------------------------------
# 6. All weights sum to 1.0 within 1e-9 (parametrized varied inputs)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "ml_max_prob,sb_books,volume,spread,present",
    [
        (0.34, 1, 0.0, None, True),
        (0.60, 5, 500_000.0, 0.01, True),
        (0.99, 3, 50_000.0, 0.02, True),
        (0.50, 2, 9_000.0, 0.10, True),
        (0.80, 5, 1_000.0, 0.00, False),
        (0.45, 4, 200_000.0, 0.03, True),
        (0.34, 5, None, None, True),
        (0.70, 1, 100_000.0, 0.05, True),
        (0.55, 5, 500_000.0, 0.00, True),
        (0.90, 2, 15_000.0, 0.04, False),
    ],
)
def test_weights_always_sum_to_one(
    ml_max_prob: float,
    sb_books: int,
    volume: float | None,
    spread: float | None,
    present: bool,
) -> None:
    """Weights must sum to exactly 1.0 (within 1e-9) for any valid input combination."""
    inputs = WeightInputs(
        ml_max_prob=ml_max_prob,
        sb_books_used=sb_books,
        poly_volume_24h=volume,
        poly_bid_ask_spread=spread,
        poly_present=present,
    )
    weights, _ = compute_weights(inputs)
    assert sum(weights.values()) == pytest.approx(1.0, abs=1e-9)


# ---------------------------------------------------------------------------
# 7. Output final_probs sums to 1.0
# ---------------------------------------------------------------------------


def test_final_probs_sum_to_one() -> None:
    """WeightedSynthesis.final_probs must sum to 1.0."""
    inputs = _full_quality_inputs()
    result = synthesize(
        ml=_CONFIDENT,
        sb=_BALANCED,
        poly=_UNIFORM,
        inputs=inputs,
    )
    assert sum(result.final_probs.values()) == pytest.approx(1.0, abs=1e-9)


def test_final_probs_sum_to_one_without_poly() -> None:
    """final_probs must still sum to 1.0 when poly is None."""
    inputs = _full_quality_inputs(poly_present=False)
    result = synthesize(
        ml=_CONFIDENT,
        sb=_BALANCED,
        poly=None,
        inputs=inputs,
    )
    assert sum(result.final_probs.values()) == pytest.approx(1.0, abs=1e-9)


# ---------------------------------------------------------------------------
# 8. Invalid prob dict (sum != 1.0) raises ValueError
# ---------------------------------------------------------------------------


def test_invalid_ml_prob_dict_raises() -> None:
    """A ml prob dict that does not sum to 1.0 must raise ValueError."""
    bad: dict[str, float] = {"home_win": 0.5, "draw": 0.3, "away_win": 0.5}
    inputs = _full_quality_inputs()

    with pytest.raises(ValueError, match=r"sum to 1\.0"):
        synthesize(ml=bad, sb=_BALANCED, poly=_UNIFORM, inputs=inputs)


def test_invalid_sb_prob_dict_raises() -> None:
    """A sb prob dict with wrong keys must raise ValueError."""
    bad: dict[str, float] = {"home_win": 0.5, "tie": 0.3, "away_win": 0.2}
    inputs = _full_quality_inputs()

    with pytest.raises(ValueError, match="keys"):
        synthesize(ml=_CONFIDENT, sb=bad, poly=_UNIFORM, inputs=inputs)  # type: ignore[arg-type]


def test_invalid_poly_prob_dict_raises() -> None:
    """A poly prob dict that does not sum to 1.0 must raise ValueError."""
    bad: dict[str, float] = {"home_win": 0.1, "draw": 0.1, "away_win": 0.1}
    inputs = _full_quality_inputs()

    with pytest.raises(ValueError, match=r"sum to 1\.0"):
        synthesize(ml=_CONFIDENT, sb=_BALANCED, poly=bad, inputs=inputs)


# ---------------------------------------------------------------------------
# 9. Negative volume raises ValueError
# ---------------------------------------------------------------------------


def test_negative_volume_raises() -> None:
    """poly_volume_24h < 0 must raise ValueError."""
    with pytest.raises(ValueError, match="non-negative"):
        WeightInputs(
            ml_max_prob=0.60,
            sb_books_used=3,
            poly_volume_24h=-1.0,
            poly_bid_ask_spread=0.01,
            poly_present=True,
        )


def test_zero_books_used_raises() -> None:
    """sb_books_used=0 must raise ValueError at construction."""
    with pytest.raises(ValueError, match="sb_books_used"):
        WeightInputs(
            ml_max_prob=0.60,
            sb_books_used=0,
            poly_volume_24h=1.0,
            poly_bid_ask_spread=0.01,
            poly_present=True,
        )


# ---------------------------------------------------------------------------
# 10. Synthesize correctly mixes three sources (manual sanity check)
# ---------------------------------------------------------------------------


def test_synthesize_manual_sanity_check() -> None:
    """Manually verify the weighted blend for a known input."""
    # Use poly_present=False so weights are deterministic (no quality ramp)
    inputs = WeightInputs(
        ml_max_prob=0.99,  # no ml down-weight
        sb_books_used=5,  # sb_factor = 1.0
        poly_volume_24h=None,
        poly_bid_ask_spread=None,
        poly_present=False,
    )
    ml_p: dict[str, float] = {"home_win": 0.60, "draw": 0.25, "away_win": 0.15}
    sb_p: dict[str, float] = {"home_win": 0.50, "draw": 0.30, "away_win": 0.20}

    result = synthesize(ml=ml_p, sb=sb_p, poly=None, inputs=inputs)

    # Expected: w_ml ≈ 0.4706, w_sb ≈ 0.5294, w_poly = 0.0
    expected_ratio = BASE_WEIGHTS["ml"] / (BASE_WEIGHTS["ml"] + BASE_WEIGHTS["sb"])
    w_ml = result.weights["ml"]
    w_sb = result.weights["sb"]

    assert result.weights["poly"] == pytest.approx(0.0, abs=1e-9)
    assert w_ml / (w_ml + w_sb) == pytest.approx(expected_ratio, abs=0.02)

    # home_win should be a blend between 0.60 and 0.50
    assert 0.50 < result.final_probs["home_win"] < 0.60
    assert sum(result.final_probs.values()) == pytest.approx(1.0, abs=1e-9)


def test_synthesize_returns_weighted_synthesis_instance() -> None:
    """synthesize must return a WeightedSynthesis dataclass."""
    inputs = _full_quality_inputs()
    result = synthesize(ml=_CONFIDENT, sb=_BALANCED, poly=_UNIFORM, inputs=inputs)

    assert isinstance(result, WeightedSynthesis)
    assert isinstance(result.final_probs, dict)
    assert isinstance(result.weights, dict)
    assert isinstance(result.notes, list)


# ---------------------------------------------------------------------------
# 11. Polymarket hard cap is never exceeded
# ---------------------------------------------------------------------------


def test_poly_weight_never_exceeds_hard_cap() -> None:
    """w_poly must never exceed POLYMARKET_HARD_CAP regardless of inputs."""
    # Provide maximally favourable poly conditions
    inputs = WeightInputs(
        ml_max_prob=0.99,
        sb_books_used=5,
        poly_volume_24h=1_000_000_000.0,  # extremely high volume
        poly_bid_ask_spread=0.0,  # zero spread
        poly_present=True,
    )
    weights, _ = compute_weights(inputs)
    assert weights["poly"] <= POLYMARKET_HARD_CAP + 1e-9


# ---------------------------------------------------------------------------
# 12. High spread collapses poly quality
# ---------------------------------------------------------------------------


def test_high_spread_collapses_poly_weight() -> None:
    """A bid-ask spread above 5% must zero out the poly weight."""
    inputs = _full_quality_inputs(poly_bid_ask_spread=0.10)
    weights, notes = compute_weights(inputs)

    assert weights["poly"] == pytest.approx(0.0, abs=1e-9)
    assert "poly_capped_low_liquidity" in notes


# ---------------------------------------------------------------------------
# 13. Notes list: no false positives for full-quality inputs
# ---------------------------------------------------------------------------


def test_no_spurious_notes_for_high_quality_inputs() -> None:
    """Full-quality inputs must not generate any degradation notes."""
    inputs = _full_quality_inputs(
        ml_max_prob=0.99,
        sb_books_used=5,
        poly_volume_24h=1_000_000.0,
        poly_bid_ask_spread=0.001,
    )
    _, notes = compute_weights(inputs)

    assert "sb_few_books" not in notes
    assert "ml_low_confidence" not in notes
    assert "poly_disabled_no_data" not in notes
