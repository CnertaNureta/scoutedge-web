"""Unit tests for scoutedge_intelligence.audit.metrics.

Covers Brier score, log-loss, ECE, reliability curve, and aggregate Brier.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from scoutedge_intelligence.audit.metrics import (
    OUTCOMES,
    ProbDict,
    aggregate_brier,
    brier_score_multiclass,
    expected_calibration_error,
    log_loss,
    reliability_curve,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UNIFORM: ProbDict = {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}


def _perfect(outcome: str) -> ProbDict:
    """Return a probability dict with all mass on *outcome*."""
    return {o: 1.0 if o == outcome else 0.0 for o in OUTCOMES}


def _make_calibrated_dataset(n: int = 300, seed: int = 42) -> tuple[list[ProbDict], list[str]]:
    """Generate a perfectly-calibrated synthetic dataset.

    For each sample we draw a Dirichlet(1,1,1), then sample the actual outcome
    from that distribution — so the predictions are perfectly calibrated by
    construction.
    """
    rng = np.random.default_rng(seed)
    alpha = np.ones(3)
    probs_matrix = rng.dirichlet(alpha, size=n)  # (n, 3)
    actual_indices = np.array([rng.choice(3, p=row) for row in probs_matrix], dtype=int)
    predicted = [{OUTCOMES[j]: float(probs_matrix[i, j]) for j in range(3)} for i in range(n)]
    actual = [OUTCOMES[idx] for idx in actual_indices]
    return predicted, actual


# ---------------------------------------------------------------------------
# brier_score_multiclass
# ---------------------------------------------------------------------------


class TestBrierScore:
    def test_perfect_prediction_home_win(self) -> None:
        """Perfect prediction (1.0 on actual) should yield 0."""
        assert brier_score_multiclass(_perfect("home_win"), "home_win") == pytest.approx(0.0)

    def test_perfect_prediction_draw(self) -> None:
        assert brier_score_multiclass(_perfect("draw"), "draw") == pytest.approx(0.0)

    def test_perfect_prediction_away_win(self) -> None:
        assert brier_score_multiclass(_perfect("away_win"), "away_win") == pytest.approx(0.0)

    def test_uniform_prediction_home_win(self) -> None:
        """Uniform 1/3 each, actual=home_win → (1/3-1)^2 + (1/3-0)^2 + (1/3-0)^2 = 2/3."""
        result = brier_score_multiclass(UNIFORM, "home_win")
        assert result == pytest.approx(2 / 3, rel=1e-6)

    def test_worst_prediction_score_is_two(self) -> None:
        """Predicting 0 on the actual outcome and 1 on one other → Brier = 2."""
        pred: ProbDict = {"home_win": 0.0, "draw": 1.0, "away_win": 0.0}
        assert brier_score_multiclass(pred, "home_win") == pytest.approx(2.0)

    def test_invalid_actual_raises(self) -> None:
        with pytest.raises(ValueError, match="actual must be one of"):
            brier_score_multiclass(UNIFORM, "invalid_outcome")

    def test_probs_not_summing_to_one_raises(self) -> None:
        bad: ProbDict = {"home_win": 0.4, "draw": 0.4, "away_win": 0.4}
        with pytest.raises(ValueError, match=r"sum to 1\.0"):
            brier_score_multiclass(bad, "home_win")

    def test_wrong_keys_raises(self) -> None:
        bad = {"home": 0.5, "draw": 0.3, "away_win": 0.2}  # type: ignore[arg-type]
        with pytest.raises(ValueError):
            brier_score_multiclass(bad, "home_win")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# log_loss
# ---------------------------------------------------------------------------


class TestLogLoss:
    def test_perfect_prediction_is_zero(self) -> None:
        """Predicting 1.0 on the actual outcome → loss ≈ 0 (clipped to 1-eps)."""
        result = log_loss(_perfect("home_win"), "home_win")
        assert result == pytest.approx(0.0, abs=1e-12)

    def test_zero_probability_clipped(self) -> None:
        """Predicting 0 on the actual → clipped to eps → loss = -log(eps)."""
        pred: ProbDict = {"home_win": 0.0, "draw": 1.0, "away_win": 0.0}
        eps = 1e-15
        expected = -math.log(eps)
        result = log_loss(pred, "home_win", eps=eps)
        assert result == pytest.approx(expected, rel=1e-6)

    def test_uniform_prediction(self) -> None:
        result = log_loss(UNIFORM, "draw")
        assert result == pytest.approx(-math.log(1 / 3), rel=1e-6)

    def test_invalid_sum_raises(self) -> None:
        bad: ProbDict = {"home_win": 0.5, "draw": 0.3, "away_win": 0.3}
        with pytest.raises(ValueError, match=r"sum to 1\.0"):
            log_loss(bad, "home_win")

    def test_invalid_actual_raises(self) -> None:
        with pytest.raises(ValueError, match="actual must be one of"):
            log_loss(UNIFORM, "none")


# ---------------------------------------------------------------------------
# expected_calibration_error
# ---------------------------------------------------------------------------


class TestExpectedCalibrationError:
    def test_perfectly_calibrated_dataset(self) -> None:
        """A perfectly-calibrated synthetic dataset should yield a small ECE.

        The bound is set at 0.08 to remain robust across seeds while still
        being meaningfully lower than the ~0.5 ECE you'd see for a badly
        miscalibrated model.
        """
        predicted, actual = _make_calibrated_dataset(n=500, seed=0)
        ece = expected_calibration_error(predicted, actual)
        assert ece < 0.08

    def test_empty_input_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            expected_calibration_error([], [])

    def test_length_mismatch_raises(self) -> None:
        with pytest.raises(ValueError, match="equal length"):
            expected_calibration_error([UNIFORM], ["home_win", "draw"])

    def test_range_is_zero_to_one(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=100, seed=7)
        ece = expected_calibration_error(predicted, actual)
        assert 0.0 <= ece <= 1.0

    def test_all_wrong_predictions_high_ece(self) -> None:
        """Predict 0.95 home_win on every match, all results are away_win → high ECE."""
        pred: ProbDict = {"home_win": 0.95, "draw": 0.03, "away_win": 0.02}
        n = 50
        predicted = [pred] * n
        actual = ["away_win"] * n
        ece = expected_calibration_error(predicted, actual)
        # The top outcome is always home_win, empirical correct = 0 → gap ≈ 0.95
        assert ece > 0.5


# ---------------------------------------------------------------------------
# reliability_curve
# ---------------------------------------------------------------------------


class TestReliabilityCurve:
    def test_output_lengths_match_n_bins(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=100, seed=1)
        n_bins = 10
        m_pred, m_emp, counts = reliability_curve(predicted, actual, n_bins=n_bins)
        assert len(m_pred) == n_bins
        assert len(m_emp) == n_bins
        assert len(counts) == n_bins

    def test_nan_in_empty_bins(self) -> None:
        """With a tiny dataset and many bins some bins will be empty → NaN."""
        # Two samples both with very high predicted probability → low-prob bins empty
        pred: ProbDict = {"home_win": 0.9, "draw": 0.06, "away_win": 0.04}
        predicted = [pred, pred]
        actual = ["home_win", "away_win"]
        m_pred, m_emp, _counts = reliability_curve(predicted, actual, n_bins=10)
        # At least some bins should be NaN (empty)
        assert np.any(np.isnan(m_pred))
        assert np.any(np.isnan(m_emp))

    def test_non_nan_bins_have_valid_values(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=200, seed=3)
        m_pred, m_emp, counts = reliability_curve(predicted, actual)
        non_empty = counts > 0
        assert np.all((m_pred[non_empty] >= 0) & (m_pred[non_empty] <= 1))
        assert np.all((m_emp[non_empty] >= 0) & (m_emp[non_empty] <= 1))

    def test_bin_counts_sum_to_n(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=80, seed=5)
        _, _, counts = reliability_curve(predicted, actual)
        assert int(counts.sum()) == 80


# ---------------------------------------------------------------------------
# aggregate_brier
# ---------------------------------------------------------------------------


class TestAggregateBrier:
    def test_returns_five_keys(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=20, seed=9)
        result = aggregate_brier(predicted, actual)
        assert set(result.keys()) == {"mean", "median", "p25", "p75", "n"}

    def test_n_correct(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=42, seed=2)
        result = aggregate_brier(predicted, actual)
        assert result["n"] == pytest.approx(42.0)

    def test_mean_computed_correctly(self) -> None:
        """Mean from aggregate_brier should match manual per-sample computation."""
        rng = np.random.default_rng(99)
        n = 100
        alphas = rng.dirichlet(np.ones(3), size=n)
        predicted = [{OUTCOMES[j]: float(alphas[i, j]) for j in range(3)} for i in range(n)]
        actual_idx = np.array([rng.choice(3, p=row) for row in alphas])
        actual = [OUTCOMES[i] for i in actual_idx]

        result = aggregate_brier(predicted, actual)
        manual_mean = float(
            np.mean([brier_score_multiclass(p, a) for p, a in zip(predicted, actual, strict=True)])
        )
        assert result["mean"] == pytest.approx(manual_mean, rel=1e-9)

    def test_quantile_ordering(self) -> None:
        predicted, actual = _make_calibrated_dataset(n=100, seed=11)
        result = aggregate_brier(predicted, actual)
        assert result["p25"] <= result["median"] <= result["p75"]

    def test_perfect_predictions_all_zeros(self) -> None:
        predicted = [_perfect(o) for o in OUTCOMES * 10]
        actual = list(OUTCOMES * 10)
        result = aggregate_brier(predicted, actual)
        assert result["mean"] == pytest.approx(0.0)
        assert result["p75"] == pytest.approx(0.0)

    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            aggregate_brier([], [])


# ---------------------------------------------------------------------------
# Cross-cutting: actual not in OUTCOMES
# ---------------------------------------------------------------------------


class TestInvalidActual:
    @pytest.mark.parametrize(
        "fn",
        [
            lambda p, a: brier_score_multiclass(p, a),
            lambda p, a: log_loss(p, a),
        ],
    )
    def test_actual_not_in_outcomes_raises(self, fn) -> None:  # type: ignore[type-arg]
        with pytest.raises(ValueError, match="actual must be one of"):
            fn(UNIFORM, "half_time")

    def test_ece_invalid_actual_raises(self) -> None:
        with pytest.raises(ValueError, match="actual must be one of"):
            expected_calibration_error([UNIFORM], ["bad_outcome"])

    def test_reliability_invalid_actual_raises(self) -> None:
        with pytest.raises(ValueError, match="actual must be one of"):
            reliability_curve([UNIFORM], ["bad_outcome"])
