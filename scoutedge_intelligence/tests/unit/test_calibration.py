"""Unit tests for scoutedge_intelligence.audit.calibration.

Covers:
  - PlattCalibrator and IsotonicCalibrator fit/transform behaviour
  - Brier improvement on synthetic miscalibrated data
  - Pre-fit RuntimeError
  - Output normalisation (prob dicts sum to 1.0)
  - reliability_curve_data shape and keys
  - calibration_summary keys and types
  - Insufficient-data ValueError (n < 20)
  - Determinism (same seed => same output)
"""

from __future__ import annotations

import numpy as np
import pytest

from scoutedge_intelligence.audit.calibration import (
    IsotonicCalibrator,
    PlattCalibrator,
    calibration_summary,
    reliability_curve_data,
)
from scoutedge_intelligence.audit.metrics import OUTCOMES, aggregate_brier

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_RNG_SEED = 42


def _make_synthetic_data(
    n: int = 300,
    seed: int = _RNG_SEED,
) -> tuple[list[dict], list[str]]:
    """Generate deliberately *miscalibrated* predictions.

    Raw probabilities are overconfident (pushed toward 0 / 1) so a calibrator
    can provably improve the Brier score.
    """
    rng = np.random.default_rng(seed)

    # True latent probabilities (well-calibrated)
    alpha = np.array([0.45, 0.27, 0.28])
    true_probs = rng.dirichlet(alpha * 10, size=n)  # shape (n, 3)

    # Sample actual outcomes
    actuals = [OUTCOMES[rng.choice(3, p=true_probs[i])] for i in range(n)]

    # Distort probabilities to simulate overconfidence
    raw_probs = true_probs**0.4  # compress toward uniform first
    raw_probs /= raw_probs.sum(axis=1, keepdims=True)

    predicted = [dict(zip(OUTCOMES, row.tolist(), strict=True)) for row in raw_probs]
    return predicted, actuals


def _make_tiny_data(n: int = 10) -> tuple[list[dict], list[str]]:
    """Return fewer than 20 samples (triggers ValueError)."""
    rng = np.random.default_rng(0)
    probs = rng.dirichlet([1.0, 1.0, 1.0], size=n)
    predicted = [dict(zip(OUTCOMES, row.tolist(), strict=True)) for row in probs]
    actual = [OUTCOMES[rng.integers(0, 3)] for _ in range(n)]
    return predicted, actual


# ---------------------------------------------------------------------------
# Test 1: PlattCalibrator - fit improves Brier score
# ---------------------------------------------------------------------------


def test_platt_improves_brier() -> None:
    """Platt-calibrated Brier must be <= raw Brier on the training set."""
    predicted, actuals = _make_synthetic_data()
    calibrator = PlattCalibrator().fit(predicted, actuals)
    calibrated = calibrator.transform(predicted)

    raw_brier = aggregate_brier(predicted, actuals)["mean"]
    cal_brier = aggregate_brier(calibrated, actuals)["mean"]
    assert cal_brier <= raw_brier + 1e-8, (
        f"Platt did not improve (or match) Brier: raw={raw_brier:.4f} cal={cal_brier:.4f}"
    )


# ---------------------------------------------------------------------------
# Test 2: IsotonicCalibrator - fit improves Brier score
# ---------------------------------------------------------------------------


def test_isotonic_improves_brier() -> None:
    """Isotonic-calibrated Brier must be <= raw Brier on the training set."""
    predicted, actuals = _make_synthetic_data()
    calibrator = IsotonicCalibrator().fit(predicted, actuals)
    calibrated = calibrator.transform(predicted)

    raw_brier = aggregate_brier(predicted, actuals)["mean"]
    cal_brier = aggregate_brier(calibrated, actuals)["mean"]
    assert cal_brier <= raw_brier + 1e-8, (
        f"Isotonic did not improve (or match) Brier: raw={raw_brier:.4f} cal={cal_brier:.4f}"
    )


# ---------------------------------------------------------------------------
# Test 3: transform before fit raises RuntimeError
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("calibrator_class", [PlattCalibrator, IsotonicCalibrator])
def test_transform_before_fit_raises(calibrator_class: type) -> None:
    """Calling transform before fit must raise RuntimeError."""
    predicted, _ = _make_synthetic_data(n=20)
    calibrator = calibrator_class()
    assert not calibrator.is_fitted()
    with pytest.raises(RuntimeError, match="calibrator not fitted"):
        calibrator.transform(predicted)


# ---------------------------------------------------------------------------
# Test 4: Each output dict sums to 1.0
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("calibrator_class", [PlattCalibrator, IsotonicCalibrator])
def test_output_sums_to_one(calibrator_class: type) -> None:
    """Every calibrated prob dict must sum to 1.0 within floating-point tolerance."""
    predicted, actuals = _make_synthetic_data()
    calibrated = calibrator_class().fit(predicted, actuals).transform(predicted)

    for i, prob_dict in enumerate(calibrated):
        total = sum(prob_dict.values())
        assert abs(total - 1.0) < 1e-6, f"Calibrated dict [{i}] sums to {total} (expected 1.0)"


