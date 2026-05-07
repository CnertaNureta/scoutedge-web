"""Unit tests for scoutedge_intelligence.features.divergence (task P3.1)."""

from __future__ import annotations

import math

import pytest

from scoutedge_intelligence.features.divergence import (
    DIVERGENCE_GAP_THRESHOLD,
    compute_divergence_features,
    consensus_flag,
    js_divergence,
    kl_divergence,
    max_pairwise_gap,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

UNIFORM: dict[str, float] = {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}
HOME_HEAVY: dict[str, float] = {"home_win": 0.70, "draw": 0.20, "away_win": 0.10}
AWAY_HEAVY: dict[str, float] = {"home_win": 0.10, "draw": 0.20, "away_win": 0.70}
NEAR_UNIFORM: dict[str, float] = {"home_win": 0.34, "draw": 0.33, "away_win": 0.33}
VERY_DIFFERENT: dict[str, float] = {"home_win": 0.85, "draw": 0.10, "away_win": 0.05}


def _close(a: float, b: float, tol: float = 1e-10) -> bool:
    return abs(a - b) < tol


# ---------------------------------------------------------------------------
# 1. kl_divergence: identical distributions → 0
# ---------------------------------------------------------------------------


def test_kl_identical_distributions_is_zero() -> None:
    """KL(p ‖ p) must be 0 for any valid distribution."""
    result = kl_divergence(UNIFORM, UNIFORM)
    assert _close(result, 0.0, tol=1e-9)


def test_kl_identical_home_heavy_is_zero() -> None:
    result = kl_divergence(HOME_HEAVY, HOME_HEAVY)
    assert _close(result, 0.0, tol=1e-9)


def test_kl_is_positive_for_distinct_distributions() -> None:
    """KL divergence must be non-negative and strictly positive when p ≠ q."""
    result = kl_divergence(HOME_HEAVY, AWAY_HEAVY)
    assert result > 0.0


def test_kl_is_directional() -> None:
    """KL(p ‖ q) ≠ KL(q ‖ p) in general."""
    forward = kl_divergence(HOME_HEAVY, UNIFORM)
    backward = kl_divergence(UNIFORM, HOME_HEAVY)
    # They should differ (asymmetry)
    assert not _close(forward, backward, tol=1e-6)


# ---------------------------------------------------------------------------
# 2. js_divergence: symmetric (within 1e-12)
# ---------------------------------------------------------------------------


def test_js_is_symmetric() -> None:
    """JSD(p, q) == JSD(q, p) within floating-point tolerance."""
    a = js_divergence(HOME_HEAVY, AWAY_HEAVY)
    b = js_divergence(AWAY_HEAVY, HOME_HEAVY)
    assert _close(a, b, tol=1e-12)


def test_js_identical_distributions_is_zero() -> None:
    result = js_divergence(UNIFORM, UNIFORM)
    assert _close(result, 0.0, tol=1e-9)


def test_js_bounded_above_by_ln2() -> None:
    """JSD using natural log is bounded above by ln(2) ≈ 0.693."""
    result = js_divergence(HOME_HEAVY, AWAY_HEAVY)
    assert result <= math.log(2) + 1e-9


# ---------------------------------------------------------------------------
# 3. max_pairwise_gap: trivial example
# ---------------------------------------------------------------------------


def test_max_pairwise_gap_trivial() -> None:
    """With one distribution being uniform 1/3 each and one being HOME_HEAVY,
    the max gap is |0.70 - 1/3| = 0.3667 for home_win."""
    expected = abs(HOME_HEAVY["home_win"] - UNIFORM["home_win"])
    result = max_pairwise_gap(HOME_HEAVY, UNIFORM)
    assert _close(result, expected, tol=1e-10)


def test_max_pairwise_gap_identical_is_zero() -> None:
    result = max_pairwise_gap(UNIFORM, UNIFORM)
    assert _close(result, 0.0, tol=1e-12)


# ---------------------------------------------------------------------------
# 4. consensus_flag
# ---------------------------------------------------------------------------


def test_consensus_flag_near_identical_probs_true() -> None:
    """Three near-identical distributions should yield True."""
    p1: dict[str, float] = {"home_win": 0.34, "draw": 0.33, "away_win": 0.33}
    p2: dict[str, float] = {"home_win": 0.35, "draw": 0.32, "away_win": 0.33}
    p3: dict[str, float] = {"home_win": 0.33, "draw": 0.34, "away_win": 0.33}
    assert consensus_flag([p1, p2, p3]) is True


def test_consensus_flag_far_outlier_false() -> None:
    """One distribution very far from the others makes the flag False."""
    assert consensus_flag([UNIFORM, NEAR_UNIFORM, VERY_DIFFERENT]) is False


def test_consensus_flag_two_close_probs_true() -> None:
    p1: dict[str, float] = {"home_win": 0.40, "draw": 0.30, "away_win": 0.30}
    p2: dict[str, float] = {"home_win": 0.42, "draw": 0.29, "away_win": 0.29}
    assert consensus_flag([p1, p2]) is True


# ---------------------------------------------------------------------------
# 5. compute_divergence_features happy path (poly present)
# ---------------------------------------------------------------------------

_REQUIRED_KEYS = {
    "kl_ml_sb",
    "kl_sb_ml",
    "kl_ml_poly",
    "kl_poly_ml",
    "kl_sb_poly",
    "kl_poly_sb",
    "js_ml_sb",
    "js_ml_poly",
    "js_sb_poly",
    "max_pairwise_kl",
    "max_pairwise_js",
    "max_pairwise_gap",
    "consensus_flag",
    "three_way_agreement_score",
    "polymarket_reliable",
    "triggered_signals",
    "three_way_entropy",
}


def test_compute_divergence_features_all_keys_present() -> None:
    """All required keys must be present in the output."""
    result = compute_divergence_features(
        ml=HOME_HEAVY,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=50_000.0,
        poly_bid_ask_spread=0.02,
    )
    assert _REQUIRED_KEYS.issubset(result.keys())


def test_compute_divergence_features_no_nan_when_poly_present() -> None:
    """When poly is provided, no value should be NaN."""
    result = compute_divergence_features(
        ml=HOME_HEAVY,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=50_000.0,
        poly_bid_ask_spread=0.02,
    )
    for key in _REQUIRED_KEYS - {"triggered_signals", "consensus_flag", "polymarket_reliable"}:
        val = result[key]
        assert not math.isnan(float(val)), f"Unexpected NaN for key '{key}'"  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 6. poly is None → poly metrics are NaN; polymarket_reliable False
# ---------------------------------------------------------------------------


def test_compute_divergence_features_poly_none_returns_nan_metrics() -> None:
    result = compute_divergence_features(ml=HOME_HEAVY, sb=UNIFORM, poly=None)
    poly_keys = ["kl_ml_poly", "kl_poly_ml", "kl_sb_poly", "kl_poly_sb", "js_ml_poly", "js_sb_poly"]
    for key in poly_keys:
        assert math.isnan(float(result[key])), f"Expected NaN for '{key}'"  # type: ignore[arg-type]


def test_compute_divergence_features_poly_none_reliable_is_false() -> None:
    result = compute_divergence_features(ml=HOME_HEAVY, sb=UNIFORM, poly=None)
    assert result["polymarket_reliable"] is False


# ---------------------------------------------------------------------------
# 7. poly_volume_24h < 10_000 triggers PM_LIQUIDITY_LOW
# ---------------------------------------------------------------------------


def test_pm_liquidity_low_signal_triggered() -> None:
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=5_000.0,
        poly_bid_ask_spread=0.02,
    )
    assert "PM_LIQUIDITY_LOW" in result["triggered_signals"]