# ---------------------------------------------------------------------------
# Test 5: reliability_curve_data - 4-key dict, all arrays length n_bins
# ---------------------------------------------------------------------------


def test_reliability_curve_data_shape() -> None:
    """reliability_curve_data must return 4 arrays each of length n_bins."""
    predicted, actuals = _make_synthetic_data()
    n_bins = 8
    result = reliability_curve_data(predicted, actuals, outcome="home_win", n_bins=n_bins)

    required_keys = {"bin_centers", "bin_predicted", "bin_empirical", "bin_count"}
    assert set(result.keys()) == required_keys

    for key in required_keys:
        assert len(result[key]) == n_bins, (
            f"Key '{key}' has length {len(result[key])}, expected {n_bins}"
        )


def test_reliability_curve_data_default_bins() -> None:
    """Default n_bins=10 produces arrays of length 10."""
    predicted, actuals = _make_synthetic_data()
    result = reliability_curve_data(predicted, actuals)
    for key in ("bin_centers", "bin_predicted", "bin_empirical", "bin_count"):
        assert len(result[key]) == 10


# ---------------------------------------------------------------------------
# Test 6: calibration_summary - keys and types
# ---------------------------------------------------------------------------


def test_calibration_summary_keys_and_types() -> None:
    """calibration_summary must return the expected 6 float keys."""
    predicted, actuals = _make_synthetic_data()
    calibrated = PlattCalibrator().fit(predicted, actuals).transform(predicted)
    summary = calibration_summary(predicted, calibrated, actuals)

    expected_keys = {
        "raw_brier",
        "calibrated_brier",
        "raw_ece",
        "calibrated_ece",
        "improvement_brier",
        "improvement_ece",
    }
    assert set(summary.keys()) == expected_keys

    for key, val in summary.items():
        assert isinstance(val, float), f"Key '{key}' is {type(val)}, expected float"


def test_calibration_summary_improvement_consistency() -> None:
    """improvement_{metric} must equal raw_{metric} - calibrated_{metric}."""
    predicted, actuals = _make_synthetic_data()
    calibrated = IsotonicCalibrator().fit(predicted, actuals).transform(predicted)
    s = calibration_summary(predicted, calibrated, actuals)

    assert abs(s["improvement_brier"] - (s["raw_brier"] - s["calibrated_brier"])) < 1e-10
    assert abs(s["improvement_ece"] - (s["raw_ece"] - s["calibrated_ece"])) < 1e-10


# ---------------------------------------------------------------------------
# Test 7: Insufficient data (n=10) raises ValueError
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("calibrator_class", [PlattCalibrator, IsotonicCalibrator])
def test_insufficient_data_raises(calibrator_class: type) -> None:
    """fit with fewer than 20 samples must raise ValueError."""
    predicted, actuals = _make_tiny_data(n=10)
    calibrator = calibrator_class()
    with pytest.raises(ValueError, match="insufficient data for calibration"):
        calibrator.fit(predicted, actuals)


def test_reliability_curve_data_insufficient_data_raises() -> None:
    """reliability_curve_data with fewer than 20 samples must raise ValueError."""
    predicted, actuals = _make_tiny_data(n=10)
    with pytest.raises(ValueError, match="insufficient data for calibration"):
        reliability_curve_data(predicted, actuals)


# ---------------------------------------------------------------------------
# Test 8: Determinism - same seed produces identical transform
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("calibrator_class", [PlattCalibrator, IsotonicCalibrator])
def test_deterministic_transform(calibrator_class: type) -> None:
    """Two calibrators trained on identical data must produce identical output."""
    predicted, actuals = _make_synthetic_data(seed=_RNG_SEED)

    cal_a = calibrator_class().fit(predicted, actuals)
    cal_b = calibrator_class().fit(predicted, actuals)

    out_a = cal_a.transform(predicted)
    out_b = cal_b.transform(predicted)

    for i, (da, db) in enumerate(zip(out_a, out_b, strict=True)):
        for outcome in OUTCOMES:
            assert abs(da[outcome] - db[outcome]) < 1e-10, (
                f"Non-deterministic result at index {i}, outcome {outcome}: "
                f"{da[outcome]} vs {db[outcome]}"
            )


# ---------------------------------------------------------------------------
# Test 9: is_fitted reflects state
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("calibrator_class", [PlattCalibrator, IsotonicCalibrator])
def test_is_fitted_state(calibrator_class: type) -> None:
    """is_fitted must return False before fit and True after."""
    predicted, actuals = _make_synthetic_data()
    calibrator = calibrator_class()
    assert calibrator.is_fitted() is False
    calibrator.fit(predicted, actuals)
    assert calibrator.is_fitted() is True


# ---------------------------------------------------------------------------
# Test 10: reliability_curve_data - bad outcome raises ValueError
# ---------------------------------------------------------------------------


def test_reliability_curve_data_bad_outcome() -> None:
    """Passing an unrecognised outcome string must raise ValueError."""
    predicted, actuals = _make_synthetic_data()
    with pytest.raises(ValueError, match="outcome must be one of"):
        reliability_curve_data(predicted, actuals, outcome="tie")