def test_pm_liquidity_low_not_triggered_above_threshold() -> None:
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=15_000.0,
        poly_bid_ask_spread=0.02,
    )
    assert "PM_LIQUIDITY_LOW" not in result["triggered_signals"]


# ---------------------------------------------------------------------------
# 8. ML/SB home gap > 0.10 triggers ML_SB_HOME_GAP
# ---------------------------------------------------------------------------


def test_ml_sb_home_gap_signal_triggered() -> None:
    """home_win gap > DIVERGENCE_GAP_THRESHOLD must trigger ML_SB_HOME_GAP."""
    gap = DIVERGENCE_GAP_THRESHOLD  # 0.10
    ml: dict[str, float] = {
        "home_win": 0.40 + gap + 0.01,
        "draw": 0.25,
        "away_win": round(1.0 - (0.40 + gap + 0.01) - 0.25, 10),
    }
    sb: dict[str, float] = {"home_win": 0.40, "draw": 0.35, "away_win": 0.25}
    result = compute_divergence_features(ml=ml, sb=sb, poly=None)
    assert "ML_SB_HOME_GAP" in result["triggered_signals"]


def test_ml_sb_home_gap_signal_not_triggered_below_threshold() -> None:
    ml: dict[str, float] = {"home_win": 0.45, "draw": 0.30, "away_win": 0.25}
    sb: dict[str, float] = {"home_win": 0.43, "draw": 0.31, "away_win": 0.26}
    result = compute_divergence_features(ml=ml, sb=sb, poly=None)
    assert "ML_SB_HOME_GAP" not in result["triggered_signals"]


# ---------------------------------------------------------------------------
# 9. three_way_agreement_score is in [0, 1]
# ---------------------------------------------------------------------------


def test_three_way_agreement_score_bounds() -> None:
    """Score must lie in [0, 1] for any valid input."""
    for ml, sb, poly in [
        (UNIFORM, UNIFORM, NEAR_UNIFORM),
        (HOME_HEAVY, AWAY_HEAVY, NEAR_UNIFORM),
        (VERY_DIFFERENT, UNIFORM, HOME_HEAVY),
    ]:
        result = compute_divergence_features(
            ml=ml,
            sb=sb,
            poly=poly,
            poly_volume_24h=20_000.0,
            poly_bid_ask_spread=0.01,
        )
        score = float(result["three_way_agreement_score"])  # type: ignore[arg-type]
        assert 0.0 <= score <= 1.0, f"Score out of range: {score}"


def test_three_way_agreement_score_is_one_for_identical() -> None:
    """Identical distributions → JS=0 → agreement score=1."""
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=UNIFORM,
        poly_volume_24h=50_000.0,
        poly_bid_ask_spread=0.01,
    )
    assert _close(float(result["three_way_agreement_score"]), 1.0, tol=1e-9)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 10. Input probs not summing to 1 → ValueError
# ---------------------------------------------------------------------------


def test_kl_invalid_p_raises_value_error() -> None:
    bad: dict[str, float] = {"home_win": 0.5, "draw": 0.5, "away_win": 0.5}  # sums to 1.5
    with pytest.raises(ValueError, match="sum"):
        kl_divergence(bad, UNIFORM)


def test_js_invalid_q_raises_value_error() -> None:
    bad: dict[str, float] = {"home_win": 0.2, "draw": 0.2, "away_win": 0.2}  # sums to 0.6
    with pytest.raises(ValueError, match="sum"):
        js_divergence(UNIFORM, bad)


def test_compute_divergence_features_invalid_ml_raises() -> None:
    bad: dict[str, float] = {"home_win": 0.6, "draw": 0.6, "away_win": 0.6}
    with pytest.raises(ValueError):
        compute_divergence_features(ml=bad, sb=UNIFORM, poly=None)


def test_compute_divergence_features_invalid_poly_raises() -> None:
    bad: dict[str, float] = {"home_win": 0.1, "draw": 0.1, "away_win": 0.1}
    with pytest.raises(ValueError):
        compute_divergence_features(ml=UNIFORM, sb=UNIFORM, poly=bad)


# ---------------------------------------------------------------------------
# 11. polymarket_reliable logic
# ---------------------------------------------------------------------------


def test_polymarket_reliable_true_when_conditions_met() -> None:
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=10_000.0,  # exactly at boundary
        poly_bid_ask_spread=0.03,  # exactly at boundary
    )
    assert result["polymarket_reliable"] is True


def test_polymarket_reliable_false_when_spread_too_high() -> None:
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=50_000.0,
        poly_bid_ask_spread=0.05,
    )
    assert result["polymarket_reliable"] is False


def test_polymarket_reliable_false_when_volume_none() -> None:
    result = compute_divergence_features(
        ml=UNIFORM,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=None,
        poly_bid_ask_spread=0.02,
    )
    assert result["polymarket_reliable"] is False


# ---------------------------------------------------------------------------
# 12. three_way_entropy mirrors max_pairwise_js
# ---------------------------------------------------------------------------


def test_three_way_entropy_equals_max_pairwise_js() -> None:
    result = compute_divergence_features(
        ml=HOME_HEAVY,
        sb=UNIFORM,
        poly=NEAR_UNIFORM,
        poly_volume_24h=20_000.0,
        poly_bid_ask_spread=0.01,
    )
    assert result["three_way_entropy"] == result["max_pairwise_js"]
